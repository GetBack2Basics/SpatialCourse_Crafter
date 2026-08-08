export const PRESET_COURSES = [
  {
    id: "rathmines-ww2-boating",
    title: "Rathmines WW2 Catalina & Boating Trail",
    subtitle: "Explore the historic WWII RAAF Catalina Flying Boat Base on Lake Macquarie",
    durationMinutes: 90,
    theme: "Historical & Spatial",
    startLocation: {
      name: "Rathmines Park & Catalina Precinct, NSW 2283",
      lat: -33.0355,
      lng: 151.5925,
      activationRadiusMeters: 100
    },
    finishLocation: {
      name: "Style Point Catalina Moorings",
      lat: -33.0395,
      lng: 151.5960
    },
    clues: [
      {
        id: "clue-rathmines-1",
        number: 1,
        title: "Catalina Slipway & Lake Macquarie Launch",
        category: "WW2 Heritage & Boating",
        description: "Locate the historic RAAF concrete slipway where PBY Catalina flying boats launched into Lake Macquarie during WWII.",
        targetLocation: { lat: -33.0372, lng: 151.5945 },
        points: 500,
        targetRadiusMeters: 100,
        taskType: "PHOTO_VALIDATION",
        requiredAttributes: [
          { key: "slipway_condition", label: "Slipway Condition", type: "select", options: ["Good", "Fair", "Submerged"] }
        ],
        aiCriteria: "Verify photo shows the historic concrete slipway or Lake Macquarie waterline at Rathmines."
      },
      {
        id: "clue-rathmines-2",
        number: 2,
        title: "RAAF Heritage Officers' Mess Precinct",
        category: "Historical GIS",
        description: "Find the survey marker near the historic WWII RAAF Officers' Mess precinct overlooking Lake Macquarie.",
        targetLocation: { lat: -33.0348, lng: 151.5912 },
        points: 750,
        targetRadiusMeters: 100,
        taskType: "POINT_CAPTURE",
        requiredAttributes: [
          { key: "structure_type", label: "Heritage Structure", type: "select", options: ["Plaque", "Foundation", "Memorial Tree"] }
        ],
        aiCriteria: "Confirm presence of WWII heritage plaque or historical park landmark."
      },
      {
        id: "clue-rathmines-3",
        number: 3,
        title: "Style Point Catalina Moorings",
        category: "Maritime & Boating",
        description: "Capture a geotagged photo of the Catalina mooring zone and boat moorings at Style Point, Lake Macquarie.",
        targetLocation: { lat: -33.0395, lng: 151.5960 },
        points: 1000,
        targetRadiusMeters: 100,
        taskType: "PHOTO_VALIDATION",
        requiredAttributes: [
          { key: "mooring_count", label: "Visible Boats/Moorings", type: "select", options: ["1-5", "5-10", "10+"] }
        ],
        aiCriteria: "Verify photo depicts Lake Macquarie waters, boats, or mooring buoys."
      }
    ]
  },
  {
    id: "cairns-spatial",
    title: "Cairns Coastal & Esplanade Challenge",
    subtitle: "Spatial Olympics course covering Cairns Lagoon and Trinity Inlet",
    durationMinutes: 60,
    theme: "Eco & Environmental",
    startLocation: {
      name: "Cairns Hilton Wharf & Lagoon, QLD",
      lat: -16.9230,
      lng: 145.7810,
      activationRadiusMeters: 100
    },
    finishLocation: {
      name: "Marlin Marina Pier",
      lat: -16.9200,
      lng: 145.7775
    },
    clues: [
      {
        id: "cairns-1",
        number: 1,
        title: "Cairns Lagoon Woven Fish Sculptures",
        category: "Public Art & GIS",
        description: "Capture the stainless steel woven fish sculptures standing inside Cairns Lagoon pool.",
        targetLocation: { lat: -16.9200, lng: 145.7775 },
        points: 500,
        targetRadiusMeters: 100,
        taskType: "PHOTO_VALIDATION",
        requiredAttributes: [
          { key: "sculpture_visible", label: "Woven Fish Visible", type: "select", options: ["Yes", "No"] }
        ],
        aiCriteria: "Verify fish sculpture artwork in waterfront lagoon."
      },
      {
        id: "cairns-2",
        number: 2,
        title: "Trinity Inlet Marine Benchmark",
        category: "Maritime GIS",
        description: "Record the tidal survey marker at the entrance to Marlin Marina near Cairns Hilton.",
        targetLocation: { lat: -16.9230, lng: 145.7810 },
        points: 750,
        targetRadiusMeters: 100,
        taskType: "POINT_CAPTURE",
        requiredAttributes: [
          { key: "tide_level", label: "Tide Level", type: "select", options: ["High", "Mid", "Low"] }
        ],
        aiCriteria: "Confirm tidal gauge or marina pier structure."
      }
    ]
  },
  {
    id: "kyoto-heritage",
    title: "Kyoto Heritage Sprint",
    subtitle: "Navigate ancient shrines and geodetic reference markers across Kyoto",
    durationMinutes: 120,
    theme: "Cultural Heritage",
    startLocation: {
      name: "Kyoto Imperial Palace, Japan",
      lat: 35.0254,
      lng: 135.7621,
      activationRadiusMeters: 100
    },
    finishLocation: {
      name: "Nijo Castle Gate",
      lat: 35.0142,
      lng: 135.7482
    },
    clues: [
      {
        id: "clue-1",
        number: 1,
        title: "Kinkaku-ji Reflection Point",
        category: "Visual AI",
        description: "Identify the precise coordinates where the Golden Pavilion mirrors on the Kyōko-chi pond surface.",
        targetLocation: { lat: 35.0394, lng: 135.7292 },
        points: 500,
        targetRadiusMeters: 100,
        taskType: "PHOTO_VALIDATION",
        requiredAttributes: [
          { key: "reflection_visible", label: "Water Reflection", type: "select", options: ["Yes", "No", "Partial"] }
        ],
        aiCriteria: "Verify photo shows golden structure reflection on water surface."
      },
      {
        id: "clue-2",
        number: 2,
        title: "Nijo Castle Nightingale Floor",
        category: "Audio AI",
        description: "Record acoustic telemetry of the uguisubari floor boards near Ninomaru Palace entrance.",
        targetLocation: { lat: 35.0142, lng: 135.7482 },
        points: 750,
        targetRadiusMeters: 100,
        taskType: "AUDIO_VALIDATION",
        requiredAttributes: [
          { key: "floor_type", label: "Floor Surface", type: "select", options: ["Timber", "Stone", "Matting"] }
        ],
        aiCriteria: "Detect chirp acoustic signature characteristic of nightingale floor."
      }
    ]
  }
];

export const INITIAL_COURSE = PRESET_COURSES[0];

