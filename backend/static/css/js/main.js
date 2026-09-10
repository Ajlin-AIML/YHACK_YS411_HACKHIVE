/**
 * LandslideGuard AI — Early Warning Command Center Script
 * Integrates Leaflet.js, Chart.js, and Flask REST API endpoints
 * Includes All-India Search Bar and SQLite Search History Database
 */

// State Management
let map = null;
let currentTileLayer = null;
let locationMarkers = {};
let searchMarker = null;
let historyChart = null;
let activeLocationId = 1;
let voiceAlertEnabled = true;
let allLocations = [];
let allScenarios = [];
let latestPredictionData = null;

// Tile Layer URLs - High clarity OpenStreetMap, Esri Satellite, and Dark GIS
const TILES = {
    street: {
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USGS, AEX, GeoEye, GIS User Community'
    },
    dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap'
    }
};

// Popular Indian Hill Stations & Disaster Zones for instant autocomplete
const QUICK_SUGGESTIONS = [
    { name: "Kedarnath Valley", state: "Uttarakhand", lat: 30.7346, lon: 79.0669 },
    { name: "Wayanad Hills (Meppadi)", state: "Kerala", lat: 11.5534, lon: 76.1320 },
    { name: "Munnar Highlands", state: "Kerala", lat: 10.0889, lon: 77.0595 },
    { name: "Idukki Ghats", state: "Kerala", lat: 9.8494, lon: 76.9806 },
    { name: "Shimla Ridge", state: "Himachal Pradesh", lat: 31.1048, lon: 77.1734 },
    { name: "Manali Solang Valley", state: "Himachal Pradesh", lat: 32.2432, lon: 77.1892 },
    { name: "Dharamshala & McLeodGanj", state: "Himachal Pradesh", lat: 32.2190, lon: 76.3234 },
    { name: "Nainital Lake Catchment", state: "Uttarakhand", lat: 29.3919, lon: 79.4542 },
    { name: "Chamoli Alaknanda Basin", state: "Uttarakhand", lat: 30.4225, lon: 79.3308 },
    { name: "Darjeeling Valley", state: "West Bengal", lat: 27.0410, lon: 88.2663 },
    { name: "Kalimpong Incline", state: "West Bengal", lat: 27.0667, lon: 88.4667 },
    { name: "Gangtok Hillside", state: "Sikkim", lat: 27.3389, lon: 88.6065 },
    { name: "Shillong Plateau", state: "Meghalaya", lat: 25.5788, lon: 91.8933 },
    { name: "Cherrapunji Gorge", state: "Meghalaya", lat: 25.2986, lon: 91.7300 },
    { name: "Coorg Western Ghats", state: "Karnataka", lat: 12.4244, lon: 75.7382 },
    { name: "Nilgiris (Ooty) Slopes", state: "Tamil Nadu", lat: 11.4102, lon: 76.6950 },
    { name: "Kodaikanal Basin", state: "Tamil Nadu", lat: 10.2381, lon: 77.4892 },
    { name: "Mahabaleshwar Ghats", state: "Maharashtra", lat: 17.9237, lon: 73.6586 },
    { name: "Lonavala Khandala Ghats", state: "Maharashtra", lat: 18.7557, lon: 73.4091 },
    { name: "Ramban NH44 Corridor", state: "Jammu & Kashmir", lat: 33.2435, lon: 75.2415 },
    { name: "Rishikesh Himalayan Gateway", state: "Uttarakhand", lat: 30.0869, lon: 78.2676 },
    { name: "Dehradun Foothills", state: "Uttarakhand", lat: 30.3165, lon: 78.0322 },
    { name: "Pune Western Hills", state: "Maharashtra", lat: 18.5204, lon: 73.8567 }
];

// ================= INITIALIZATION =================
document.addEventListener('DOMContentLoaded', async () => {
    initClock();
    initLeafletMap();
    initHistoryChart();
    setupEventListeners();
    setupSearchListeners();
    
    // Fetch initial backend endpoints
    await loadLocations();
    await loadScenarios();
    await updateSearchDbCount();
    
    // Load default Wayanad scenario for immediate high-impact presentation
    loadScenario('monsoon_catastrophe');
});

// System Clock
function initClock() {
    const clockEl = document.getElementById('systemClock');
    function update() {
        const now = new Date();
        clockEl.textContent = now.toUTCString().slice(17, 25) + ' UTC | LIVE';
    }
    update();
    setInterval(update, 1000);
}

// ================= LEAFLET MAP =================
function initLeafletMap() {
    map = L.map('leafletMap', {
        center: [20.5937, 78.9629], // Center of India
        zoom: 5,
        zoomControl: false
    });

    L.control.zoom({ position: 'bottomleft' }).addTo(map);

    // Default to OpenStreetMap Clear Street / Topo layer for high readability
    currentTileLayer = L.tileLayer(TILES.street.url, {
        attribution: TILES.street.attribution,
        maxZoom: 19
    }).addTo(map);
}

function setMapLayer(type) {
    document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
    
    if (type === 'street') {
        document.getElementById('btnLayerStreet').classList.add('active');
        map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer(TILES.street.url, { maxZoom: 19 }).addTo(map);
    } else if (type === 'satellite') {
        document.getElementById('btnLayerSat').classList.add('active');
        map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer(TILES.satellite.url, { maxZoom: 18 }).addTo(map);
    } else {
        document.getElementById('btnLayerDark').classList.add('active');
        map.removeLayer(currentTileLayer);
        currentTileLayer = L.tileLayer(TILES.dark.url, { maxZoom: 18 }).addTo(map);
    }
}

// ================= LOCATIONS & MARKERS =================
async function loadLocations() {
    try {
        const res = await fetch('/api/locations');
        const data = await res.json();
        if (!data.success) return;

        allLocations = data.locations;
        renderMapMarkers(allLocations);
        populateZoneSelect(allLocations);
        renderSectorChips(allLocations);
    } catch (err) {
        console.error('Failed to load locations from backend:', err);
    }
}

function renderMapMarkers(locations) {
    // Clear previous markers
    Object.values(locationMarkers).forEach(m => map.removeLayer(m));
    locationMarkers = {};

    locations.forEach(loc => {
        const colorClass = loc.current_risk_level === 'HIGH' ? 'marker-high' :
                           loc.current_risk_level === 'MODERATE' ? 'marker-moderate' : 'marker-low';
        
        const riskIcon = loc.current_risk_level === 'HIGH' ? '!' : 
                         loc.current_risk_level === 'MODERATE' ? '▲' : '●';

        const customIcon = L.divIcon({
            className: `custom-risk-marker ${colorClass}`,
            html: `<span>${riskIcon}</span>`,
            iconSize: [26, 26],
            iconAnchor: [13, 13]
        });

        const marker = L.marker([loc.latitude, loc.longitude], { icon: customIcon }).addTo(map);

        // Circular danger buffer for High risk zones
        if (loc.current_risk_level === 'HIGH') {
            L.circle([loc.latitude, loc.longitude], {
                color: '#ef4444',
                fillColor: '#ef4444',
                fillOpacity: 0.18,
                radius: 20000
            }).addTo(map);
        }

        const riskColor = loc.current_risk_level === 'HIGH' ? '#ef4444' : (loc.current_risk_level === 'MODERATE' ? '#f59e0b' : '#10b981');
        const popupContent = `
            <div class="popup-card">
                <div class="popup-title">${loc.name}</div>
                <div class="popup-stat">Region: <strong>${loc.state_region}</strong></div>
                <div class="popup-stat">Rainfall: <strong>${loc.current_rainfall_mm} mm</strong></div>
                <div class="popup-stat">Slope: <strong>${loc.slope_deg}°</strong> | Elev: <strong>${loc.elevation_m}m</strong></div>
                <div class="popup-stat">Risk: <strong style="color:${riskColor}">${loc.current_risk_score}% (${loc.current_risk_level})</strong></div>
                <button class="popup-btn" onclick="selectLocationById(${loc.id})">Inspect & Simulate</button>
            </div>
        `;
        marker.bindPopup(popupContent);
        locationMarkers[loc.id] = marker;
    });
}

function populateZoneSelect(locations) {
    const select = document.getElementById('zoneSelect');
    select.innerHTML = '<option value="">-- Custom Simulation / Select Monitored Zone --</option>';
    locations.forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc.id;
        opt.textContent = `${loc.name} (${loc.current_risk_level} - ${loc.current_risk_score}%)`;
        select.appendChild(opt);
    });
}

function renderSectorChips(locations) {
    const strip = document.getElementById('sectorSummaryStrip');
    strip.innerHTML = '';
    locations.forEach(loc => {
        const chip = document.createElement('div');
        const rClass = loc.current_risk_level.toLowerCase();
        chip.className = `sector-chip ${rClass}`;
        chip.innerHTML = `
            <span>${loc.name.split(' ')[0]}</span>
            <strong>${loc.current_risk_score}%</strong>
        `;
        chip.onclick = () => selectLocationById(loc.id);
        strip.appendChild(chip);
    });
}

function selectLocationById(locId) {
    const loc = allLocations.find(l => l.id == locId);
    if (!loc) return;

    activeLocationId = loc.id;
    document.getElementById('zoneSelect').value = loc.id;
    document.getElementById('satModalZone').textContent = loc.name;

    // Populate form inputs
    document.getElementById('rainfallInput').value = loc.current_rainfall_mm;
    document.getElementById('rainfallVal').textContent = `${loc.current_rainfall_mm} mm`;

    document.getElementById('slopeInput').value = loc.slope_deg;
    document.getElementById('slopeVal').textContent = `${loc.slope_deg}°`;

    document.getElementById('soilMoistureInput').value = loc.current_soil_moisture_pct;
    document.getElementById('soilMoistureVal').textContent = `${loc.soil_moisture_pct || loc.current_soil_moisture_pct}%`;

    document.getElementById('elevationInput').value = loc.elevation_m;
    document.getElementById('historicalEventsInput').value = loc.historical_events;
    document.getElementById('landCoverSelect').value = loc.land_cover;

    updateSliderFill(document.getElementById('rainfallInput'));
    updateSliderFill(document.getElementById('slopeInput'));
    updateSliderFill(document.getElementById('soilMoistureInput'));

    // Pan map to location with clear view
    map.flyTo([loc.latitude, loc.longitude], 10, { duration: 1.2 });
    if (locationMarkers[loc.id]) {
        locationMarkers[loc.id].openPopup();
    }

    // Run AI prediction & update history
    runPrediction();
    loadHistory(loc.id);
}

// ================= ALL-INDIA LOCATION SEARCH & DB =================
function setupSearchListeners() {
    const searchInput = document.getElementById('indiaSearchInput');
    const suggestionsBox = document.getElementById('searchSuggestions');
    const clearBtn = document.getElementById('btnClearSearch');

    searchInput.addEventListener('input', (e) => {
        const val = e.target.value.trim().toLowerCase();
        clearBtn.classList.toggle('hidden', val.length === 0);

        if (val.length < 2) {
            suggestionsBox.classList.add('hidden');
            return;
        }

        const matches = QUICK_SUGGESTIONS.filter(item => 
            item.name.toLowerCase().includes(val) || 
            item.state.toLowerCase().includes(val)
        ).slice(0, 6);

        if (matches.length > 0) {
            suggestionsBox.innerHTML = matches.map(m => `
                <div class="search-suggestion-item" onclick="selectSuggestion('${m.name}')">
                    <span class="suggestion-name"><i class="fa-solid fa-location-dot text-cyan"></i> ${m.name}</span>
                    <span class="suggestion-state">${m.state}</span>
                </div>
            `).join('');
            suggestionsBox.classList.remove('hidden');
        } else {
            suggestionsBox.classList.add('hidden');
        }
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            suggestionsBox.classList.add('hidden');
            handleIndiaSearch();
        }
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-input-wrap')) {
            suggestionsBox.classList.add('hidden');
        }
    });
}

function clearSearchInput() {
    const input = document.getElementById('indiaSearchInput');
    input.value = '';
    document.getElementById('btnClearSearch').classList.add('hidden');
    document.getElementById('searchSuggestions').classList.add('hidden');
}

function selectSuggestion(name) {
    document.getElementById('indiaSearchInput').value = name;
    document.getElementById('searchSuggestions').classList.add('hidden');
    handleIndiaSearch();
}

async function handleIndiaSearch() {
    const query = document.getElementById('indiaSearchInput').value.trim();
    if (!query) {
        alert("Please enter an Indian city, district, or hill station to search.");
        return;
    }

    const searchBtn = document.getElementById('btnSearchIndia');
    const origText = searchBtn.innerHTML;
    searchBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Locating...';
    searchBtn.disabled = true;

    try {
        const res = await fetch('/api/search-location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: query })
        });
        const data = await res.json();

        if (data.success && data.location) {
            const loc = data.location;

            // Remove prior search marker
            if (searchMarker) map.removeLayer(searchMarker);

            // Create distinctive search pin
            const searchIcon = L.divIcon({
                className: 'search-marker-pin',
                html: '<i class="fa-solid fa-location-crosshairs"></i>',
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            searchMarker = L.marker([loc.latitude, loc.longitude], { icon: searchIcon }).addTo(map);

            const riskColor = data.risk_level === 'HIGH' ? '#ef4444' : (data.risk_level === 'MODERATE' ? '#f59e0b' : '#10b981');
            const popupHtml = `
                <div class="popup-card">
                    <div class="popup-title">🔍 ${loc.name}</div>
                    <div class="popup-stat">State: <strong>${loc.state_region}</strong></div>
                    <div class="popup-stat">Coords: <strong>${loc.latitude.toFixed(3)}°N, ${loc.longitude.toFixed(3)}°E</strong></div>
                    <div class="popup-stat">Terrain Slope: <strong>${loc.slope_deg}°</strong> | Elevation: <strong>${loc.elevation_m}m</strong></div>
                    <div class="popup-stat">Rainfall: <strong>${loc.rainfall_mm} mm</strong> | Moisture: <strong>${loc.soil_moisture_pct}%</strong></div>
                    <div class="popup-stat">AI Landslide Risk: <strong style="color:${riskColor}; font-size:12px">${data.risk_score}% (${data.risk_level})</strong></div>
                    <div style="font-size:10px; color:#38bdf8; margin-top:3px">✓ Saved to SQLite Registry</div>
                </div>
            `;
            searchMarker.bindPopup(popupHtml).openPopup();

            // Smoothly fly map to coordinates with clear zoom
            map.flyTo([loc.latitude, loc.longitude], 11, { duration: 1.5 });

            // Populate form sliders
            document.getElementById('rainfallInput').value = loc.rainfall_mm;
            document.getElementById('rainfallVal').textContent = `${loc.rainfall_mm} mm`;

            document.getElementById('slopeInput').value = loc.slope_deg;
            document.getElementById('slopeVal').textContent = `${loc.slope_deg}°`;

            document.getElementById('soilMoistureInput').value = loc.soil_moisture_pct;
            document.getElementById('soilMoistureVal').textContent = `${loc.soil_moisture_pct}%`;

            document.getElementById('elevationInput').value = loc.elevation_m;
            document.getElementById('historicalEventsInput').value = loc.historical_events;
            document.getElementById('landCoverSelect').value = loc.land_cover;

            updateSliderFill(document.getElementById('rainfallInput'));
            updateSliderFill(document.getElementById('slopeInput'));
            updateSliderFill(document.getElementById('soilMoistureInput'));

            // Update modal zone text
            document.getElementById('satModalZone').textContent = loc.name;

            // Update UI with this prediction
            latestPredictionData = data;
            updateDashboardWithPrediction(data);

            // Update database count badge
            await updateSearchDbCount();
        } else {
            alert(`Location "${query}" could not be pinpointed in India. Please try another area.`);
        }
    } catch (err) {
        console.error('Search error:', err);
        alert('Network error while searching for location.');
    } finally {
        searchBtn.innerHTML = origText;
        searchBtn.disabled = false;
    }
}

async function updateSearchDbCount() {
    try {
        const res = await fetch('/api/searched-locations');
        const data = await res.json();
        if (data.success) {
            const countEl = document.getElementById('searchDbCount');
            if (countEl) countEl.textContent = data.count;
        }
    } catch (e) {
        console.error('Count update error:', e);
    }
}

async function openSearchDbModal() {
    const modal = document.getElementById('searchDbModal');
    modal.classList.remove('hidden');

    const tableBody = document.getElementById('searchDbTableBody');
    tableBody.innerHTML = '<tr><td colspan="9" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Querying SQLite Registry...</td></tr>';

    try {
        const res = await fetch('/api/searched-locations');
        const data = await res.json();

        if (data.success && data.searched_locations.length > 0) {
            tableBody.innerHTML = data.searched_locations.map(row => {
                const rClass = row.risk_level.toLowerCase();
                return `
                    <tr>
                        <td><strong>${row.id}</strong></td>
                        <td><strong>${row.name}</strong> <span style="font-size:10px; color:#64748b">(${row.query})</span></td>
                        <td>${row.state_region}</td>
                        <td>${parseFloat(row.latitude).toFixed(3)}°, ${parseFloat(row.longitude).toFixed(3)}°</td>
                        <td>${row.elevation_m}m | ${row.slope_deg}°</td>
                        <td>${row.rainfall_mm}mm | ${row.soil_moisture_pct}%</td>
                        <td><span class="table-risk-pill ${rClass}">${row.risk_score}% ${row.risk_level}</span></td>
                        <td style="font-size:10px; color:#94a3b8">${row.timestamp}</td>
                        <td>
                            <button class="btn-inspect-table" onclick="inspectDbLocation(${row.latitude}, ${row.longitude}, '${row.name.replace(/'/g, "\\'")}', ${row.rainfall_mm}, ${row.slope_deg}, ${row.elevation_m}, ${row.soil_moisture_pct}, '${row.land_cover}', ${row.historical_events}, ${row.risk_score}, '${row.risk_level}')">
                                <i class="fa-solid fa-crosshairs"></i> View
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-muted">No areas searched yet. Use the search bar above the map to look up any area in India!</td></tr>';
        }
    } catch (err) {
        tableBody.innerHTML = '<tr><td colspan="9" class="text-center text-crimson">Error loading search records from database.</td></tr>';
    }
}

function closeSearchDbModal() {
    document.getElementById('searchDbModal').classList.add('hidden');
}

function inspectDbLocation(lat, lon, name, rain, slope, elev, moist, cover, prior, score, level) {
    closeSearchDbModal();

    // Populate inputs
    document.getElementById('rainfallInput').value = rain;
    document.getElementById('rainfallVal').textContent = `${rain} mm`;

    document.getElementById('slopeInput').value = slope;
    document.getElementById('slopeVal').textContent = `${slope}°`;

    document.getElementById('soilMoistureInput').value = moist;
    document.getElementById('soilMoistureVal').textContent = `${moist}%`;

    document.getElementById('elevationInput').value = elev;
    document.getElementById('historicalEventsInput').value = prior;
    document.getElementById('landCoverSelect').value = cover;

    updateSliderFill(document.getElementById('rainfallInput'));
    updateSliderFill(document.getElementById('slopeInput'));
    updateSliderFill(document.getElementById('soilMoistureInput'));

    // Fly to position
    map.flyTo([lat, lon], 11, { duration: 1.5 });

    if (searchMarker) map.removeLayer(searchMarker);
    const searchIcon = L.divIcon({
        className: 'search-marker-pin',
        html: '<i class="fa-solid fa-location-crosshairs"></i>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
    });
    searchMarker = L.marker([lat, lon], { icon: searchIcon }).addTo(map);
    searchMarker.bindPopup(`
        <div class="popup-card">
            <div class="popup-title">🔍 ${name}</div>
            <div class="popup-stat">Rainfall: <strong>${rain} mm</strong> | Slope: <strong>${slope}°</strong></div>
            <div class="popup-stat">AI Risk Score: <strong style="color:${level === 'HIGH' ? '#ef4444' : '#10b981'}">${score}% (${level})</strong></div>
        </div>
    `).openPopup();

    runPrediction();
}

async function clearSearchHistory() {
    if (!confirm("Are you sure you want to clear the searched locations database?")) return;
    try {
        await fetch('/api/clear-search-history', { method: 'POST' });
        await openSearchDbModal();
        await updateSearchDbCount();
    } catch (e) {
        alert("Failed to clear database.");
    }
}

// ================= HACKATHON DEMO SCENARIOS =================
async function loadScenarios() {
    try {
        const res = await fetch('/api/scenarios');
        const data = await res.json();
        if (data.success) {
            allScenarios = data.scenarios;
        }
    } catch (err) {
        console.error('Error fetching scenarios:', err);
    }
}

function loadScenario(scenarioId) {
    const scenario = allScenarios.find(s => s.id === scenarioId) || {
        params: {
            rainfall_mm: 195.0,
            slope_deg: 41.5,
            elevation_m: 1050,
            soil_moisture_pct: 89.2,
            land_cover: "Barren",
            historical_events: 5,
            location_id: 1
        }
    };

    // Highlight active scenario button
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        if (btn.getAttribute('onclick').includes(scenarioId)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const p = scenario.params;
    document.getElementById('rainfallInput').value = p.rainfall_mm;
    document.getElementById('rainfallVal').textContent = `${p.rainfall_mm} mm`;

    document.getElementById('slopeInput').value = p.slope_deg;
    document.getElementById('slopeVal').textContent = `${p.slope_deg}°`;

    document.getElementById('soilMoistureInput').value = p.soil_moisture_pct;
    document.getElementById('soilMoistureVal').textContent = `${p.soil_moisture_pct}%`;

    document.getElementById('elevationInput').value = p.elevation_m;
    document.getElementById('historicalEventsInput').value = p.historical_events;
    document.getElementById('landCoverSelect').value = p.land_cover;

    updateSliderFill(document.getElementById('rainfallInput'));
    updateSliderFill(document.getElementById('slopeInput'));
    updateSliderFill(document.getElementById('soilMoistureInput'));

    if (p.location_id) {
        activeLocationId = p.location_id;
        document.getElementById('zoneSelect').value = p.location_id;
        const loc = allLocations.find(l => l.id == p.location_id);
        if (loc) {
            document.getElementById('satModalZone').textContent = loc.name;
            map.flyTo([loc.latitude, loc.longitude], 10, { duration: 1.2 });
            if (locationMarkers[loc.id]) {
                locationMarkers[loc.id].openPopup();
            }
        }
        loadHistory(p.location_id);
    }

    runPrediction();
}

// ================= PREDICTION & AI INFERENCE =================
async function runPrediction() {
    const btn = document.getElementById('btnRunPrediction');
    const origText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
    btn.disabled = true;

    const payload = {
        rainfall_mm: parseFloat(document.getElementById('rainfallInput').value),
        slope_deg: parseFloat(document.getElementById('slopeInput').value),
        elevation_m: parseFloat(document.getElementById('elevationInput').value),
        soil_moisture_pct: parseFloat(document.getElementById('soilMoistureInput').value),
        land_cover: document.getElementById('landCoverSelect').value,
        historical_events: parseInt(document.getElementById('historicalEventsInput').value),
        location_id: activeLocationId
    };

    try {
        const res = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            latestPredictionData = data;
            updateDashboardWithPrediction(data);
        }
    } catch (err) {
        console.error('Prediction request failed:', err);
    } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
    }
}

function updateDashboardWithPrediction(data) {
    const score = data.risk_score;
    const level = data.risk_level;
    const locName = allLocations.find(l => l.id == activeLocationId)?.name || 'Monitored Sector';

    // 1. Update KPI Strip (Step 10)
    document.getElementById('kpiRainfall').textContent = `${data.inputs.rainfall_mm} mm`;
    document.getElementById('kpiSlope').textContent = `${data.inputs.slope_deg}°`;
    document.getElementById('kpiSoilMoisture').textContent = `${data.inputs.soil_moisture_pct}%`;
    document.getElementById('kpiElevation').textContent = `${data.inputs.elevation_m} m`;
    document.getElementById('kpiRiskScore').textContent = `${Math.round(score)}%`;

    const kpiBadge = document.getElementById('kpiRiskBadge');
    const kpiRiskBox = document.getElementById('kpiRiskBox');
    if (level === 'HIGH') {
        kpiBadge.className = 'kpi-badge red';
        kpiBadge.textContent = '🔴 HIGH';
        kpiRiskBox.style.borderLeftColor = '#ef4444';
        kpiRiskBox.style.background = 'rgba(239, 68, 68, 0.1)';
    } else if (level === 'MODERATE') {
        kpiBadge.className = 'kpi-badge yellow';
        kpiBadge.textContent = '🟡 MODERATE';
        kpiRiskBox.style.borderLeftColor = '#f59e0b';
        kpiRiskBox.style.background = 'rgba(245, 158, 11, 0.1)';
    } else {
        kpiBadge.className = 'kpi-badge green';
        kpiBadge.textContent = '🟢 LOW';
        kpiRiskBox.style.borderLeftColor = '#10b981';
        kpiRiskBox.style.background = 'rgba(16, 185, 129, 0.1)';
    }

    // 2. Update Radial Gauge
    const gaugeBar = document.getElementById('gaugeBar');
    const circumference = 2 * Math.PI * 68;
    const offset = circumference - (score / 100) * circumference;
    gaugeBar.style.strokeDashoffset = offset;

    const scoreNum = document.getElementById('riskScoreNum');
    scoreNum.textContent = `${Math.round(score)}%`;

    const riskBadge = document.getElementById('riskBadge');
    const categoryBadge = document.getElementById('riskCategoryBadge');
    const dispStatus = document.getElementById('dispStatus');
    const dispZone = document.getElementById('dispZone');
    dispZone.textContent = locName;

    if (level === 'HIGH') {
        gaugeBar.style.stroke = '#ef4444';
        scoreNum.style.color = '#ef4444';
        riskBadge.textContent = 'HIGH RISK';
        riskBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        riskBadge.style.color = '#ef4444';
        categoryBadge.className = 'hero-val-badge high';
        categoryBadge.textContent = '🔴 HIGH HAZARD';
        dispStatus.textContent = 'CRITICAL ALERT ACTIVE';
        dispStatus.style.color = '#ef4444';

        showEmergencyBanner(data, locName);
        if (voiceAlertEnabled) speakAlert(`Warning: High Landslide Risk detected in ${locName.split('(')[0]}. Score is ${Math.round(score)} percent.`);

    } else if (level === 'MODERATE') {
        gaugeBar.style.stroke = '#f59e0b';
        scoreNum.style.color = '#f59e0b';
        riskBadge.textContent = 'MODERATE RISK';
        riskBadge.style.background = 'rgba(245, 158, 11, 0.2)';
        riskBadge.style.color = '#f59e0b';
        categoryBadge.className = 'hero-val-badge moderate';
        categoryBadge.textContent = '🟡 WATCH / ELEVATED';
        dispStatus.textContent = 'HEIGHTENED WATCH';
        dispStatus.style.color = '#f59e0b';
        dismissBanner();
    } else {
        gaugeBar.style.stroke = '#10b981';
        scoreNum.style.color = '#10b981';
        riskBadge.textContent = 'LOW RISK';
        riskBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        riskBadge.style.color = '#10b981';
        categoryBadge.className = 'hero-val-badge low';
        categoryBadge.textContent = '🟢 STABLE / SAFE';
        dispStatus.textContent = 'NORMAL TELEMETRY';
        dispStatus.style.color = '#10b981';
        dismissBanner();
    }

    // 3. Explainable AI Factors
    const factorsList = document.getElementById('factorsList');
    factorsList.innerHTML = '';
    data.contributing_factors.forEach(f => {
        const item = document.createElement('div');
        item.className = `factor-item ${f.impact.toLowerCase()}`;
        const icon = f.direction === 'up' ? '<i class="fa-solid fa-circle-arrow-up text-crimson"></i>' :
                     (f.direction === 'down' ? '<i class="fa-solid fa-circle-arrow-down text-cyan"></i>' :
                     '<i class="fa-solid fa-circle-dot text-orange"></i>');
        item.innerHTML = `
            ${icon}
            <div class="factor-text">
                <strong>${f.factor}</strong>
                <span>${f.description}</span>
            </div>
        `;
        factorsList.appendChild(item);
    });

    // 4. Decision Support Advisory
    const advCard = document.getElementById('advisoryCard');
    const advHeadline = document.getElementById('advisoryHeadline');
    const advList = document.getElementById('advisoryList');

    advHeadline.textContent = data.advisory.headline;
    advList.innerHTML = '';
    data.advisory.bullet_points.forEach(bp => {
        const li = document.createElement('li');
        li.textContent = bp;
        advList.appendChild(li);
    });

    advCard.style.borderLeftColor = level === 'HIGH' ? '#ef4444' : (level === 'MODERATE' ? '#f59e0b' : '#10b981');
}

// ================= EMERGENCY WARNING BANNER =================
function showEmergencyBanner(data, locName) {
    const banner = document.getElementById('alertBanner');
    document.getElementById('alertLocationName').textContent = `Sector: ${locName}`;
    document.getElementById('alertHeadline').textContent = `⚠️ HIGH LANDSLIDE SUSCEPTIBILITY DETECTED (${data.risk_score}%)`;
    document.getElementById('alertSummary').textContent = 
        `Heavy rainfall (${data.inputs.rainfall_mm}mm) + steep slope (${data.inputs.slope_deg}°) + soil saturation (${data.inputs.soil_moisture_pct}%) detected. Authorities should monitor the region.`;
    banner.classList.remove('hidden');

    document.getElementById('modalAlertLoc').textContent = locName;
}

function dismissBanner() {
    document.getElementById('alertBanner').classList.add('hidden');
}

// ================= VOICE SYNTHESIS ALERT =================
function speakAlert(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
    }
}

function toggleVoiceAlert() {
    voiceAlertEnabled = !voiceAlertEnabled;
    const btn = document.getElementById('voiceAlertToggle');
    btn.innerHTML = voiceAlertEnabled ? 
        '<i class="fa-solid fa-bullhorn text-cyan"></i>' : 
        '<i class="fa-solid fa-bullhorn text-crimson" style="opacity:0.4"></i>';
}

// ================= CHART.JS & STEP 13 DAY PROGRESSION =================
function initHistoryChart() {
    const ctx = document.getElementById('historyChart').getContext('2d');
    historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'],
            datasets: [
                {
                    label: 'Landslide Risk (%)',
                    data: [32, 42, 54, 68, 79, 86, 92],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    borderWidth: 2.2,
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: '#ef4444',
                    pointRadius: 3,
                    yAxisID: 'yRisk'
                },
                {
                    label: 'Rainfall (mm)',
                    data: [35, 52, 80, 115, 150, 178, 195],
                    borderColor: '#06b6d4',
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                    pointRadius: 0,
                    yAxisID: 'yRain'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    display: true,
                    labels: { color: '#94a3b8', font: { size: 9 }, boxWidth: 8 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#64748b', font: { size: 9 } }
                },
                yRisk: {
                    type: 'linear',
                    position: 'left',
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    ticks: { color: '#ef4444', font: { size: 8 }, callback: val => `${val}%` }
                },
                yRain: {
                    type: 'linear',
                    position: 'right',
                    min: 0,
                    max: 250,
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#06b6d4', font: { size: 8 }, callback: val => `${val}mm` }
                }
            }
        }
    });
}

async function loadHistory(locId) {
    try {
        const res = await fetch(`/api/history/${locId}`);
        const data = await res.json();
        if (!data.success) return;

        document.getElementById('trendLocationTitle').textContent = data.location.name;

        const labels = data.history.map(h => h.day_label);
        const riskScores = data.history.map(h => h.risk_score);
        const rainfallVals = data.history.map(h => h.rainfall_mm);

        historyChart.data.labels = labels;
        historyChart.data.datasets[0].data = riskScores;
        historyChart.data.datasets[1].data = rainfallVals;

        const firstScore = riskScores[0];
        const lastScore = riskScores[riskScores.length - 1];
        const diff = Math.round(lastScore - firstScore);
        const trendBadge = document.getElementById('trendBadge');

        if (diff > 0) {
            trendBadge.textContent = `▲ +${diff}% Escalation`;
            trendBadge.style.color = '#ef4444';
            trendBadge.style.background = 'rgba(239, 68, 68, 0.15)';
        } else {
            trendBadge.textContent = `▼ ${diff}% Stable`;
            trendBadge.style.color = '#10b981';
            trendBadge.style.background = 'rgba(16, 185, 129, 0.15)';
        }

        const isHigh = lastScore >= 70;
        const isMod = lastScore >= 40 && !isHigh;
        const color = isHigh ? '#ef4444' : (isMod ? '#f59e0b' : '#10b981');
        const bgColor = isHigh ? 'rgba(239, 68, 68, 0.15)' : (isMod ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)');

        historyChart.data.datasets[0].borderColor = color;
        historyChart.data.datasets[0].pointBackgroundColor = color;
        historyChart.data.datasets[0].backgroundColor = bgColor;

        historyChart.update();
        renderDayProgressionStrip(data.history);

    } catch (err) {
        console.error('Failed to load history from backend:', err);
    }
}

function renderDayProgressionStrip(historyList) {
    const strip = document.getElementById('dayProgressionStrip');
    strip.innerHTML = '';

    historyList.forEach((h, index) => {
        const card = document.createElement('div');
        const isToday = index === historyList.length - 1;
        card.className = `day-card ${isToday ? 'today' : ''}`;

        const dot = h.risk_score >= 70 ? '🔴' : (h.risk_score >= 40 ? '🟡' : '🟢');
        const scoreColor = h.risk_score >= 70 ? '#ef4444' : (h.risk_score >= 40 ? '#f59e0b' : '#10b981');

        card.innerHTML = `
            <span class="day-name">${h.day_label}</span>
            <span class="day-score" style="color:${scoreColor}">${Math.round(h.risk_score)}%</span>
            <span class="day-dot">${dot}</span>
        `;
        strip.appendChild(card);
    });
}

// ================= MODALS & ACTIONS =================
function openSatelliteModal() {
    document.getElementById('satelliteModal').classList.remove('hidden');
}

function closeSatelliteModal() {
    document.getElementById('satelliteModal').classList.add('hidden');
}

function openEmergencyModal() {
    document.getElementById('emergencyModal').classList.remove('hidden');
}

function closeEmergencyModal() {
    document.getElementById('emergencyModal').classList.add('hidden');
}

function exportIncidentReport() {
    if (!latestPredictionData) return;
    const locName = allLocations.find(l => l.id == activeLocationId)?.name || 'Monitored Sector';
    const reportText = `=====================================================
LANDSLIDEGUARD AI - EARLY WARNING INCIDENT ADVISORY
=====================================================
Generated: ${new Date().toUTCString()}
Monitored Sector: ${locName}
Landslide Susceptibility Score: ${latestPredictionData.risk_score}%
Hazard Band: ${latestPredictionData.risk_level}

METEOROLOGICAL & GEOTECHNICAL TELEMETRY:
- Rainfall (24-48h): ${latestPredictionData.inputs.rainfall_mm} mm
- Slope Angle: ${latestPredictionData.inputs.slope_deg} degrees
- Soil Moisture Saturation: ${latestPredictionData.inputs.soil_moisture_pct}%
- Elevation: ${latestPredictionData.inputs.elevation_m} meters
- Land Cover: ${latestPredictionData.inputs.land_cover}
- Historical Events: ${latestPredictionData.inputs.historical_events}

DECISION SUPPORT ADVISORY:
${latestPredictionData.advisory.headline}
Actions Required:
${latestPredictionData.advisory.bullet_points.map(bp => "- " + bp).join('\n')}

PHYSICAL DRIVERS (EXPLAINABLE AI):
${latestPredictionData.contributing_factors.map(f => "- " + f.factor + " [" + f.impact + "]: " + f.description).join('\n')}
=====================================================
National Hackathon Prototype - Decision Support Framework
=====================================================`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `LandslideGuard_Advisory_${locName.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ================= SATELLITE SPLIT SLIDER =================
function updateSplitSlider(val) {
    const beforeLayer = document.getElementById('beforeLayer');
    const dividerLine = document.getElementById('splitDividerLine');
    if (beforeLayer) beforeLayer.style.width = `${val}%`;
    if (dividerLine) dividerLine.style.left = `${val}%`;
}

// ================= FORM CONTROLS & EVENT LISTENERS =================
function setupEventListeners() {
    const rainSlider = document.getElementById('rainfallInput');
    const rainVal = document.getElementById('rainfallVal');
    rainSlider.addEventListener('input', (e) => {
        rainVal.textContent = `${e.target.value} mm`;
        updateSliderFill(rainSlider);
    });

    const slopeSlider = document.getElementById('slopeInput');
    const slopeVal = document.getElementById('slopeVal');
    slopeSlider.addEventListener('input', (e) => {
        slopeVal.textContent = `${e.target.value}°`;
        updateSliderFill(slopeSlider);
    });

    const moistSlider = document.getElementById('soilMoistureInput');
    const moistVal = document.getElementById('soilMoistureVal');
    moistSlider.addEventListener('input', (e) => {
        moistVal.textContent = `${e.target.value}%`;
        updateSliderFill(moistSlider);
    });

    // Initialize fills
    updateSliderFill(rainSlider);
    updateSliderFill(slopeSlider);
    updateSliderFill(moistSlider);

    document.getElementById('predictionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        runPrediction();
    });

    document.getElementById('zoneSelect').addEventListener('change', (e) => {
        if (e.target.value) {
            selectLocationById(e.target.value);
        }
    });

    document.getElementById('btnResetTelemetry').addEventListener('click', () => {
        loadScenario('stable_forested');
    });
}

function updateSliderFill(slider) {
    if (!slider) return;
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const pct = ((val - min) / (max - min)) * 100;
    
    // Smooth gradient fill from Cyan to Amber to Crimson
    slider.style.background = `linear-gradient(to right, #06b6d4 0%, #f59e0b ${Math.max(0, pct - 15)}%, #ef4444 ${pct}%, #1e293b ${pct}%, #1e293b 100%)`;
}
