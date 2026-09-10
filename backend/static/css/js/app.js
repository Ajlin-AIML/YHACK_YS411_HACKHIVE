/**
 * LandslideGuard AI — Core Application Logic
 * Interactive GIS mapping, AI Susceptibility Engine, Temporal Monitoring & Decision Center
 */

// Application State
const state = {
  currentSectorId: "sec-01",
  activeFilter: "ALL",
  isAudioMuted: false,
  isLiveFeedRunning: false,
  liveInterval: null,
  map: null,
  markers: {},
  trendChart: null,
  audioCtx: null
};

// ==========================================================================
// 1. INITIALIZATION & LIFECYCLE
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  initSectorSelector();
  renderSectorScrollStrip();
  initTabNavigation();
  initSimulator();
  initAudio();
  initQuickModals();
  
  // Load initial sector (Sector C - Wayanad Ridge Pass)
  selectSector("sec-01");
  
  // Setup header stats
  updateHeaderKPIs();
});

// ==========================================================================
// 2. GIS MAP (LEAFLET.JS) IMPLEMENTATION
// ==========================================================================
function initMap() {
  const mapElement = document.getElementById("map-container");
  if (!mapElement) return;

  // Center around Southern-Central India to encompass Western Ghats and easily pan to Himalayas
  state.map = L.map("map-container", {
    center: [15.5, 78.5],
    zoom: 5,
    zoomControl: true,
    attributionControl: false
  });

  // Dark basemap layer from CartoDB
  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 18,
    subdomains: "abcd"
  }).addTo(state.map);

  // Invalidate size once rendered in scrollable viewport
  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
    const wrapper = document.getElementById("map-scroll-wrapper");
    if (wrapper) {
      // Center scrollbars horizontally and vertically
      wrapper.scrollLeft = (wrapper.scrollWidth - wrapper.clientWidth) / 2;
      wrapper.scrollTop = (wrapper.scrollHeight - wrapper.clientHeight) / 2;
    }
  }, 250);

  // Render sector markers
  renderMapMarkers();
}

function renderMapMarkers() {
  // Clear existing markers
  Object.values(state.markers).forEach(m => state.map.removeLayer(m));
  state.markers = {};

  SECTORS_DATA.forEach(sector => {
    // Determine pin class
    let pinClass = "pin-low";
    let riskBadge = `<span style="color:#10b981;font-weight:bold;">🟢 LOW</span>`;
    if (sector.riskLevel === "HIGH") {
      pinClass = "pin-high";
      riskBadge = `<span style="color:#ef4444;font-weight:bold;">🔴 HIGH RISK</span>`;
    } else if (sector.riskLevel === "MODERATE") {
      pinClass = "pin-mod";
      riskBadge = `<span style="color:#f59e0b;font-weight:bold;">🟡 MODERATE</span>`;
    }

    // Custom HTML Marker with pulsing aura
    const customIcon = L.divIcon({
      className: `custom-pin ${pinClass}`,
      html: `
        <div class="pin-pulse"></div>
        <div class="pin-core">${sector.riskScore}</div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19]
    });

    const marker = L.marker([sector.lat, sector.lng], { icon: customIcon });

    // Popup content
    const popupContent = `
      <div style="min-width: 190px;">
        <div class="popup-title">${sector.name}</div>
        <div style="font-size: 0.72rem; color: #94a3b8; margin-bottom: 6px;">${sector.region}</div>
        <div class="popup-stat-row">
          <span>AI Risk Score:</span>
          <strong>${sector.riskScore}%</strong>
        </div>
        <div class="popup-stat-row">
          <span>Risk Tier:</span>
          ${riskBadge}
        </div>
        <div class="popup-stat-row">
          <span>Rainfall (24h):</span>
          <span>${sector.rainfall24h} mm</span>
        </div>
        <div class="popup-stat-row">
          <span>Slope:</span>
          <span>${sector.slope}°</span>
        </div>
        <div class="popup-stat-row">
          <span>Soil Moisture:</span>
          <span>${sector.soilMoisture}%</span>
        </div>
        <button class="popup-btn-select" onclick="selectSector('${sector.id}')">
          Inspect Sector Data →
        </button>
      </div>
    `;

    marker.bindPopup(popupContent);
    marker.on("click", () => {
      selectSector(sector.id);
    });

    marker.addTo(state.map);
    state.markers[sector.id] = marker;
  });
}

// Filter Map Markers (All / High / Mod / Low)
function filterMarkers(level) {
  state.activeFilter = level;
  
  // Update button active classes
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === level);
  });

  SECTORS_DATA.forEach(sector => {
    const marker = state.markers[sector.id];
    if (!marker) return;

    if (level === "ALL" || sector.riskLevel === level) {
      if (!state.map.hasLayer(marker)) state.map.addLayer(marker);
    } else {
      if (state.map.hasLayer(marker)) state.map.removeLayer(marker);
    }
  });

  showToast(`Filtered map to: ${level} RISK zones`);
}

// ==========================================================================
// 3. SECTOR INSPECTION & TELEMETRY BINDING
// ==========================================================================
function initSectorSelector() {
  const selectElem = document.getElementById("sector-dropdown");
  if (!selectElem) return;

  selectElem.innerHTML = SECTORS_DATA.map(s => {
    const icon = s.riskLevel === "HIGH" ? "🔴" : s.riskLevel === "MODERATE" ? "🟡" : "🟢";
    return `<option value="${s.id}">${icon} ${s.name} (${s.riskScore}%)</option>`;
  }).join("");

  selectElem.addEventListener("change", (e) => {
    selectSector(e.target.value);
  });
}

function renderSectorScrollStrip() {
  const strip = document.getElementById("map-sectors-scroll-strip");
  if (!strip) return;

  strip.innerHTML = SECTORS_DATA.map(s => {
    const icon = s.riskLevel === "HIGH" ? "🔴" : s.riskLevel === "MODERATE" ? "🟡" : "🟢";
    const color = s.riskLevel === "HIGH" ? "#ef4444" : s.riskLevel === "MODERATE" ? "#f59e0b" : "#10b981";
    const shortName = s.name.split("—")[0].trim();
    return `
      <div class="strip-sector-chip ${s.id === state.currentSectorId ? "active" : ""}" 
           id="strip-chip-${s.id}" 
           onclick="selectSector('${s.id}')"
           title="Click to focus ${s.name}">
        <span>${icon}</span>
        <strong>${shortName}</strong>
        <span style="color:${color}; font-weight:700;">${s.riskScore}%</span>
        <span style="color:#94a3b8; font-size:0.68rem;">🌧️ ${s.rainfall24h}mm</span>
      </div>
    `;
  }).join("");
}

function scrollMapToRegion(region) {
  const wrapper = document.getElementById("map-scroll-wrapper");
  if (!state.map) return;

  let targetLat = 15.5;
  let targetLng = 78.5;
  let targetZoom = 6;
  let scrollX = wrapper ? (wrapper.scrollWidth - wrapper.clientWidth) / 2 : 0;
  let scrollY = wrapper ? (wrapper.scrollHeight - wrapper.clientHeight) / 2 : 0;

  if (region === "ghats") {
    targetLat = 10.5;
    targetLng = 76.5;
    targetZoom = 8;
    scrollX = 260;
    scrollY = 270;
  } else if (region === "himalayas") {
    targetLat = 31.1;
    targetLng = 77.2;
    targetZoom = 8;
    scrollX = 420;
    scrollY = 70;
  } else if (region === "chamoli") {
    targetLat = 30.4;
    targetLng = 79.3;
    targetZoom = 8;
    scrollX = 540;
    scrollY = 90;
  } else if (region === "nilgiris") {
    targetLat = 11.4;
    targetLng = 76.7;
    targetZoom = 9;
    scrollX = 290;
    scrollY = 240;
  }

  state.map.flyTo([targetLat, targetLng], targetZoom, { duration: 1.2 });
  if (wrapper) {
    wrapper.scrollTo({ left: scrollX, top: scrollY, behavior: "smooth" });
  }
  showToast(`Scrolled map to ${region.toUpperCase()} region`);
}

function toggleMapCanvasMode() {
  const wrapper = document.getElementById("map-scroll-wrapper");
  const btn = document.getElementById("btn-toggle-canvas");
  if (!wrapper) return;

  wrapper.classList.toggle("fit-mode");
  const isFit = wrapper.classList.contains("fit-mode");

  if (btn) {
    btn.textContent = isFit ? "↔️ Enable Wide Scrollbars" : "🔲 Wide Canvas (Active)";
    btn.classList.toggle("active", !isFit);
  }

  setTimeout(() => {
    if (state.map) state.map.invalidateSize();
  }, 300);

  showToast(isFit ? "Map mode: Fit to Screen" : "Map mode: Wide Canvas with active scrollbars");
}

function selectSector(sectorId) {
  state.currentSectorId = sectorId;
  const sector = SECTORS_DATA.find(s => s.id === sectorId);
  if (!sector) return;

  // Sync dropdown
  const dropdown = document.getElementById("sector-dropdown");
  if (dropdown && dropdown.value !== sectorId) {
    dropdown.value = sectorId;
  }

  // Update active chip in horizontal scroll strip
  document.querySelectorAll(".strip-sector-chip").forEach(chip => {
    chip.classList.toggle("active", chip.id === `strip-chip-${sectorId}`);
  });
  const activeChip = document.getElementById(`strip-chip-${sectorId}`);
  if (activeChip) {
    activeChip.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }

  // Pan map to selected sector
  if (state.map) {
    state.map.flyTo([sector.lat, sector.lng], 10, {
      duration: 1.2,
      easeLinearity: 0.25
    });
    
    // Open marker popup if available
    const marker = state.markers[sectorId];
    if (marker && state.map.hasLayer(marker)) {
      setTimeout(() => marker.openPopup(), 600);
    }
  }

  // Update UI Elements
  updateSectorInspector(sector);
  updateTemporalChart(sector);
  updateDecisionProtocols(sector);

  // Play sound if high risk and not muted
  if (sector.riskLevel === "HIGH" && !state.isAudioMuted) {
    playAlertTone();
  }
}

function updateSectorInspector(sector) {
  // Update Risk Score Gauge
  const gaugeVal = document.getElementById("gauge-score-value");
  const gaugeProgress = document.getElementById("gauge-circle-progress");
  const riskBadge = document.getElementById("sector-risk-badge");
  const alertSub = document.getElementById("sector-risk-desc");

  if (gaugeVal) gaugeVal.textContent = sector.riskScore;

  // Circle circumference is ~251.2 (2 * PI * 40)
  const maxOffset = 251.2;
  const targetOffset = maxOffset - (sector.riskScore / 100) * maxOffset;
  if (gaugeProgress) {
    gaugeProgress.style.strokeDashoffset = targetOffset;
    
    // Set color based on risk
    let strokeColor = "#10b981";
    let badgeClass = "low";
    let badgeText = "🟢 LOW SUSCEPTIBILITY";
    let subText = "Current conditions indicate stable slope equilibrium.";

    if (sector.riskLevel === "HIGH") {
      strokeColor = "#ef4444";
      badgeClass = "high";
      badgeText = "🔴 HIGH RISK — ALERT LEVEL 3";
      subText = "Elevated saturation and steep slope threshold exceeded.";
    } else if (sector.riskLevel === "MODERATE") {
      strokeColor = "#f59e0b";
      badgeClass = "mod";
      badgeText = "🟡 MODERATE RISK — ADVISORY";
      subText = "Rainfall accumulation rising; heightened slope monitoring advised.";
    }

    gaugeProgress.style.stroke = strokeColor;
    if (riskBadge) {
      riskBadge.className = `risk-badge-large ${badgeClass}`;
      riskBadge.textContent = badgeText;
    }
    if (alertSub) alertSub.textContent = subText;
  }

  // Update Telemetry Values
  setElemText("telem-rain-24h", `${sector.rainfall24h} mm`);
  setElemText("telem-rain-72h", `${sector.rainfall72h} mm cumulative`);
  setElemText("telem-slope", `${sector.slope}°`);
  setElemText("telem-moisture", `${sector.soilMoisture}%`);
  setElemText("telem-elevation", `${sector.elevation} m MSL`);
  setElemText("telem-landcover", sector.landCover);
  setElemText("telem-history", `${sector.historicalEvents} events recorded`);
  setElemText("telem-geology", sector.geology);
  setElemText("telem-infra", sector.criticalInfrastructure);

  // Fill Bars
  setElemWidth("bar-moisture", `${sector.soilMoisture}%`);
  setElemWidth("bar-slope", `${Math.min(100, (sector.slope / 60) * 100)}%`);
  setElemWidth("bar-rain", `${Math.min(100, (sector.rainfall24h / 250) * 100)}%`);

  // Update Top Emergency Banner visibility
  const banner = document.getElementById("emergency-banner");
  if (banner) {
    if (sector.riskLevel === "HIGH") {
      banner.style.display = "flex";
      setElemText("banner-sector-name", `${sector.name} is under CRITICAL WATCH`);
    } else {
      banner.style.display = "none";
    }
  }

  // Populate Simulator with current sector values
  syncSimulatorWithSector(sector);
}

function setElemText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setElemWidth(id, width) {
  const el = document.getElementById(id);
  if (el) el.style.width = width;
}

// ==========================================================================
// 4. TEMPORAL MONITORING CHART & TREND FORECASTING (SECTION 8)
// ==========================================================================
function updateTemporalChart(sector) {
  const ctx = document.getElementById("temporal-trend-chart");
  if (!ctx) return;

  const labels = sector.trendData.map(d => d.day);
  const riskPoints = sector.trendData.map(d => d.risk);
  const rainPoints = sector.trendData.map(d => d.rain);
  const moisturePoints = sector.trendData.map(d => d.moisture);

  if (state.trendChart) {
    state.trendChart.data.labels = labels;
    state.trendChart.data.datasets[0].data = riskPoints;
    state.trendChart.data.datasets[1].data = rainPoints;
    state.trendChart.data.datasets[2].data = moisturePoints;
    state.trendChart.update();
  } else {
    // Create new Chart.js instance
    state.trendChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "AI Risk Score (%)",
            data: riskPoints,
            borderColor: "#ef4444",
            backgroundColor: "rgba(239, 68, 68, 0.15)",
            borderWidth: 3,
            fill: true,
            tension: 0.35,
            yAxisID: "y"
          },
          {
            label: "Rainfall (mm)",
            data: rainPoints,
            borderColor: "#38bdf8",
            backgroundColor: "rgba(56, 189, 248, 0.1)",
            borderWidth: 2,
            borderDash: [4, 4],
            fill: false,
            tension: 0.25,
            yAxisID: "y1"
          },
          {
            label: "Soil Moisture (%)",
            data: moisturePoints,
            borderColor: "#34d399",
            borderWidth: 2,
            fill: false,
            tension: 0.2,
            yAxisID: "y"
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            labels: {
              color: "#94a3b8",
              font: { size: 11, family: "Inter" }
            }
          },
          tooltip: {
            backgroundColor: "#0f172a",
            titleColor: "#f8fafc",
            bodyColor: "#cbd5e1",
            borderColor: "rgba(255,255,255,0.1)",
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: "rgba(255,255,255,0.05)" },
            ticks: { color: "#94a3b8", font: { size: 11 } }
          },
          y: {
            type: "linear",
            display: true,
            position: "left",
            min: 0,
            max: 100,
            grid: { color: "rgba(255,255,255,0.06)" },
            ticks: {
              color: "#94a3b8",
              callback: val => `${val}%`
            }
          },
          y1: {
            type: "linear",
            display: true,
            position: "right",
            min: 0,
            max: 250,
            grid: { drawOnChartArea: false },
            ticks: {
              color: "#38bdf8",
              callback: val => `${val}mm`
            }
          }
        }
      }
    });
  }

  // Update Step Progression List (Monday -> Today)
  renderStepTimeline(sector);
}

function renderStepTimeline(sector) {
  const container = document.getElementById("timeline-steps-list");
  if (!container) return;

  container.innerHTML = sector.trendData.map((d, index) => {
    let pillClass = "low";
    if (d.risk >= 70) pillClass = "high";
    else if (d.risk >= 40) pillClass = "mod";

    const isCurrent = d.day.includes("Today");
    return `
      <div class="step-row ${isCurrent ? "current" : ""}">
        <span class="step-day">${d.day} ${isCurrent ? "📍" : ""}</span>
        <div class="step-metrics">
          <span class="step-rain">🌧️ ${d.rain} mm</span>
          <span class="step-rain" style="color:#34d399">🌊 ${d.moisture}%</span>
          <span class="step-pill ${pillClass}">${d.risk}%</span>
        </div>
      </div>
    `;
  }).join("");
}

// ==========================================================================
// 5. INTERACTIVE "WHAT-IF" AI SUSCEPTIBILITY SIMULATOR
// ==========================================================================
function initSimulator() {
  const inputs = [
    "sim-slider-rain",
    "sim-slider-slope",
    "sim-slider-moisture",
    "sim-slider-elevation",
    "sim-select-landcover"
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", calculateSimulatedRisk);
      el.addEventListener("change", calculateSimulatedRisk);
    }
  });

  // Initial calculation
  calculateSimulatedRisk();
}

function syncSimulatorWithSector(sector) {
  const rainEl = document.getElementById("sim-slider-rain");
  const slopeEl = document.getElementById("sim-slider-slope");
  const moistureEl = document.getElementById("sim-slider-moisture");
  const elevEl = document.getElementById("sim-slider-elevation");
  const landEl = document.getElementById("sim-select-landcover");

  if (rainEl) rainEl.value = sector.rainfall24h;
  if (slopeEl) slopeEl.value = sector.slope;
  if (moistureEl) moistureEl.value = sector.soilMoisture;
  if (elevEl) elevEl.value = sector.elevation;
  if (landEl) {
    if (sector.landCoverRisk >= 0.9) landEl.value = "0.95";
    else if (sector.landCoverRisk >= 0.8) landEl.value = "0.85";
    else if (sector.landCoverRisk >= 0.6) landEl.value = "0.70";
    else if (sector.landCoverRisk >= 0.4) landEl.value = "0.45";
    else landEl.value = "0.20";
  }

  calculateSimulatedRisk();
}

/**
 * Multi-factor AI Geotechnical Susceptibility Equation
 * Combines Rainfall Intensity, Slope Stability Index, Soil Water Saturation,
 * Land Cover Surcharge, and Terrain Elevation.
 */
function calculateSimulatedRisk() {
  const rain = parseFloat(document.getElementById("sim-slider-rain")?.value || 120);
  const slope = parseFloat(document.getElementById("sim-slider-slope")?.value || 35);
  const moisture = parseFloat(document.getElementById("sim-slider-moisture")?.value || 70);
  const elevation = parseFloat(document.getElementById("sim-slider-elevation")?.value || 1200);
  const landCoverFactor = parseFloat(document.getElementById("sim-select-landcover")?.value || 0.70);

  // Update slider label indicators
  setElemText("val-slider-rain", `${rain} mm`);
  setElemText("val-slider-slope", `${slope}°`);
  setElemText("val-slider-moisture", `${moisture}%`);
  setElemText("val-slider-elevation", `${elevation} m`);

  // 1. Rainfall factor (Threshold ~ 160mm triggers rapid saturation)
  const rainScore = Math.min(100, (rain / 220) * 100);

  // 2. Slope factor (Threshold ~ 35° starts critical gravitational instability)
  let slopeScore = 0;
  if (slope < 15) slopeScore = (slope / 15) * 20;
  else if (slope < 30) slopeScore = 20 + ((slope - 15) / 15) * 35;
  else if (slope < 45) slopeScore = 55 + ((slope - 30) / 15) * 35;
  else slopeScore = 90 + Math.min(10, ((slope - 45) / 15) * 10);

  // 3. Soil moisture factor (80%+ represents near pore-water liquefaction)
  const moistureScore = moisture;

  // 4. Elevation & Land Cover combined
  const landScore = landCoverFactor * 100;
  const elevScore = Math.min(100, (elevation / 2500) * 80 + 20);

  // Weighted Susceptibility Formula (Ensemble Weights)
  // Rainfall (38%), Moisture (26%), Slope (22%), Land Cover (10%), Elevation (4%)
  const rawScore = (rainScore * 0.38) + 
                   (moistureScore * 0.26) + 
                   (slopeScore * 0.22) + 
                   (landScore * 0.10) + 
                   (elevScore * 0.04);

  const finalRisk = Math.round(Math.min(99, Math.max(8, rawScore)));

  // Update Simulator Hero
  const simScoreEl = document.getElementById("sim-score-value");
  const simBadgeEl = document.getElementById("sim-risk-badge");
  const simAdviceEl = document.getElementById("sim-action-advice");

  if (simScoreEl) simScoreEl.textContent = `${finalRisk}%`;

  let riskTier = "LOW";
  let badgeHtml = `<span class="risk-badge-large low">🟢 LOW RISK</span>`;
  let advice = "✅ Standard monitoring; slope stability factor within safe limits.";

  if (finalRisk >= 72) {
    riskTier = "HIGH";
    badgeHtml = `<span class="risk-badge-large high">🔴 CRITICAL HAZARD</span>`;
    advice = "⚠️ Mandatory early warning evacuation & highway road closures advised!";
  } else if (finalRisk >= 42) {
    riskTier = "MODERATE";
    badgeHtml = `<span class="risk-badge-large mod">🟡 ELEVATED ADVISORY</span>`;
    advice = "⚠️ Pre-position emergency earthmovers; clear stormwater culverts.";
  }

  if (simBadgeEl) simBadgeEl.innerHTML = badgeHtml;
  if (simAdviceEl) simAdviceEl.textContent = advice;

  // Update Explainable AI (XAI) Waterfall bars
  updateXAIWaterfall(rainScore, moistureScore, slopeScore, landScore);
}

function updateXAIWaterfall(rain, moisture, slope, land) {
  const total = (rain * 0.38) + (moisture * 0.26) + (slope * 0.22) + (land * 0.14);
  
  const pctRain = Math.round(((rain * 0.38) / total) * 100);
  const pctMoisture = Math.round(((moisture * 0.26) / total) * 100);
  const pctSlope = Math.round(((slope * 0.22) / total) * 100);
  const pctLand = 100 - (pctRain + pctMoisture + pctSlope);

  setElemWidth("xai-bar-rain", `${pctRain}%`);
  setElemText("xai-pct-rain", `${pctRain}%`);

  setElemWidth("xai-bar-moisture", `${pctMoisture}%`);
  setElemText("xai-pct-moisture", `${pctMoisture}%`);

  setElemWidth("xai-bar-slope", `${pctSlope}%`);
  setElemText("xai-pct-slope", `${pctSlope}%`);

  setElemWidth("xai-bar-land", `${Math.max(2, pctLand)}%`);
  setElemText("xai-pct-land", `${Math.max(2, pctLand)}%`);
}

// ==========================================================================
// 6. DECISION SUPPORT & ACTION PROTOCOLS (SECTION 9 & 10)
// ==========================================================================
function updateDecisionProtocols(sector) {
  const listEl = document.getElementById("protocol-checklist");
  if (!listEl) return;

  listEl.innerHTML = sector.recommendations.map(rec => `
    <div class="checklist-item">
      <span class="chk-icon">⚡</span>
      <span>${rec}</span>
    </div>
  `).join("");
}

function triggerEmergencySiren() {
  playAlertTone(true);
  showToast("🚨 High-Decibel Emergency Warning Broadcast Initialized");
}

function triggerDEOCAlert() {
  const sector = SECTORS_DATA.find(s => s.id === state.currentSectorId);
  const message = `[ALERT] District Emergency Operations Center notified. Sector: ${sector.name}. Risk Score: ${sector.riskScore}%. Critical Infrastructure: ${sector.criticalInfrastructure}. Action: Pre-evacuation staging.`;
  console.log(message);
  showToast(`📲 Priority Dispatch sent to District Magistrate & SDRF Commander`);
}

function openSitRepModal() {
  const sector = SECTORS_DATA.find(s => s.id === state.currentSectorId);
  if (!sector) return;

  const now = new Date().toLocaleString();
  const modalContent = `
    <div style="font-family: var(--font-mono); border-bottom: 2px dashed #38bdf8; padding-bottom: 12px; margin-bottom: 14px;">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span style="font-size: 1.1rem; font-weight:800; color: #38bdf8;">LANDSLIDEGUARD AI — SITUATION REPORT (SITREP)</span>
        <span style="background: rgba(239,68,68,0.2); color:#ef4444; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">OFFICIAL DIRECTIVE</span>
      </div>
      <div style="font-size: 0.75rem; color:#94a3b8; margin-top: 4px;">TIMESTAMP: ${now} | DISASTER OPS PROTOCOL 24-B</div>
    </div>

    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
      <div>
        <p><strong>SECTOR:</strong> ${sector.name}</p>
        <p><strong>REGION:</strong> ${sector.region}</p>
        <p><strong>COORDINATES:</strong> ${sector.lat.toFixed(4)}° N, ${sector.lng.toFixed(4)}° E</p>
        <p><strong>ELEVATION:</strong> ${sector.elevation} m MSL</p>
      </div>
      <div>
        <p><strong>AI RISK ASSESSMENT:</strong> <span style="color:${sector.riskLevel === 'HIGH' ? '#ef4444' : '#f59e0b'}; font-weight:bold;">${sector.riskScore}% (${sector.riskLevel} TIER)</span></p>
        <p><strong>PRECIPITATION (24h/72h):</strong> ${sector.rainfall24h}mm / ${sector.rainfall72h}mm</p>
        <p><strong>SLOPE / MOISTURE:</strong> ${sector.slope}° / ${sector.soilMoisture}%</p>
        <p><strong>POPULATION AT RISK:</strong> ${sector.vulnerablePopulation.toLocaleString()} Residents</p>
      </div>
    </div>

    <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; border-left: 4px solid #ef4444; margin-bottom: 16px;">
      <h4 style="color:#f87171; margin-bottom: 6px;">MANDATORY MITIGATION DIRECTIVES</h4>
      <ul style="padding-left: 18px; line-height: 1.6; font-size: 0.8rem;">
        ${sector.recommendations.map(r => `<li>${r}</li>`).join("")}
      </ul>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; font-size: 0.75rem; color:#64748b;">
      <span>Prepared automatically by LandslideGuard AI Neural Early Warning Mesh</span>
      <button onclick="window.print()" class="btn-hud" style="background:#2563eb; color:white; border:none;">🖨️ Print / Save PDF</button>
    </div>
  `;

  document.getElementById("sitrep-body").innerHTML = modalContent;
  document.getElementById("sitrep-modal").classList.add("open");
}

// ==========================================================================
// 7. REAL-TIME LIVE TELEMETRY SIMULATION MODE
// ==========================================================================
function toggleLiveFeed() {
  state.isLiveFeedRunning = !state.isLiveFeedRunning;
  const btn = document.getElementById("btn-live-stream");

  if (state.isLiveFeedRunning) {
    btn.classList.add("active");
    btn.innerHTML = `<span class="pulse-dot" style="background:#10b981; box-shadow:0 0 8px #10b981;"></span> Streaming Live Telemetry`;
    showToast("🟢 Live Sensor Jitter & IoT Telemetry feed activated");

    state.liveInterval = setInterval(() => {
      // Pick current sector and perturb slightly
      const sector = SECTORS_DATA.find(s => s.id === state.currentSectorId);
      if (!sector) return;

      const rainDelta = (Math.random() - 0.45) * 3;
      const moistureDelta = (Math.random() - 0.45) * 1.5;

      sector.rainfall24h = Math.max(10, Math.round(sector.rainfall24h + rainDelta));
      sector.soilMoisture = Math.min(99, Math.max(20, Math.round(sector.soilMoisture + moistureDelta)));

      // Recalculate score slightly
      sector.riskScore = Math.min(99, Math.max(10, Math.round(
        (sector.rainfall24h * 0.35) + (sector.soilMoisture * 0.3) + (sector.slope * 0.5)
      )));

      updateSectorInspector(sector);
    }, 3200);
  } else {
    btn.classList.remove("active");
    btn.innerHTML = `<span>📡</span> Stream Simulation`;
    clearInterval(state.liveInterval);
    showToast("⚪ Live Telemetry feed paused");
  }
}

// ==========================================================================
// 8. AUDIO SYNTHESIZER (WEB AUDIO API)
// ==========================================================================
function initAudio() {
  const muteBtn = document.getElementById("btn-audio-toggle");
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      state.isAudioMuted = !state.isAudioMuted;
      muteBtn.textContent = state.isAudioMuted ? "🔇 Unmute Audio" : "🔊 Audio On";
      muteBtn.classList.toggle("active", !state.isAudioMuted);
    });
  }
}

function playAlertTone(isUrgent = false) {
  if (state.isAudioMuted) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!state.audioCtx) state.audioCtx = new AudioCtx();

    if (state.audioCtx.state === "suspended") {
      state.audioCtx.resume();
    }

    const osc = state.audioCtx.createOscillator();
    const gain = state.audioCtx.createGain();

    osc.type = isUrgent ? "sawtooth" : "sine";
    osc.frequency.setValueAtTime(isUrgent ? 880 : 540, state.audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(isUrgent ? 440 : 720, state.audioCtx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.12, state.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(state.audioCtx.destination);

    osc.start();
    osc.stop(state.audioCtx.currentTime + 0.36);
  } catch (err) {
    console.warn("Audio warning synth note:", err);
  }
}

// ==========================================================================
// 9. TABS & MODALS NAVIGATION
// ==========================================================================
function initTabNavigation() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTab = btn.dataset.tab;

      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const pane = document.getElementById(targetTab);
      if (pane) pane.classList.add("active");

      // Resize chart if temporal tab opened
      if (targetTab === "tab-temporal" && state.trendChart) {
        setTimeout(() => state.trendChart.resize(), 100);
      }
    });
  });
}

function initQuickModals() {
  // Pitch Modal
  const pitchBtn = document.getElementById("btn-pitch-modal");
  const pitchModal = document.getElementById("pitch-modal");
  const closePitch = document.getElementById("btn-close-pitch");

  if (pitchBtn && pitchModal) {
    pitchBtn.addEventListener("click", () => pitchModal.classList.add("open"));
  }
  if (closePitch && pitchModal) {
    closePitch.addEventListener("click", () => pitchModal.classList.remove("open"));
  }

  // SitRep Modal
  const sitrepModal = document.getElementById("sitrep-modal");
  const closeSitrep = document.getElementById("btn-close-sitrep");
  if (closeSitrep && sitrepModal) {
    closeSitrep.addEventListener("click", () => sitrepModal.classList.remove("open"));
  }

  // Close modals clicking outside card
  window.addEventListener("click", (e) => {
    if (e.target === pitchModal) pitchModal.classList.remove("open");
    if (e.target === sitrepModal) sitrepModal.classList.remove("open");
  });
}

function updateHeaderKPIs() {
  setElemText("kpi-monitored-zones", DASHBOARD_SUMMARY.totalMonitoredZones);
  setElemText("kpi-high-risk", DASHBOARD_SUMMARY.highRiskCount);
  setElemText("kpi-moderate-risk", DASHBOARD_SUMMARY.moderateRiskCount);
  setElemText("kpi-avg-moisture", "76.4%");
}

function showToast(message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>🛡️</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(100%)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
