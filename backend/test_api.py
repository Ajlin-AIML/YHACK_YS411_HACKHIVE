"""
Test suite for LandslideGuard AI Flask Backend & ML Engine
"""

import json
from app import app

def run_tests():
    client = app.test_client()
    print("[Testing] Commencing Backend Test Suite...\n")

    # Test 0: Web Dashboard HTML Route
    res = client.get("/")
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    assert b"LandslideGuard" in res.data, "Expected LandslideGuard title in response"
    print("[PASS] Test 0: Web Dashboard Route -> Serves HTML Successfully")

    # Test 1: High Risk Prediction
    high_risk_payload = {
        "rainfall_mm": 210.0,
        "slope_deg": 44.0,
        "elevation_m": 1100,
        "soil_moisture_pct": 92.0,
        "land_cover": "Barren",
        "historical_events": 5,
        "location_id": 1
    }
    res = client.post("/api/predict", json=high_risk_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.get_json()
    assert data["success"] is True
    print(f"[PASS] Test 1: High Risk Scenario -> Score: {data['risk_score']}%, Level: {data['risk_level']}")
    assert data["risk_level"] == "HIGH", f"Expected HIGH, got {data['risk_level']}"
    assert len(data["contributing_factors"]) > 0

    # Test 2: Low Risk Prediction
    low_risk_payload = {
        "rainfall_mm": 10.0,
        "slope_deg": 5.0,
        "elevation_m": 250,
        "soil_moisture_pct": 20.0,
        "land_cover": "Urban",
        "historical_events": 0
    }
    res = client.post("/api/predict", json=low_risk_payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    print(f"[PASS] Test 2: Low Risk Scenario  -> Score: {data['risk_score']}%, Level: {data['risk_level']}")
    assert data["risk_level"] == "LOW", f"Expected LOW, got {data['risk_level']}"

    # Test 3: Locations Endpoint
    res = client.get("/api/locations")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["locations"]) >= 5
    print(f"[PASS] Test 3: Locations API     -> Found {len(data['locations'])} monitored stations")

    # Test 4: Historical 7-Day Trend
    res = client.get("/api/history/1")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["history"]) == 7
    print(f"[PASS] Test 4: 7-Day History API -> Loaded {len(data['history'])} time-series readings for {data['location']['name']}")

    # Test 5: Early Warning Alerts
    res = client.get("/api/alerts")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["alerts"]) >= 1
    print(f"[PASS] Test 5: Alert System API  -> Loaded {len(data['alerts'])} active emergency alerts")

    # Test 6: Scenarios API
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    data = res.get_json()
    assert len(data["scenarios"]) >= 3
    print(f"[PASS] Test 6: Demo Scenarios    -> Loaded {len(data['scenarios'])} 1-click scenarios")

    # Test 7: Model Info API
    res = client.get("/api/model-info")
    assert res.status_code == 200
    data = res.get_json()
    metrics = data["metrics"]
    print(f"[PASS] Test 7: Model Diagnostics -> Accuracy: {metrics['accuracy']*100:.1f}%, Recall: {metrics['recall']*100:.1f}%")

    # Test 8: All-India Search API
    res = client.post("/api/search-location", json={"query": "Kedarnath"})
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert "Kedarnath" in data["location"]["name"]
    print(f"[PASS] Test 8: India Search API   -> Located {data['location']['name']} (Risk: {data['risk_score']}%)")

    # Test 9: Searched Areas Registry in SQLite
    res = client.get("/api/searched-locations")
    assert res.status_code == 200
    data = res.get_json()
    assert data["count"] >= 1
    print(f"[PASS] Test 9: Search Database     -> Recorded {data['count']} searched areas in SQLite registry")

    # Test 10: Export CSV
    res = client.get("/api/export-searched-locations")
    assert res.status_code == 200
    assert b"Location Name" in res.data
    print(f"[PASS] Test 10: Export CSV API   -> Generated downloadable CSV registry ({len(res.data)} bytes)")

    print("\n>>> ALL 10 BACKEND, SEARCH & AI TESTS PASSED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    run_tests()
