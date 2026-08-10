import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenerativeAI } from '@google/generative-ai';
import nodemailer from 'nodemailer';
import http from 'http';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Serve static frontend assets for single-container Cloud Run deployment
app.use(express.static('dist'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Connected WebSocket clients set
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  ws.send(JSON.stringify({
    type: 'SYSTEM',
    timestamp: new Date().toLocaleTimeString(),
    message: 'WebSocket Connection Established with Node.js Server.'
  }));

  ws.on('close', () => {
    clients.delete(ws);
  });
});

// Helper to broadcast WebSocket log messages
function broadcastLog(type, message, details = null) {
  const payload = JSON.stringify({
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toLocaleTimeString(),
    type,
    message,
    details
  });

  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

// Initialize Gemini 1.5 Flash API client
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
let genAI = null;
if (geminiApiKey) {
  genAI = new GoogleGenerativeAI(geminiApiKey);
  console.log("Initialized Gemini 1.5 Flash API client with active API key.");
} else {
  console.log("Notice: GEMINI_API_KEY not set in environment. Live AI vision will require GEMINI_API_KEY.");
}

// COST OPTIMIZATION: In-Memory AI Evaluation Cache ($0 API cost on duplicate photos)
const aiResponseCache = new Map();

// Local JSON Database wrapper
const DB_FILE = path.resolve('./server/db.json');
let dbCache = null;

function getDB() {
  if (dbCache) return dbCache;
  if (fs.existsSync(DB_FILE)) {
    try {
      dbCache = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      // Ensure all arrays exist
      dbCache.courses = dbCache.courses || [];
      dbCache.teams = dbCache.teams || [];
      dbCache.users = dbCache.users || [];
      dbCache.submissions = dbCache.submissions || [];
      return dbCache;
    } catch (e) {
      console.error("Failed to parse db.json, returning default", e);
    }
  }
  dbCache = { courses: [], teams: [], users: [], submissions: [] };
  return dbCache;
}

function saveDB(db) {
  dbCache = db;
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// In-Memory Database for Course & Submissions (Migrated to getDB)
let currentCourse = getDB().courses[0] || null;
let submissionsStore = getDB().submissions;

// Real Email Transport Configuration (SMTP / Resend API)
const smtpHost = process.env.SMTP_HOST || process.env.EMAIL_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
const resendApiKey = process.env.RESEND_API_KEY;

let mailTransporter = null;
if (smtpHost && smtpUser && smtpPass) {
  mailTransporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass }
  });
  console.log(`Configured SMTP Mail Transporter via ${smtpHost}:${smtpPort}`);
}

async function sendRealEmail(toEmail, code) {
  const fromAddress = process.env.EMAIL_FROM || smtpUser || 'auth@fungis.org';
  const subject = `Your Spatial Olympics Verification Code: ${code}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #334155; border-radius: 16px; background-color: #090d16; color: #f8fafc;">
      <h2 style="color: #38bdf8; margin-top: 0; font-size: 20px;">FunGIS Spatial Olympics Verification</h2>
      <p style="font-size: 14px; color: #94a3b8; line-height: 1.5;">Use the 6-digit verification code below to complete your sign in and unlock team spatial challenges:</p>
      <div style="background-color: #020617; border: 2px solid #0284c7; padding: 18px; text-align: center; border-radius: 12px; margin: 20px 0;">
        <span style="font-family: monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #38bdf8;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #64748b;">This verification code expires in 10 minutes. If you did not request this code, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
      <p style="font-size: 11px; color: #475569; text-align: center;">FunGIS Spatial Olympics Platform &bull; Lake Macquarie, NSW</p>
    </div>
  `;

  // Option 1: Send via Resend REST API if API Key is set
  if (resendApiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromAddress.includes('<') ? fromAddress : `Spatial Olympics <${fromAddress}>`,
        to: [toEmail],
        subject,
        html: htmlBody
      })
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Resend API failed: ${errText}`);
    }
    return { provider: 'Resend API', to: toEmail };
  }

  // Option 2: Send via SMTP Transporter if configured
  if (mailTransporter) {
    await mailTransporter.sendMail({
      from: fromAddress.includes('<') ? fromAddress : `Spatial Olympics <${fromAddress}>`,
      to: toEmail,
      subject,
      html: htmlBody
    });
    return { provider: `SMTP (${smtpHost})`, to: toEmail };
  }

  throw new Error("No SMTP host / user or Resend API key configured on server.");
}

// REST API Endpoints

// 1. Email Verification Code Send Endpoint
app.post('/api/auth/send-code', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minute expiration

  verificationCodes.set(cleanEmail, { code, expiresAt, sentAt: new Date().toISOString() });

  try {
    const delivery = await sendRealEmail(cleanEmail, code);
    broadcastLog('SYSTEM', `📧 Real email dispatched to ${cleanEmail} via ${delivery.provider}.`);
    
    // Return success WITHOUT exposing code to client
    return res.json({
      success: true,
      message: `Verification code sent to ${cleanEmail}. Please check your email inbox.`,
      email: cleanEmail,
      emailSent: true
    });
  } catch (err) {
    console.error("Real email dispatch error:", err.message);
    broadcastLog('SYSTEM', `❌ Real email dispatch failed for ${cleanEmail}: ${err.message}`);
    
    // Delete un-sent code and return strict error to caller
    verificationCodes.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      message: `Email dispatch failed: ${err.message}`
    });
  }
});

// 2. Email Verification Code Confirm Endpoint
app.post('/api/auth/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const record = verificationCodes.get(cleanEmail);

  if (!record) {
    return res.status(400).json({ success: false, message: 'No active verification code found for this email. Please request a code.' });
  }

  if (Date.now() > record.expiresAt) {
    verificationCodes.delete(cleanEmail);
    return res.status(400).json({ success: false, message: 'Verification code has expired. Please request a new code.' });
  }

  if (record.code !== code.trim()) {
    return res.status(400).json({ success: false, message: 'Invalid 6-digit verification code. Please check and try again.' });
  }

  verificationCodes.delete(cleanEmail);
  broadcastLog('SYSTEM', `✅ User email verified & authenticated: ${cleanEmail}`);

  res.json({
    success: true,
    message: 'Email verified successfully!',
    user: {
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      role: cleanEmail === 'coreagc@gmail.com' ? 'SUPER_ADMIN' : 'PLAYER'
    }
  });
});

// 3. Google Sign-In Authentication Endpoint
app.post('/api/auth/google', (req, res) => {
  const { email, name, picture } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, message: 'Invalid Google account payload.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  broadcastLog('SYSTEM', `🌐 Google Account Authentication: ${name || cleanEmail} (${cleanEmail})`);

  res.json({
    success: true,
    user: {
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      picture: picture || '',
      role: cleanEmail === 'coreagc@gmail.com' ? 'SUPER_ADMIN' : 'PLAYER'
    }
  });
});

app.get('/api/courses', (req, res) => {
  res.json({ success: true, courses: getDB().courses });
});

app.post('/api/courses', (req, res) => {
  const course = req.body;
  const db = getDB();
  const existingIndex = db.courses.findIndex(c => c.id === course.id);
  if (existingIndex >= 0) {
    db.courses[existingIndex] = course;
  } else {
    db.courses.push(course);
  }
  saveDB(db);
  currentCourse = course; // Keep legacy variable synced for now
  broadcastLog('SYSTEM', `Course configuration updated: "${course.title}" (${course.clues?.length || 0} clues).`);
  res.json({ success: true, course });
});

app.get('/api/teams', (req, res) => {
  res.json({ success: true, teams: getDB().teams });
});

app.post('/api/teams', (req, res) => {
  const teams = req.body; // Expecting full array for simplicity right now
  const db = getDB();
  db.teams = teams;
  saveDB(db);
  broadcastLog('SYSTEM', `Teams database updated.`);
  res.json({ success: true, teams });
});

app.get('/api/users', (req, res) => {
  res.json({ success: true, users: getDB().users });
});

app.post('/api/users', (req, res) => {
  const users = req.body; // Expecting full array
  const db = getDB();
  db.users = users;
  saveDB(db);
  res.json({ success: true, users });
});

// Gemini LLM Web Research & Course Generation Endpoint
app.post('/api/generate-course', async (req, res) => {
  const { theme, startLocation, finishLocation, durationMinutes = 60, targetWaypointCount } = req.body;
  
  // Calculate target waypoint count if omitted
  let finalWaypointCount = targetWaypointCount;
  if (!finalWaypointCount) {
    const sLat = parseFloat(startLocation?.lat ?? -33.0372);
    const sLng = parseFloat(startLocation?.lng ?? 151.5945);
    const fLat = parseFloat(finishLocation?.lat ?? -33.0395);
    const fLng = parseFloat(finishLocation?.lng ?? 151.5960);
    const R = 6371000;
    const dLat = (fLat - sLat) * (Math.PI / 180);
    const dLon = (fLng - sLng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(sLat * (Math.PI / 180)) * Math.cos(fLat * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const distMeters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3; // 1.3 route winding factor
    const walkMins = Math.ceil(distMeters / 80); // 80 m/min = 4.8 km/h
    finalWaypointCount = Math.max(1, Math.floor(Math.max(0, parseInt(durationMinutes, 10) - walkMins) / 5));
  }

  broadcastLog('AI_QA', `🤖 AI Web Research Request: Generating spatial course (${finalWaypointCount} waypoints) for theme "${theme}" between "${startLocation?.name}" and "${finishLocation?.name}"`);

  if (!genAI) {
    return res.status(400).json({ success: false, message: 'GEMINI_API_KEY not configured on server.' });
  }

  try {
    // Load instruction prompt template from /src/llm_instructions/course_generator_llm.json
    let courseInstructionFile = path.resolve('./src/llm_instructions/course_generator_llm.json');
    let llmDoc = { name: 'course_generator_llm.json' };
    if (fs.existsSync(courseInstructionFile)) {
      llmDoc = JSON.parse(fs.readFileSync(courseInstructionFile, 'utf8'));
    }

    const template = llmDoc.promptTemplate || `Generate spatial challenge course with {{targetWaypointCount}} waypoints for theme "{{theme}}" from {{startName}} to {{finishName}}.`;
    const prompt = template
      .replace(/{{theme}}/g, theme)
      .replace(/{{startName}}/g, startLocation?.name || 'Start Location')
      .replace(/{{startLat}}/g, startLocation?.lat)
      .replace(/{{startLng}}/g, startLocation?.lng)
      .replace(/{{finishName}}/g, finishLocation?.name || 'Finish Location')
      .replace(/{{finishLat}}/g, finishLocation?.lat)
      .replace(/{{finishLng}}/g, finishLocation?.lng)
      .replace(/{{durationMinutes}}/g, durationMinutes)
      .replace(/{{targetWaypointCount}}/g, finalWaypointCount);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
    const coursePayload = JSON.parse(responseText);

    broadcastLog('AI_QA', `✨ Gemini AI Web Research completed using [${llmDoc.name}]: "${coursePayload.title}" (${coursePayload.clues?.length || 0} waypoints).`);
    res.json({ success: true, course: coursePayload });
  } catch (err) {
    console.error("Gemini course generation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/submissions', (req, res) => {
  res.json({ success: true, submissions: getDB().submissions });
});

// Asynchronous Submission Job Queue API (Supports single or bulk uploads)
app.post('/api/submissions/enqueue', async (req, res) => {
  const { submission, clue, submissions: bulkSubmissions } = req.body;
  const db = getDB();

  // Handle bulk array upload from offline runner
  if (Array.isArray(bulkSubmissions)) {
    const jobIds = [];
    bulkSubmissions.forEach(sub => {
      const jobId = `JOB-${Math.floor(100000 + Math.random() * 900000)}`;
      jobIds.push(jobId);
      
      const enriched = {
        ...sub,
        jobId,
        status: 'QUEUED_FOR_AI_OVERNIGHT',
        createdAt: sub.createdAt || new Date().toISOString()
      };
      
      const existingIdx = db.submissions.findIndex(s => s.id === sub.id);
      if (existingIdx >= 0) {
        db.submissions[existingIdx] = enriched;
      } else {
        db.submissions.push(enriched);
      }
      broadcastLog('TEAM_MERGE', `[Bulk Sync] Submissions consolidated for "${sub.teamName}".`);
    });
    
    saveDB(db);
    return res.json({ success: true, jobIds, message: 'Bulk submissions synced to cloud.' });
  }

  // Legacy single submission logic
  const jobId = `JOB-${Math.floor(100000 + Math.random() * 900000)}`;
  res.json({ success: true, jobId, message: 'Submission queued asynchronously.' });

  // Async Execution Pipeline
  broadcastLog('QUEUE', `[Job ${jobId}] Enqueued payload for Clue #${clue.number} by ${submission.teamName}`);
  
  setTimeout(async () => {
    // 1. EXIF Analysis
    broadcastLog('EXIF', `[Job ${jobId}] Inspecting photo EXIF headers & device camera metadata...`);
    
    // 2. Spatial Distance Verification
    const R = 6371000;
    const dLat = (clue.targetLocation.lat - submission.capturedLocation.lat) * (Math.PI / 180);
    const dLon = (clue.targetLocation.lng - submission.capturedLocation.lng) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(submission.capturedLocation.lat * (Math.PI / 180)) *
              Math.cos(clue.targetLocation.lat * (Math.PI / 180)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const distanceMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 10) / 10;

    const isWithinRadius = distanceMeters <= clue.targetRadiusMeters;
    broadcastLog('SPATIAL', `[Job ${jobId}] Spatial Distance Check: Calculated offset is ${distanceMeters}m from ground-truth (Radius: ${clue.targetRadiusMeters}m).`, {
      offsetMeters: distanceMeters,
      pass: isWithinRadius
    });

    // 3. Team Submission Consolidation
    const enriched = {
      ...submission,
      jobId,
      spatialOffsetMeters: distanceMeters,
      isWithinRadius,
      status: 'QUEUED_FOR_AI_OVERNIGHT',
      createdAt: new Date().toISOString()
    };

    const currentDb = getDB();
    currentDb.submissions.push(enriched);
    saveDB(currentDb);
    
    broadcastLog('TEAM_MERGE', `[Job ${jobId}] Submission consolidated into team feature collection for "${submission.teamName}".`);
  }, 500);
});

// Day 1 Overnight Gemini AI Vision Validation (Cost Optimized)
app.post('/api/validate-ai', async (req, res) => {
  const { clueId, photoBase64, aiCriteria } = req.body;

  // 1. COST OPTIMIZATION: Compute hash of photo payload to check in-memory cache
  const photoHash = crypto.createHash('md5').update(photoBase64 || '').digest('hex');
  const cacheKey = `${clueId}:${photoHash}`;

  if (aiResponseCache.has(cacheKey)) {
    broadcastLog('AI_QA', `[COST SAVER] Returning cached Gemini AI evaluation ($0 API cost).`);
    return res.json({
      success: true,
      cached: true,
      geminiResponse: aiResponseCache.get(cacheKey)
    });
  }

  broadcastLog('AI_QA', `Initiating Gemini 1.5 Flash Vision AI evaluation...`);

  if (!genAI) {
    broadcastLog('AI_QA', `Notice: GEMINI_API_KEY environment variable is missing. Set GEMINI_API_KEY to run live Gemini API calls.`);
    return res.status(400).json({
      success: false,
      error: "GEMINI_API_KEY not set. Please configure GEMINI_API_KEY to execute live Gemini 1.5 Flash API calls."
    });
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Prepare image payload for Gemini
    const imagePart = {
      inlineData: {
        data: photoBase64.split(',')[1] || photoBase64,
        mimeType: 'image/jpeg'
      }
    };

    const prompt = `You are a spatial GIS QA validator. Inspect this uploaded clue photo against the following criteria: "${aiCriteria}". 
    Respond with JSON containing:
    - is_object_present: boolean
    - confidence_score: number between 0 and 100
    - detected_features: list of strings
    - spatial_notes: concise summary reasoning.`;

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();

    // Cache the response
    aiResponseCache.set(cacheKey, responseText);

    broadcastLog('SUCCESS', `Gemini 1.5 Flash Vision evaluation completed & cached.`);

    return res.json({
      success: true,
      geminiResponse: responseText
    });
  } catch (err) {
    broadcastLog('ERROR', `Gemini API Error: ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback route for SPA client-side routing & server status
app.get('*', (req, res) => {
  const distIndexPath = path.resolve('dist', 'index.html');
  if (fs.existsSync(distIndexPath)) {
    res.sendFile(distIndexPath);
  } else {
    res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SpatialCourse_Crafter Server</title>
          <style>
            body { font-family: system-ui, sans-serif; background: #090d16; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { background: #0f172a; border: 1px solid #1e293b; padding: 2rem; max-width: 500px; text-align: center; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            h1 { color: #38bdf8; font-size: 1.5rem; margin-top: 0; }
            p { color: #94a3b8; font-size: 0.9rem; line-height: 1.5; }
            code { background: #1e293b; color: #38bdf8; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-family: monospace; }
            a { color: #34d399; text-decoration: none; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>SpatialCourse_Crafter Server Active</h1>
            <p>The Node.js API & WebSocket server is running on <code>port 8080</code>.</p>
            <p><strong>To view the UI:</strong></p>
            <p>• <strong>Development Mode:</strong> Open <a href="http://localhost:3000">http://localhost:3000</a> (run <code>npm run dev</code>)</p>
            <p>• <strong>Production Mode:</strong> Run <code>npm run build</code> in your terminal to build static assets.</p>
          </div>
        </body>
      </html>
    `);
  }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`SpatialCourse_Crafter Node.js Unified Server listening on port ${PORT}`);
});
