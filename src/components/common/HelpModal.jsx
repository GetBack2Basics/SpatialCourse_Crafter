import React, { useState } from 'react';

export default function HelpModal({ isOpen, onClose }) {
  const [activeHelpTab, setActiveHelpTab] = useState('RUNNER');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme rounded-2xl w-full max-w-3xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden text-theme-main">
        {/* Header */}
        <div className="p-5 border-b border-theme flex items-center justify-between bg-theme-container/50">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-theme-primary text-2xl">help</span>
            <div>
              <h2 className="text-lg font-bold">SpatialCourse Crafter - System Help & Guide</h2>
              <p className="text-xs text-theme-sub">Comprehensive user guide and feature reference</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-theme-sub hover:text-theme-main hover:bg-theme-container transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-theme bg-theme-surface px-4 overflow-x-auto text-xs font-semibold uppercase tracking-wider">
          <button
            onClick={() => setActiveHelpTab('RUNNER')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeHelpTab === 'RUNNER'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
              }`}
          >
            <span className="material-symbols-outlined text-base">directions_run</span>
            Runner
          </button>

          <button
            onClick={() => setActiveHelpTab('LEADERBOARD')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeHelpTab === 'LEADERBOARD'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
              }`}
          >
            <span className="material-symbols-outlined text-base">leaderboard</span>
            Leaderboard
          </button>

          <button
            onClick={() => setActiveHelpTab('PLANNER')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeHelpTab === 'PLANNER'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
              }`}
          >
            <span className="material-symbols-outlined text-base">map</span>
            Course Manager
          </button>

          <button
            onClick={() => setActiveHelpTab('ISSUES')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeHelpTab === 'ISSUES'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
              }`}
          >
            <span className="material-symbols-outlined text-base">bug_report</span>
            Bugs
          </button>

          <button
            onClick={() => setActiveHelpTab('TECH_STACK')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeHelpTab === 'TECH_STACK'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
              }`}
          >
            <span className="material-symbols-outlined text-base">terminal</span>
            Tech Stack
          </button>

          <button
            onClick={() => setActiveHelpTab('SPATIAL_STACK')}
            className={`py-3 px-4 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${activeHelpTab === 'SPATIAL_STACK'
                ? 'border-theme-primary text-theme-primary font-bold'
                : 'border-transparent text-theme-sub hover:text-theme-main'
              }`}
          >
            <span className="material-symbols-outlined text-base">layers</span>
            Spatial Stack
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm leading-relaxed">
          {activeHelpTab === 'ISSUES' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">bug_report</span>
                <h3>Bugs, Issues & Feature Request Backlog Page</h3>
              </div>

              <p className="text-theme-sub">
                The Issue Tracker page allows users, developers, and field teams to log bugs, request new GIS features, submit performance optimizations, and upvote existing requests to influence development priority.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">edit_note</span>
                    Form Entry & Classification
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>Categories:</strong> Bug Report, Feature Request, Enhancement, UI/UX Update, Performance Issue.</li>
                    <li><strong>Severity:</strong> LOW, MEDIUM, HIGH, CRITICAL (System crash / data risk).</li>
                    <li><strong>Priority:</strong> P3_LOW, P2_MEDIUM, P1_HIGH, P0_BLOCKER (Must Fix Now).</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">filter_alt</span>
                    Search & Multi-Filtering
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>Live Search:</strong> Filter across title, description, reporter, and tags.</li>
                    <li><strong>Multi-Select Filters:</strong> Filter concurrently by Category, Severity, Priority, and Status.</li>
                    <li><strong>Upvoting & Sort:</strong> Upvote features/bugs and sort by Priority rank, Upvotes, or Date.</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2 md:col-span-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">download</span>
                    Persistence & 1-Click Export
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Backlog items persist in local browser storage (`spatial_course_issue_backlog`) and can be exported at any time as a formatted JSON document via the <strong>Export JSON</strong> button.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeHelpTab === 'PLANNER' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">map</span>
                <h3>Admin Course Planner</h3>
              </div>
              <p className="text-theme-sub">
                Design interactive spatial challenges, set start/finish geofences, add waypoints with target radiuses, and run AI route optimizations directly on MapLibre 3D maps.
              </p>
            </div>
          )}

          {activeHelpTab === 'RUNNER' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">directions_run</span>
                <h3>Runner & Field Operations — How to Navigate & Compete</h3>
              </div>
              <p className="text-theme-sub">
                Follow this step-by-step field workflow when competing on a spatial course:
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">1</span>
                    Start Course & Enable GPS Location
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Open the <strong>Runner</strong> page, tap <strong>Enable Location / Start Course</strong>, and grant browser GPS location permissions. Ensure your device is within the start activation geofence radius.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">2</span>
                    Navigate to Active Waypoint
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Use the compass HUD, live azimuth bearing, distance meter, and MapLibre canvas to locate the current target waypoint. Check the clue title, hint description, and reference photo.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">3</span>
                    Capture Photo & Record Attributes
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Once inside the target radius, tap <strong>Capture Verification Photo</strong> or upload a field image. Fill out any required site condition attributes (e.g. status, condition grade).
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">4</span>
                    Save Progress Snapshots & Backup (Bonus Points)
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Tap <strong>Save Progress JSON</strong> on the map canvas as you advance. If your phone battery dies or connection drops, restore your progress anytime with <strong>Upload Backup JSON</strong> or switch to <strong>Print Paper Guide</strong>.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">5</span>
                    Reach Finish Geofence & Submit
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Complete all waypoints, head to the final finish location, and click <strong>Submit Final Run</strong> to lock in your score and unlock the live Leaderboard!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeHelpTab === 'LEADERBOARD' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">leaderboard</span>
                <h3>Leaderboard & Scoring — How Standings & AI Vibe Work</h3>
              </div>
              <p className="text-theme-sub">
                Follow this guide to understand how competition scoring, rankings, and AI evaluation are calculated:
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">military_tech</span>
                    Multi-Factor Score Calculation
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1 list-disc list-inside">
                    <li><strong>Base Points:</strong> Earned per waypoint reached inside activation radius.</li>
                    <li><strong>Proximity & Accuracy Bonus:</strong> Higher points for capturing photos closer to center coordinates.</li>
                    <li><strong>Speed & Time Penalty:</strong> Finishing faster than course estimate awards speed multipliers; exceeding duration incurs penalty.</li>
                    <li><strong>Backup Preparedness Bonus:</strong> Bonus points added for saving JSON field snapshots before finish.</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">auto_awesome</span>
                    AI Vibe & Photo Verification Scoring
                  </h4>
                  <p className="text-xs text-theme-sub">
                    The Gemini AI engine evaluates submitted field photos against waypoint reference criteria, analyzing visual features, EXIF geotag matching, and overall team effort to award 0-100% AI Vibe multipliers.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">lock_open</span>
                    Leaderboard Access & Unlocking
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Super Admins can view standings live at any time. Field teams unlock full Leaderboard access immediately upon completing all course waypoints and submitting their final run.
                  </p>
                </div>

                <div className="bg-theme-container border border-primary/40 bg-primary/5 p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-primary text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-base">shield</span>
                    Data Collected &amp; Privacy Notice
                  </h4>
                  <p className="text-xs text-theme-sub leading-relaxed">
                    To maintain spatial accuracy, enable AI vision evaluation, and provide workshop organizers with rich winner criteria, SpatialCourse Crafter captures the following submission metadata:
                  </p>
                  <ul className="text-xs text-theme-sub space-y-1 list-disc list-inside">
                    <li><strong>Geospatial &amp; Geotag:</strong> Device GPS coordinates (Lat/Lng), Altitude/Elevation (m), GPS Accuracy (m), and Photo EXIF timestamp/geotags.</li>
                    <li><strong>Camera &amp; Vision QA:</strong> Uploaded photo base64 stream, EXIF camera make/model/focal length, and AI-detected landmark features.</li>
                    <li><strong>Device &amp; Telemetry:</strong> Battery level percentage, Online/Offline connection status, Screen aspect orientation, and Time spent per clue.</li>
                    <li><strong>Resilience &amp; Hints:</strong> Field Progress Save count, Tech Backup usage, and A-Z hint toggle usage.</li>
                  </ul>
                  <p className="text-xs text-theme-sub italic pt-1">
                    🔒 <strong>Privacy Statement:</strong> All captured data is strictly restricted to project evaluation, scoring engine calculations, and workshop leaderboards.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeHelpTab === 'PLANNER' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">map</span>
                <h3>Course Manager — How to Design & Publish Courses</h3>
              </div>
              <p className="text-theme-sub">
                Follow this step-by-step authoring workflow to create or edit spatial challenges:
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">1</span>
                    Select or Create a Course
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Choose an existing course from the top dropdown, or click <strong>New Course</strong> to start a fresh challenge draft.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">2</span>
                    Set Parameters & Start/Finish Locations (Section 01)
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Enter title, estimated duration, target waypoint count, and activation radius. Type 3+ characters in <strong>Start Location</strong> or <strong>Finish Location</strong> for auto-complete geocoding, or use device GPS / coordinate parser.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">3</span>
                    Choose Theme & Generate AI Waypoints (Section 02)
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Pick a spatial theme or type a custom theme name, then click <strong>Generate Course</strong> to let Gemini AI perform web research and auto-populate historical or environmental waypoints.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">4</span>
                    Manage Clues & Auto-Sort Route (Section 03)
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Edit waypoint criteria, point values, and reference images. Click <strong>Auto-Sort Route</strong> to automatically sequence waypoints into the shortest physical walking order from Start to Finish.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">5</span>
                    Reposition Pins on Map & Save (Section 04)
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Drag start, finish, or waypoint markers on the MapLibre view to fine-tune exact GPS coordinates. When finished, click <strong>Save Course</strong> at the top to publish!
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeHelpTab === 'ISSUES' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">bug_report</span>
                <h3>Issue Tracker — How to Report & Upvote Issues</h3>
              </div>
              <p className="text-theme-sub">
                Follow this workflow to log bugs, request features, or prioritize backlog items:
              </p>

              <div className="space-y-3 pt-1">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">1</span>
                    Submit New Bug or Feature Request
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Fill out the entry form with a descriptive title, category, severity level, priority rank (P0 Blocker to P3 Low), and detailed steps to reproduce or feature acceptance criteria.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">2</span>
                    Filter & Search Existing Backlog
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Use live keyword search or multi-select dropdowns (Category, Severity, Priority, Status) to check if an issue is already reported before creating duplicates.
                  </p>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-1.5">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-theme-primary text-black font-mono font-bold flex items-center justify-center text-[10px]">3</span>
                    Upvote & Export Backlog
                  </h4>
                  <p className="text-xs text-theme-sub">
                    Click the upvote button on any issue to increase its community priority rank. Click <strong>Export JSON</strong> anytime to download a structured backup of the issue backlog.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeHelpTab === 'TECH_STACK' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">terminal</span>
                <h3>Core Tech Stack & Systems Architecture</h3>
              </div>
              <p className="text-theme-sub">
                Architected with modern, fast, low-latency, and cross-platform open-source technologies for responsive field ops and interactive course authoring.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">code</span>
                    Backend & Core Languages
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>JavaScript / Node.js (ES Modules):</strong> Unified single-language fullstack development across browser and backend server.</li>
                    <li><strong>Express.js:</strong> Lightweight REST API server for managing courses, field submissions, and leaderboard persistence.</li>
                    <li><strong>WebSocket (`ws`):</strong> Real-time bi-directional telemetry streaming between field runners and admin dashboards.</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">desktop_windows</span>
                    Frontend Framework & UI
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>React 18 + Vite 5:</strong> Ultra-fast component lifecycle management, HMR, and optimized bundle delivery.</li>
                    <li><strong>Tailwind CSS 3:</strong> Custom utility design system with theme variables (dark/light glassmorphism).</li>
                    <li><strong>Lucide React & Google Material Symbols:</strong> Crisp vector iconography for GIS map controls and tools.</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2 md:col-span-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">smart_toy</span>
                    AI & Metadata Systems
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>Google Generative AI (`@google/generative-ai`):</strong> Gemini LLM integration for dynamic AI vibe scoring and feedback synthesis.</li>
                    <li><strong>EXIF Reader (`exifr`):</strong> Client-side parsing of geolocation EXIF metadata embedded inside field verification photos.</li>
                    <li><strong>Vitest + React Testing Library:</strong> Fast local unit & integration test runner for course validation logic.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeHelpTab === 'SPATIAL_STACK' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-theme-primary font-bold text-base">
                <span className="material-symbols-outlined">layers</span>
                <h3>Spatial & GIS Stack Architecture</h3>
              </div>
              <p className="text-theme-sub">
                Built on open spatial standards and high-performance WebGL vector rendering tools to deliver smooth 3D mapping and offline field resilience.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">map</span>
                    Map Client & Rendering
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>MapLibre GL JS (`maplibre-gl`):</strong> Open-source, GPU-accelerated WebGL vector map viewer for 60fps 3D terrain and interactive course polyline layers.</li>
                    <li><strong>OpenStreetMap / CARTO Basemaps:</strong> Open tile sources (Dark Matter, Positron, Voyager, Satellite) providing detailed global coverage without vendor lock-in.</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">explore</span>
                    Geospatial Math & Geodesy
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>Haversine Great-Circle Geodesy:</strong> Spherical trigonometry calculations for accurate meter-distance and bearing azimuths between field GPS and target waypoints.</li>
                    <li><strong>Geofence Radial Engine:</strong> Custom spatial algorithms for automatic target radius checking, bounding-box masking, and waypoint proximity triggers.</li>
                  </ul>
                </div>

                <div className="bg-theme-container border border-theme p-4 rounded-xl space-y-2 md:col-span-2">
                  <h4 className="font-bold text-theme-main text-xs uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-theme-primary text-base">cloud_sync</span>
                    Field Data Formats & Hardware Interfacing
                  </h4>
                  <ul className="text-xs text-theme-sub space-y-1.5 list-disc list-inside">
                    <li><strong>GeoJSON & Custom Spatial Schemas:</strong> Standardized, human-readable JSON formats for course exports, route waypoints, geofences, and backup snapshots.</li>
                    <li><strong>W3C Geolocation API:</strong> Direct browser hardware integration for live GPS tracking, position accuracy metrics, and heading telemetry in mobile web browsers.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-theme bg-theme-container/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-theme-primary text-black font-bold text-xs hover:opacity-90 transition-all shadow"
          >
            Got it, Close Help
          </button>
        </div>
      </div>
    </div>
  );
}
