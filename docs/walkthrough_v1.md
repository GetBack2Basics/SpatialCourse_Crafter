# SpatialCourse_Crafter Implementation Walkthrough

**SpatialCourse_Crafter** is an open-source, mobile-friendly spatial game & course creation platform built for the **Far North GIS User Group's Spatial Olympics**. Powered by **Stitch 1:1 Fungis Geospatial Intelligence design system**, **GeoLibre (MapLibre GL JS)** open-source mapping engine, real Node.js WebSocket backend, and GCP Gemini 1.5 Flash AI validation engine.

---

## 1. Key Accomplishments

1. **Stitch 1:1 Design System & Interface**:
   - Integrated the exact Stitch design blueprint from `design_blueprints/admin.zip`.
   - Uses **Montserrat** typography, **Material Symbols Outlined** icon font, and Stitch color palette (`#0b1000`, `#f7f9ff`, `#2f4f18` / `#a1fd63`, `#486800` / `#d2ef6a`, `#6c3459` / `#fdff9d`).

2. **Admin Course Planning Studio**:
   - Interactive wizard allowing course planners to set **Start Location**, **Target Duration**, **Location Theme** (*Historical & Spatial*, *Cultural Heritage*, *Eco & Environmental*, *Geodetic Precision*), and create spatial clue waypoints.
   - Interactive **Discard Draft** and **Save Course** buttons wired to REST API endpoints, real WebSocket logs, and user toast notifications.

3. **Mobile Player Experience & Real GPS**:
   - Native HTML5 Geolocation API (`navigator.geolocation.watchPosition`) tracking real device GPS coordinates, heading, and accuracy radius.
   - Target compass bearing meter and geofence unlock zone.
   - Geotagged photo capture with real binary EXIF metadata parsing (`exifr`).

4. **Real Node.js Server & WebSocket Network Broadcaster**:
   - `server/index.js` running Express API server and WebSocket server (`ws`) on port `8080`.
   - Real-time iteration log feed (`QUEUE` -> `EXIF` -> `SPATIAL` -> `TEAM_MERGE` -> `GCP AI`).

5. **GCP Gemini 1.5 Flash AI Validation & Day 2 Rule Leaderboard**:
   - Real `@google/generative-ai` SDK integration performing vision object detection and spatial QA.
   - Day 2 participant rule voting sliders and transparent AI score breakdown tooltips.

6. **GitHub Push**:
   - Pushed directly to remote repository: [https://github.com/GetBack2Basics/SpatialCourse_Crafter](https://github.com/GetBack2Basics/SpatialCourse_Crafter)

---

## 2. Server & Client Status

- **GitHub Repository**: [https://github.com/GetBack2Basics/SpatialCourse_Crafter](https://github.com/GetBack2Basics/SpatialCourse_Crafter)
- **Node.js Backend**: `http://localhost:8080` (WebSocket: `ws://localhost:8080/ws`)
- **Frontend App**: **http://localhost:3000**
