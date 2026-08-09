import { optimizeRouteSequence } from '../utils/geoUtils';

const cairnsStart = {
  name: "Cairns Hilton (34 Wharf St, Cairns QLD 4870)",
  lat: -16.9242,
  lng: 145.7808,
  activationRadiusMeters: 100
};

const cairnsFinish = {
  name: "Cairns Hilton (34 Wharf St, Cairns QLD 4870)",
  lat: -16.9242,
  lng: 145.7808
};

const rawSurveyingClues = [
  {
    id: "clue-hilton-1",
    title: "Cairns Hilton Foreshore Geodetic Benchmark",
    category: "Geodetic Survey",
    description: "Locate the brass geodetic survey marker disk embedded in the concrete promenade datum block near Cairns Hilton.",
    targetLocation: { lat: -16.9240, lng: 145.7807 },
    points: 500,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600",
    requiredAttributes: [
      { key: "datum_condition", label: "Marker Condition", type: "select", options: ["Intact", "Worn", "Covered"] }
    ],
    aiCriteria: "Verify photo shows brass geodetic survey disk or datum marker plaque."
  },
  {
    id: "clue-hilton-2",
    title: "Hilton Waterfront Tidal Station Pillar",
    category: "Cadastral GIS",
    description: "Inspect the primary tidal monitoring station and cadastral survey pillar at Trinity Inlet wharf.",
    targetLocation: { lat: -16.9237, lng: 145.7805 },
    points: 550,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600",
    requiredAttributes: [
      { key: "tide_level", label: "Tide Level", type: "select", options: ["High", "Mid", "Low"] }
    ],
    aiCriteria: "Verify tide level gauge pillar or cadastral datum mark."
  },
  {
    id: "clue-hilton-3",
    title: "Wharf Street Cadastral Reference Pin",
    category: "Cadastral GIS",
    description: "Locate the stainless steel cadastral boundary pin set into the kerb alignment block.",
    targetLocation: { lat: -16.9233, lng: 145.7803 },
    points: 600,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600",
    requiredAttributes: [
      { key: "pin_status", label: "Pin Visibility", type: "select", options: ["Exposed", "Flushed", "Obscured"] }
    ],
    aiCriteria: "Verify boundary pin or kerb reference mark."
  },
  {
    id: "clue-hilton-4",
    title: "Trinity Inlet Hydrographic Survey Station (Point D)",
    category: "Hydrographic GIS",
    description: "Record the hydrographic datum plate (Point D) positioned tightly on the foreshore boardwalk.",
    targetLocation: { lat: -16.9228, lng: 145.7799 },
    points: 650,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600",
    requiredAttributes: [
      { key: "datum_height", label: "Boardwalk Height", type: "select", options: ["2.1m AHD", "2.5m AHD", "3.0m AHD"] }
    ],
    aiCriteria: "Verify hydrographic datum plate on boardwalk."
  },
  {
    id: "clue-hilton-5",
    title: "Marlin Marina Promenade Trig Mark",
    category: "Trig Survey",
    description: "Capture the brass tri-station survey bolt anchored into the granite promenade rock.",
    targetLocation: { lat: -16.9222, lng: 145.7794 },
    points: 700,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600",
    requiredAttributes: [
      { key: "bolt_type", label: "Station Bolt", type: "select", options: ["Brass Bolt", "Steel Pin", "Plaque"] }
    ],
    aiCriteria: "Verify trig station bolt or survey marker disk."
  },
  {
    id: "clue-hilton-6",
    title: "Marina Pier Boundary Datum Pin",
    category: "Boundary GIS",
    description: "Inspect the boundary alignment datum pin on the north pier access ramp.",
    targetLocation: { lat: -16.9216, lng: 145.7789 },
    points: 750,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600",
    requiredAttributes: [
      { key: "ramp_type", label: "Pier Ramp", type: "select", options: ["Timber", "Concrete", "Aluminium"] }
    ],
    aiCriteria: "Verify pier boundary datum marker."
  },
  {
    id: "clue-hilton-7",
    title: "Reef Fleet Terminal Azimuth Reference",
    category: "Geodetic Survey",
    description: "Identify the azimuth orientation plaque facing Trinity Bay.",
    targetLocation: { lat: -16.9211, lng: 145.7785 },
    points: 800,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=600",
    requiredAttributes: [
      { key: "bearing", label: "Azimuth Bearing", type: "select", options: ["045 deg", "090 deg", "135 deg"] }
    ],
    aiCriteria: "Verify azimuth plaque or compass rose directional marker."
  },
  {
    id: "clue-hilton-8",
    title: "Esplanade Walk Geodetic Pillar",
    category: "Geodetic Survey",
    description: "Document the permanent geodetic control pillar at the south esplanade junction.",
    targetLocation: { lat: -16.9207, lng: 145.7781 },
    points: 850,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=600",
    requiredAttributes: [
      { key: "pillar_type", label: "Control Pillar", type: "select", options: ["Concrete Pillar", "Brass Monument"] }
    ],
    aiCriteria: "Verify geodetic pillar monument."
  },
  {
    id: "clue-hilton-9",
    title: "Fig Tree Park Traverse Control Station",
    category: "Traverse Survey",
    description: "Find the traverse control peg in Fig Tree Park on the loop return leg.",
    targetLocation: { lat: -16.9225, lng: 145.7791 },
    points: 900,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600",
    requiredAttributes: [
      { key: "tree_canopy", label: "Park Canopy", type: "select", options: ["Shaded", "Open"] }
    ],
    aiCriteria: "Verify traverse control mark in parkland area."
  },
  {
    id: "clue-hilton-10",
    title: "Hilton Promenade Return Datum Pin",
    category: "Final Datum",
    description: "Capture the final return datum pin on the Hilton hotel foreshore concourse.",
    targetLocation: { lat: -16.9239, lng: 145.7806 },
    points: 1000,
    targetRadiusMeters: 50,
    taskType: "PHOTO_VALIDATION",
    referencePhotoUrl: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=600",
    requiredAttributes: [
      { key: "return_status", label: "Final Check", type: "select", options: ["Completed", "Verified"] }
    ],
    aiCriteria: "Verify final return datum pin near Hilton concourse."
  }
];

const cairns10Clues = optimizeRouteSequence(
  { lat: cairnsStart.lat, lng: cairnsStart.lng },
  rawSurveyingClues,
  { lat: cairnsFinish.lat, lng: cairnsFinish.lng }
);

export const PRESET_COURSES = [
  {
    id: "cairns-hilton-surveying",
    title: "Cairns Hilton Surveying & Geodetic Precision Challenge",
    subtitle: "10-Waypoint Geospatial Surveying Sprint starting & ending at Cairns Hilton (34 Wharf St)",
    durationMinutes: 45,
    theme: "Geodetic Precision",
    startLocation: cairnsStart,
    finishLocation: cairnsFinish,
    clues: cairns10Clues
  }
];

export const INITIAL_COURSE = PRESET_COURSES[0];
