# Implementation Plan: FUNGIS GeoScore AI (Spatial Olympics Platform) - v1.0

The **FUNGIS GeoScore AI** project is an open-source, mobile-first spatial game and data collection platform built for the **Far North GIS User Group's Spatial Olympics**. Drawing from Actionbound, Goosechase, and adopting the technology stack of **GeoLibre (v2.5.0)** (React, MapLibre GL JS, DuckDB-WASM), it provides an end-to-end workflow: Admin Course Planning, Mobile Team Navigation & Data Collection, Asynchronous Processing with Live WebSockets, Day 1 AI Data Validation, and Day 2 Participant-Voted AI Scoring.

---

## 1. Key Innovations & Stack Architecture

1. **GeoLibre Base & Open Mapping Stack**:
   - **MapLibre GL JS** for vector tile rendering (fast, mobile-friendly 60fps mapping).
   - **DuckDB-WASM (Spatial)** for in-browser spatial SQL operations, spatial buffering, and local data aggregation.
   - OpenStreetMap / PMTiles basemaps — 100% open source with zero proprietary mapping lock-in or cost.

2. **Admin Course Planning Mode**:
   - Interactive creation wizard: set **Start Location**, **Course Duration**, and **Location Category/Theme** (e.g. *Historical Landmarks*, *Cultural Heritage*, *Environmental / Survey Pegs*).
   - Smart course waypoint & clue generator with geofenced target radii.
   - **Team Management**: Invite participants, assign team roster, generate team access codes.
   - **Unified Team Data Merging**: Automatic real-time consolidation merging all spatial points, geotagged photos, and attribute forms submitted by *any* member of a team into a unified team feature collection.

3. **Day 1: Mobile Spatial Data Collection & Real-Time Job Queue**:
   - Mobile clue runner with GPS position tracking, target compass bearing, and geofence unlock.
   - Submission forms: precise GPS point collection, geotagged EXIF photo capture, and attribute field input.
   - **Asynchronous Queue & Live WebSocket Terminal**: Submissions are queued in the background while a live slide-up console streams iteration logs to users in real time.

4. **Day 1 Overnight: AI-Assisted Data Validation Engine**:
   - **Spatial Accuracy**: Distance buffer analysis and positional uncertainty checks against ground-truth coordinates using spatial SQL (DuckDB / Turf).
   - **AI Photo Object Verification**: Gemini 1.5 Flash API evaluates photos against clue criteria (verifying presence of survey monuments, historical plaques, specific features).
   - **Attribute Quality**: QA completeness check against required schema fields.

5. **Day 2: Participant-Driven Configurable AI Scoring & Leaderboard**:
   - Teams collectively vote / prioritize pre-configured scoring rules (e.g. *Spatial Precision*, *AI Photo Confidence*, *Attribute Quality*, *Speed*).
   - AI scoring engine processes merged team datasets within minutes, generating a transparent Spatial Olympics Leaderboard with explainable AI breakdown cards.
