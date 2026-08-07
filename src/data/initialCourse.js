// Initial Course & Clues Data for FUNGIS GeoScore AI (Spatial Olympics)

export const DEFAULT_COURSE = {
  id: "fungis-cairns-2026",
  title: "Cairns Spatial Olympics 2km Challenge",
  description: "Far North GIS User Group flagship 2km spatial data collection course combining geodetic precision, historical monuments, and environmental monitoring.",
  theme: "Historical & Spatial Surveying",
  durationMinutes: 90,
  startLocation: {
    lat: -16.9186,
    lng: 145.7781,
    name: "Cairns Esplanade Lagoon Plaza"
  },
  geofenceRadiusMeters: 25,
  clues: [
    {
      id: "clue-1",
      number: 1,
      title: "Geodetic Survey Reference Mark #402",
      category: "Geodetic / Spatial",
      description: "Locate the stainless steel geodetic benchmark pin embedded in the seawall promenade. Record high-accuracy GPS coordinates.",
      targetLocation: { lat: -16.9186, lng: 145.7781 },
      points: 150,
      targetRadiusMeters: 20,
      taskType: "POINT_CAPTURE", // Precise GPS point + attributes
      requiredAttributes: [
        { key: "pin_condition", label: "Marker Condition", type: "select", options: ["Good", "Disturbed", "Covered", "Damaged"] },
        { key: "stamped_id", label: "Stamped ID Number", type: "text", placeholder: "e.g. PM-402-FNQ" }
      ],
      aiCriteria: "Verify photo shows a circular metal benchmark pin or brass survey disc in concrete."
    },
    {
      id: "clue-2",
      number: 2,
      title: "Historical Maritime Pioneer Monument",
      category: "Historical & Cultural",
      description: "Find the 1890s sandstone monument honoring early maritime cartographers. Capture a geotagged photo of the plaque text.",
      targetLocation: { lat: -16.9202, lng: 145.7794 },
      points: 200,
      targetRadiusMeters: 25,
      taskType: "GEOTAG_PHOTO",
      requiredAttributes: [
        { key: "inscription_year", label: "Plaque Inscription Year", type: "text", placeholder: "e.g. 1895" },
        { key: "material_type", label: "Structure Material", type: "select", options: ["Sandstone", "Granite", "Bronze", "Timber"] }
      ],
      aiCriteria: "Photo must display an engraved commemorative stone plaque with readable lettering."
    },
    {
      id: "clue-3",
      number: 3,
      title: "Mangrove Boardwalk Eco-Monitoring Node",
      category: "Environmental GIS",
      description: "Navigate along the wetland boardwalk to the solar-powered water level telemetry sensor.",
      targetLocation: { lat: -16.9221, lng: 145.7810 },
      points: 175,
      targetRadiusMeters: 30,
      taskType: "QUIZ_AND_FORM",
      quizQuestion: "What is the recorded digital sensor telemetry frequency listed on the node box?",
      quizOptions: ["5 minutes", "15 minutes", "1 hour", "Continuous"],
      correctOption: 1, // 15 minutes
      requiredAttributes: [
        { key: "sensor_status", label: "Status Indicator Light", type: "select", options: ["Green / Active", "Amber / Maint", "Red / Fault", "Off"] }
      ],
      aiCriteria: "Photo should show the solar panel assembly and telemetry cabinet next to mangrove boardwalk."
    },
    {
      id: "clue-4",
      number: 4,
      title: "Trinity Bay Datum Zero Tidal Pillar",
      category: "Hydrographic Survey",
      description: "Locate the tidal gauge pillar at the marina pier head. Capture precise coordinates and elevation estimate.",
      targetLocation: { lat: -16.9240, lng: 145.7828 },
      points: 225,
      targetRadiusMeters: 20,
      taskType: "POINT_CAPTURE",
      requiredAttributes: [
        { key: "water_level_m", label: "Tide Gauge Height (Meters)", type: "number", placeholder: "e.g. 1.85" },
        { key: "structure_notes", label: "Structural Inspection Notes", type: "text", placeholder: "Any biofouling or damage?" }
      ],
      aiCriteria: "Photo must show tidal height scale markings or tide gauge housing against the water pier."
    }
  ]
};

export const INITIAL_TEAMS = [
  { id: "team-1", name: "Team Mango Mapping", pin: "1010", color: "#38bdf8", members: ["Sarah (Capt)", "Dave", "Alex"] },
  { id: "team-2", name: "Team GeoWizards", pin: "2020", color: "#a855f7", members: ["Marcus", "Elena"] },
  { id: "team-3", name: "Team Tropics GIS", pin: "3030", color: "#22c55e", members: ["Priya", "Tom", "Jess"] }
];
