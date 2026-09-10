/**
 * LandslideGuard AI - Knowledge Base & Sensor Telemetry Dataset
 * Realistic data modelled after critical landslide-susceptible zones across
 * Western Ghats, Himalayas, and Nilgiri ranges.
 */

const SECTORS_DATA = [
  {
    id: "sec-01",
    name: "Sector C — Wayanad Ridge Pass",
    region: "Western Ghats, Kerala",
    lat: 11.5833,
    lng: 76.1333,
    rainfall24h: 194, // mm
    rainfall72h: 382, // mm
    slope: 44, // degrees
    soilMoisture: 89, // %
    elevation: 940, // meters
    landCover: "Degraded Tea Plantation / Disturbed Soil",
    landCoverRisk: 0.85,
    historicalEvents: 4, // in last 5 years
    lastEventDate: "July 2024",
    vulnerablePopulation: 2450,
    criticalInfrastructure: "State Highway 54, Hydro-Electric Feeder line",
    geology: "Weathered Charnockite with Lateritic Overburden",
    riskScore: 88,
    riskLevel: "HIGH",
    trend: "increasing",
    trendData: [
      { day: "Mon", rain: 45, moisture: 54, risk: 34 },
      { day: "Tue", rain: 72, moisture: 65, risk: 48 },
      { day: "Wed", rain: 110, moisture: 74, risk: 62 },
      { day: "Thu", rain: 155, moisture: 82, risk: 75 },
      { day: "Fri (Today)", rain: 194, moisture: 89, risk: 88 },
      { day: "Sat (Forecast)", rain: 210, moisture: 92, risk: 93 },
      { day: "Sun (Forecast)", rain: 130, moisture: 85, risk: 79 }
    ],
    recommendations: [
      "Immediate Level 3 Red Evacuation Order for downhill tea-estate settlement",
      "Close State Highway 54 between KM 28 and 42 to vehicular traffic",
      "Pre-position NDRF search and rescue units at Vythiri Base Camp",
      "Activate geo-extensometer automated millimeter displacement alarms"
    ]
  },
  {
    id: "sec-02",
    name: "Sector 04 — Shimla Highway NH-5",
    region: "Himachal Pradesh, Lower Himalayas",
    lat: 31.1048,
    lng: 77.1734,
    rainfall24h: 172,
    rainfall72h: 320,
    slope: 41,
    soilMoisture: 84,
    elevation: 2150,
    landCover: "Steep Cut Slopes / Urban Infrastructure Fringe",
    landCoverRisk: 0.82,
    historicalEvents: 6,
    lastEventDate: "August 2023",
    vulnerablePopulation: 1800,
    criticalInfrastructure: "National Highway 5, Water Distribution Mains",
    geology: "Fractured Phyllite & Quartzite Overthrust",
    riskScore: 82,
    riskLevel: "HIGH",
    trend: "increasing",
    trendData: [
      { day: "Mon", rain: 30, moisture: 50, risk: 30 },
      { day: "Tue", rain: 60, moisture: 59, risk: 42 },
      { day: "Wed", rain: 95, moisture: 70, risk: 57 },
      { day: "Thu", rain: 140, moisture: 78, risk: 71 },
      { day: "Fri (Today)", rain: 172, moisture: 84, risk: 82 },
      { day: "Sat (Forecast)", rain: 165, moisture: 86, risk: 84 },
      { day: "Sun (Forecast)", rain: 90, moisture: 75, risk: 65 }
    ],
    recommendations: [
      "Halt commercial heavy goods vehicle transit on NH-5 hillside lanes",
      "Deploy drone terrain thermal and crack-displacement surveillance",
      "Issue Level 3 Siren Advisory for Sanjauli-Dhalli commuter corridor"
    ]
  },
  {
    id: "sec-03",
    name: "Sector B — Idukki Reservoir Slopes",
    region: "Western Ghats, Kerala",
    lat: 9.8437,
    lng: 76.9749,
    rainfall24h: 128,
    rainfall72h: 245,
    slope: 35,
    soilMoisture: 72,
    elevation: 820,
    landCover: "Mixed Cardamom Agroforestry",
    landCoverRisk: 0.55,
    historicalEvents: 2,
    lastEventDate: "October 2021",
    vulnerablePopulation: 1200,
    criticalInfrastructure: "Dam Perimeter Access Road, Local Primary School",
    geology: "Granitic Gneiss with Sand-Clay Horizon",
    riskScore: 61,
    riskLevel: "MODERATE",
    trend: "increasing",
    trendData: [
      { day: "Mon", rain: 22, moisture: 44, risk: 24 },
      { day: "Tue", rain: 45, moisture: 53, risk: 36 },
      { day: "Wed", rain: 75, moisture: 61, risk: 47 },
      { day: "Thu", rain: 105, moisture: 68, risk: 55 },
      { day: "Fri (Today)", rain: 128, moisture: 72, risk: 61 },
      { day: "Sat (Forecast)", rain: 110, moisture: 70, risk: 58 },
      { day: "Sun (Forecast)", rain: 60, moisture: 58, risk: 42 }
    ],
    recommendations: [
      "Level 2 Amber Vigilance: Inspect drainage culverts for debris clogging",
      "Alert local emergency response wardens in Kattappana block",
      "Maintain standby earthmovers within 15-minute dispatch radius"
    ]
  },
  {
    id: "sec-04",
    name: "Sector A — Nilgiri Mountain Corridor",
    region: "Tamil Nadu, Nilgiris",
    lat: 11.4102,
    lng: 76.6950,
    rainfall24h: 42,
    rainfall72h: 88,
    slope: 28,
    soilMoisture: 46,
    elevation: 1850,
    landCover: "Dense Shola Forest & Eucalyptus Reserve",
    landCoverRisk: 0.32,
    historicalEvents: 1,
    lastEventDate: "November 2019",
    vulnerablePopulation: 650,
    criticalInfrastructure: "Heritage Mountain Railway Line (NMR)",
    geology: "Charnockite Massif with Stabilized Root Network",
    riskScore: 26,
    riskLevel: "LOW",
    trend: "stable",
    trendData: [
      { day: "Mon", rain: 15, moisture: 40, risk: 20 },
      { day: "Tue", rain: 25, moisture: 42, risk: 22 },
      { day: "Wed", rain: 35, moisture: 45, risk: 25 },
      { day: "Thu", rain: 40, moisture: 47, risk: 27 },
      { day: "Fri (Today)", rain: 42, moisture: 46, risk: 26 },
      { day: "Sat (Forecast)", rain: 30, moisture: 44, risk: 24 },
      { day: "Sun (Forecast)", rain: 20, moisture: 41, risk: 21 }
    ],
    recommendations: [
      "Normal Routine Monitoring (Level 1 Green Advisory)",
      "Automated IoT rain gauges logging on 15-minute intervals",
      "Standard railway track-walker patrol without restrictions"
    ]
  },
  {
    id: "sec-05",
    name: "Sector E — Chamoli Alaknanda Valley",
    region: "Uttarakhand, Higher Himalayas",
    lat: 30.4137,
    lng: 79.3242,
    rainfall24h: 188,
    rainfall72h: 360,
    slope: 47,
    soilMoisture: 86,
    elevation: 1580,
    landCover: "Scree & Colluvium / Sparse Glacial Drift",
    landCoverRisk: 0.90,
    historicalEvents: 7,
    lastEventDate: "February 2021",
    vulnerablePopulation: 3100,
    criticalInfrastructure: "Char Dham Yatra Route, Hydro Power Intake",
    geology: "Brahmapur Metasediments with Active Shear Zones",
    riskScore: 92,
    riskLevel: "HIGH",
    trend: "critical",
    trendData: [
      { day: "Mon", rain: 50, moisture: 58, risk: 40 },
      { day: "Tue", rain: 88, moisture: 67, risk: 56 },
      { day: "Wed", rain: 130, moisture: 76, risk: 72 },
      { day: "Thu", rain: 165, moisture: 82, risk: 84 },
      { day: "Fri (Today)", rain: 188, moisture: 86, risk: 92 },
      { day: "Sat (Forecast)", rain: 195, moisture: 88, risk: 95 },
      { day: "Sun (Forecast)", rain: 140, moisture: 80, risk: 80 }
    ],
    recommendations: [
      "CRITICAL RED: Order suspension of pilgrimage transit along river valley",
      "Sound village warning sirens at Joshimath-Helang corridor",
      "Instruct SDRF teams to initiate relief camp readiness"
    ]
  },
  {
    id: "sec-06",
    name: "Sector D — Darjeeling Paglajhora Pass",
    region: "West Bengal, Eastern Himalayas",
    lat: 26.9833,
    lng: 88.2667,
    rainfall24h: 115,
    rainfall72h: 210,
    slope: 38,
    soilMoisture: 69,
    elevation: 1450,
    landCover: "Terraced Cultivation / Tea Escarpment",
    landCoverRisk: 0.65,
    historicalEvents: 5,
    lastEventDate: "October 2022",
    vulnerablePopulation: 1400,
    criticalInfrastructure: "Hill Cart Road NH-55, Water Pipeline",
    geology: "Mica Schist & Gneissic Saprolite",
    riskScore: 68,
    riskLevel: "MODERATE",
    trend: "increasing",
    trendData: [
      { day: "Mon", rain: 28, moisture: 48, risk: 30 },
      { day: "Tue", rain: 55, moisture: 56, risk: 42 },
      { day: "Wed", rain: 82, moisture: 62, risk: 54 },
      { day: "Thu", rain: 102, moisture: 66, risk: 62 },
      { day: "Fri (Today)", rain: 115, moisture: 69, risk: 68 },
      { day: "Sat (Forecast)", rain: 100, moisture: 67, risk: 64 },
      { day: "Sun (Forecast)", rain: 65, moisture: 59, risk: 49 }
    ],
    recommendations: [
      "Issue Yellow Advisory for Hill Cart Road commuters",
      "Verify retaining wall strain sensors and pore pressure telemetry",
      "Deploy visual observer teams to spring runoff discharge points"
    ]
  },
  {
    id: "sec-07",
    name: "Sector G — Munnar Gap Road Escarpment",
    region: "Western Ghats, Kerala",
    lat: 10.0889,
    lng: 77.0595,
    rainfall24h: 145,
    rainfall72h: 290,
    slope: 42,
    soilMoisture: 78,
    elevation: 1600,
    landCover: "Road Widening Rock Cuts & Loose Scree",
    landCoverRisk: 0.88,
    historicalEvents: 4,
    lastEventDate: "August 2020",
    vulnerablePopulation: 980,
    criticalInfrastructure: "Kochi-Dhanushkodi NH-85 Highway",
    geology: "Weathered Hornblende-Biotite Gneiss",
    riskScore: 78,
    riskLevel: "HIGH",
    trend: "increasing",
    trendData: [
      { day: "Mon", rain: 35, moisture: 52, risk: 36 },
      { day: "Tue", rain: 68, moisture: 62, risk: 49 },
      { day: "Wed", rain: 102, moisture: 70, risk: 63 },
      { day: "Thu", rain: 125, moisture: 75, risk: 71 },
      { day: "Fri (Today)", rain: 145, moisture: 78, risk: 78 },
      { day: "Sat (Forecast)", rain: 140, moisture: 79, risk: 77 },
      { day: "Sun (Forecast)", rain: 85, moisture: 69, risk: 58 }
    ],
    recommendations: [
      "Level 3 Warning: Ban night travel on Gap Road (7 PM - 6 AM)",
      "Clear loose overhang boulders identified by drone LIDAR inspection",
      "Set up emergency radio relay stations for prompt hazard dispatch"
    ]
  },
  {
    id: "sec-08",
    name: "Sector F — Coonoor Hill Railway Gradient",
    region: "Tamil Nadu, Nilgiris",
    lat: 11.3530,
    lng: 76.7959,
    rainfall24h: 58,
    rainfall72h: 110,
    slope: 30,
    soilMoisture: 52,
    elevation: 1720,
    landCover: "Eucalyptus Plantation / Forest",
    landCoverRisk: 0.38,
    historicalEvents: 2,
    lastEventDate: "November 2021",
    vulnerablePopulation: 520,
    criticalInfrastructure: "Coonoor-Mettupalayam Ghat Road",
    geology: "Granulite Facies Bedrock with Moderate Soil Mantle",
    riskScore: 35,
    riskLevel: "LOW",
    trend: "stable",
    trendData: [
      { day: "Mon", rain: 18, moisture: 42, risk: 22 },
      { day: "Tue", rain: 30, moisture: 46, risk: 26 },
      { day: "Wed", rain: 45, moisture: 49, risk: 30 },
      { day: "Thu", rain: 52, moisture: 51, risk: 33 },
      { day: "Fri (Today)", rain: 58, moisture: 52, risk: 35 },
      { day: "Sat (Forecast)", rain: 40, moisture: 48, risk: 30 },
      { day: "Sun (Forecast)", rain: 25, moisture: 44, risk: 24 }
    ],
    recommendations: [
      "Routine telemetry monitoring; no traffic restrictions required",
      "Maintain sensor health ping checks on solar-powered telemetry nodes"
    ]
  }
];

// Reference land cover weights for the susceptibility calculation model
const LAND_COVER_FACTORS = [
  { name: "Dense Shola Forest / Virgin Canopy", factor: 0.20, description: "Strong root reinforcement, low runoff" },
  { name: "Agroforestry / Cardamom / Coffee", factor: 0.45, description: "Moderate canopy, terrace stability" },
  { name: "Tea Plantation / Cleared Slopes", factor: 0.70, description: "Shallow root systems, high topsoil loss" },
  { name: "Bare Rock / Colluvium / Scree", factor: 0.85, description: "Unconsolidated loose rock fragments" },
  { name: "Road Cutting / Urban Construction Fringe", factor: 0.95, description: "Toe excavation, destabilized cut slopes" }
];

// Historical statistics for model metrics presentation
const MODEL_METRICS = {
  modelName: "Ensemble Geo-Spatial Random Forest + Gradient Boosted Trees",
  aucRoc: "0.938",
  f1Score: "0.912",
  accuracy: "92.4%",
  trainingInstances: "48,250 historical slip events & geotechnical gauge logs",
  lastModelSync: "10-Sep-2026 14:45 UTC",
  activeSensors: 148,
  sensorsOnlinePct: "99.2%"
};

// Global summary stats
const DASHBOARD_SUMMARY = {
  totalMonitoredZones: SECTORS_DATA.length,
  highRiskCount: SECTORS_DATA.filter(s => s.riskLevel === "HIGH").length,
  moderateRiskCount: SECTORS_DATA.filter(s => s.riskLevel === "MODERATE").length,
  lowRiskCount: SECTORS_DATA.filter(s => s.riskLevel === "LOW").length,
  overallAlertLevel: "LEVEL 3 — RED VIGILANCE",
  activeRainAlerts: 4,
  evacuationNoticesPending: 2
};
