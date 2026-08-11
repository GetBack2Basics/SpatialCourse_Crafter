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

// FunGIS Spatial Olympics 2026 — imported from Google My Maps CSV (Cairns Waterfront)
const spatialOlympics2026Clues = [
  {
    id: "so26-clue-01",
    number: 1,
    title: "The Lovers",
    category: "Public Art & Culture",
    description: "This sculpture portrays the story of two lovers. What are their names and celestial bodies they represent?",
    targetLocation: { lat: -16.9268619, lng: 145.7798796 },
    points: 500,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Names & Celestial Bodies", type: "text" }
    ],
    aiCriteria: "Verify photo shows The Lovers sculpture at Cairns waterfront and team member is present."
  },
  {
    id: "so26-clue-02",
    number: 2,
    title: "A Crushing End",
    category: "Industrial Heritage",
    description: "This crane serviced the wharf for decades. What is noted as being one of the last loaded consignments and where was it off to?",
    targetLocation: { lat: -16.9258137, lng: 145.7802605 },
    points: 550,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Last Consignment & Destination", type: "text" }
    ],
    aiCriteria: "Verify photo shows the historic wharf crane at Cairns waterfront."
  },
  {
    id: "so26-clue-03",
    number: 3,
    title: "Birds of a Feather...",
    category: "Public Art & Culture",
    description: "...flock together. How many birds in this installation by Dennis Nona are captured in flight above you?",
    targetLocation: { lat: -16.9248854, lng: 145.7805294 },
    points: 500,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Number of Birds", type: "text" }
    ],
    aiCriteria: "Verify photo shows Dennis Nona bird sculpture installation at Cairns Esplanade."
  },
  {
    id: "so26-clue-04",
    number: 4,
    title: "Look Up and Out",
    category: "Historical GIS",
    description: "What is the 'Total Length of the Concrete Wharfage' as detailed in the plan from this view?",
    targetLocation: { lat: -16.9244774, lng: 145.7805857 },
    points: 600,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Total Length of Concrete Wharfage", type: "text" }
    ],
    aiCriteria: "Verify photo shows the interpretive wharfage plan display on the Cairns Esplanade."
  },
  {
    id: "so26-clue-05",
    number: 5,
    title: "From Tinseltown to Cairns",
    category: "Historical GIS",
    description: "It could be any one of a dozen, but which movie star is pictured here next to this 1,148lb black marlin in 1976?",
    targetLocation: { lat: -16.9237576, lng: 145.780988 },
    points: 600,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Movie Star Name", type: "text" }
    ],
    aiCriteria: "Verify photo shows the 1976 marlin display or sign on the Cairns waterfront."
  },
  {
    id: "so26-clue-06",
    number: 6,
    title: "More Mono Than Extreme",
    category: "Historical GIS",
    description: "What is the name of the jetty where the first regular Hayles ferry services departed from?",
    targetLocation: { lat: -16.9226593, lng: 145.7809317 },
    points: 600,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Name of the Jetty", type: "text" }
    ],
    aiCriteria: "Verify photo shows the historical Hayles ferry signage or jetty reference near Marlin Marina."
  },
  {
    id: "so26-clue-07",
    number: 7,
    title: "Access Denied!!!",
    category: "Navigation",
    description: "When what event is taking place are you denied access to the lower pontoon?",
    targetLocation: { lat: -16.919208, lng: 145.7827806 },
    points: 500,
    targetRadiusMeters: 35,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Event Name", type: "text" }
    ],
    aiCriteria: "Verify photo shows the lower pontoon access sign at Marlin Marina Cairns."
  },
  {
    id: "so26-clue-08",
    number: 8,
    title: "Unbearable",
    category: "Navigation",
    description: "Assuming the flat-earthers are right, in the units provided calculate the bearing and distance to Euston Reef from Linden Bank.",
    targetLocation: { lat: -16.9198469, lng: 145.780777 },
    points: 750,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Bearing & Distance (with units)", type: "text" }
    ],
    aiCriteria: "Verify photo shows the nautical navigation display board and calculated answer is presented."
  },
  {
    id: "so26-clue-09",
    number: 9,
    title: "Echoing Jerome K. Jerome",
    category: "Public Art & Culture",
    description: "A number of mini-men in mini boats. How many do you see?",
    targetLocation: { lat: -16.9197738, lng: 145.780443 },
    points: 500,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Number of Mini-Men", type: "text" }
    ],
    aiCriteria: "Verify photo shows the small boat sculpture installation on Cairns Esplanade."
  },
  {
    id: "so26-clue-10",
    number: 10,
    title: "Take a Break and Enjoy the Shade",
    category: "Environment",
    description: "What is the scientific name for the trees shading you here?",
    targetLocation: { lat: -16.9208248, lng: 145.7806596 },
    points: 500,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Scientific Name", type: "text" }
    ],
    aiCriteria: "Verify photo shows team member under shade trees on the Cairns Esplanade and scientific name is provided."
  },
  {
    id: "so26-clue-11",
    number: 11,
    title: "All a Flutter",
    category: "Public Art & Culture",
    description: "With twenty-five birds overhead, what time is it?",
    targetLocation: { lat: -16.9214421, lng: 145.7777553 },
    points: 500,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Time Shown", type: "text" }
    ],
    aiCriteria: "Verify photo shows the bird sculpture clock or time-based installation on the Cairns Esplanade."
  },
  {
    id: "so26-clue-12",
    number: 12,
    title: "Forgotten Name",
    category: "Historical GIS",
    description: "Formerly the centre of Chinese migration and culture in Cairns, what is the forgotten former name of this street?",
    targetLocation: { lat: -16.9236354, lng: 145.7751841 },
    points: 650,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Former Street Name", type: "text" }
    ],
    aiCriteria: "Verify photo shows the heritage street sign or plaque referencing Chinese migration history in Cairns."
  },
  {
    id: "so26-clue-13",
    number: 13,
    title: "He Has a Big Green Friend",
    category: "Public Art & Culture",
    description: "But it's not the Hulk. What biscuit brought to life is depicted with flowers here?",
    targetLocation: { lat: -16.9232884, lng: 145.7748502 },
    points: 500,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Biscuit Name", type: "text" }
    ],
    aiCriteria: "Verify photo shows the biscuit-themed sculpture or mural with flowers in Cairns CBD."
  },
  {
    id: "so26-clue-14",
    number: 14,
    title: "Well I Should Hope So",
    category: "Navigation",
    description: "Ornately badged to meet the minimum viable product, what does this safe resist to earn your trust?",
    targetLocation: { lat: -16.9241062, lng: 145.7772155 },
    points: 550,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "What the Safe Resists", type: "text" }
    ],
    aiCriteria: "Verify photo shows the ornate safe or vault in Cairns CBD area."
  },
  {
    id: "so26-clue-15",
    number: 15,
    title: "Ly-Ee-Moon",
    category: "Historical GIS",
    description: "The banana junk Ly-Ee-Moon sank with the loss of eight Chinese sailors north of what landmark?",
    targetLocation: { lat: -16.9167476, lng: 145.774956 },
    points: 700,
    targetRadiusMeters: 35,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Landmark Name", type: "text" }
    ],
    aiCriteria: "Verify photo shows the Ly-Ee-Moon heritage display or plaque in Cairns."
  },
  {
    id: "so26-clue-16",
    number: 16,
    title: "Gurrabana Bana",
    category: "Environment",
    description: "The Yirriganydji people constructed shelters from palm fronds, paper bark and what other common plant during this season?",
    targetLocation: { lat: -16.9183248, lng: 145.7762513 },
    points: 600,
    targetRadiusMeters: 30,
    taskType: "PHOTO_VALIDATION",
    requiredAttributes: [
      { key: "answer", label: "Other Plant Used", type: "text" }
    ],
    aiCriteria: "Verify photo shows the Gurrabana Bana interpretive display about Yirriganydji culture in Cairns."
  }
];

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
  },
  {
    id: "course-fungis-spatial-olympics-2026",
    title: "FunGIS Spatial Olympics 2026",
    subtitle: "16-Clue Geospatial Treasure Hunt along the Cairns Waterfront & Esplanade",
    durationMinutes: 90,
    theme: "Historical & Cultural GIS",
    startLocation: {
      name: "The Lovers Sculpture, Cairns Esplanade",
      lat: -16.9268619,
      lng: 145.7798796,
      activationRadiusMeters: 50
    },
    finishLocation: {
      name: "Gurrabana Bana, Cairns Cultural Precinct",
      lat: -16.9183248,
      lng: 145.7762513
    },
    clues: spatialOlympics2026Clues
  }
];

export const INITIAL_COURSE = PRESET_COURSES[0];
