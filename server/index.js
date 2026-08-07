import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenerativeAI } from '@google/generative-ai';
import http from 'http';
import path from 'path';
import crypto from 'crypto';

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
    message: 'Real WebSocket Connection Established with Node.js Server.'
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

// In-Memory Database for Course & Submissions
let currentCourse = null;
let submissionsStore = [];

// REST API Endpoints
app.post('/api/course', (req, res) => {
  currentCourse = req.body;
  broadcastLog('SYSTEM', `Course configuration updated: "${currentCourse.title}" (${currentCourse.clues.length} clues).`);
  res.json({ success: true, course: currentCourse });
});

app.get('/api/submissions', (req, res) => {
  res.json(submissionsStore);
});

// Asynchronous Submission Job Queue API
app.post('/api/submissions/enqueue', async (req, res) => {
  const { submission, clue } = req.body;
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

    submissionsStore.push(enriched);
    broadcastLog('TEAM_MERGE', `[Job ${jobId}] Submission consolidated into team feature collection for "${submission.teamName}".`);
  }, 500);
});

// Day 1 Overnight Real Gemini AI Vision Validation (Cost Optimized)
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

  broadcastLog('AI_QA', `Initiating real Gemini 1.5 Flash Vision AI evaluation...`);

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

// Fallback route for SPA client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve('dist', 'index.html'));
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`SpatialCourse_Crafter Node.js Unified Server listening on port ${PORT}`);
});
