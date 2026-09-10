"""
LandslideGuard AI - Database Layer (SQLite)
Manages locations, sensor telemetry time-series, and early warning alert logs.
"""

import sqlite3
import os
from datetime import datetime, timedelta

DB_PATH = "landslide_guard.db"


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Monitored Geographic Locations
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        state_region TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        elevation_m REAL NOT NULL,
        slope_deg REAL NOT NULL,
        land_cover TEXT NOT NULL,
        historical_events INTEGER NOT NULL DEFAULT 0,
        current_rainfall_mm REAL NOT NULL DEFAULT 0.0,
        current_soil_moisture_pct REAL NOT NULL DEFAULT 20.0,
        current_risk_score REAL NOT NULL DEFAULT 0.0,
        current_risk_level TEXT NOT NULL DEFAULT 'LOW',
        status TEXT NOT NULL DEFAULT 'NORMAL',
        last_updated TEXT NOT NULL
    )
    """)

    # 2. Historical Sensor Readings (Time-series for 7-day risk trend)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sensor_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        day_label TEXT NOT NULL,
        rainfall_mm REAL NOT NULL,
        soil_moisture_pct REAL NOT NULL,
        risk_score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        FOREIGN KEY (location_id) REFERENCES locations (id)
    )
    """)

    # 3. Early Warning Alerts Log
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location_id INTEGER,
        location_name TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        recommended_action TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1
    )
    """)

    # 4. Searched Areas in India Database (Persistent history of user searches)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS searched_locations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        name TEXT NOT NULL,
        state_region TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        elevation_m REAL NOT NULL,
        slope_deg REAL NOT NULL,
        rainfall_mm REAL NOT NULL,
        soil_moisture_pct REAL NOT NULL,
        land_cover TEXT NOT NULL,
        historical_events INTEGER NOT NULL DEFAULT 0,
        risk_score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )
    """)

    conn.commit()

    # Seed initial locations if empty
    cursor.execute("SELECT COUNT(*) FROM locations")
    if cursor.fetchone()[0] == 0:
        seed_data(conn)

    conn.close()
    print("[Database] Initialized and verified SQLite tables.")


def seed_data(conn):
    cursor = conn.cursor()
    now = datetime.now()

    # Realistic sample regions across high/moderate/low susceptibility terrains in India
    locations = [
        {
            "name": "Wayanad Hills (Meppadi Zone)",
            "state_region": "Kerala",
            "latitude": 11.5534,
            "longitude": 76.1320,
            "elevation_m": 1050,
            "slope_deg": 41.5,
            "land_cover": "Barren",
            "historical_events": 5,
            "current_rainfall_mm": 195.0,
            "current_soil_moisture_pct": 89.2,
            "current_risk_score": 92.4,
            "current_risk_level": "HIGH",
            "status": "CRITICAL"
        },
        {
            "name": "Munnar Highlands (Gap Road Sector)",
            "state_region": "Kerala",
            "latitude": 10.0889,
            "longitude": 77.0595,
            "elevation_m": 1530,
            "slope_deg": 38.0,
            "land_cover": "Agriculture",
            "historical_events": 3,
            "current_rainfall_mm": 142.0,
            "current_soil_moisture_pct": 76.5,
            "current_risk_score": 74.8,
            "current_risk_level": "HIGH",
            "status": "WARNING"
        },
        {
            "name": "Shimla Ridge & Slopes",
            "state_region": "Himachal Pradesh",
            "latitude": 31.1048,
            "longitude": 77.1734,
            "elevation_m": 2200,
            "slope_deg": 33.5,
            "land_cover": "Urban",
            "historical_events": 2,
            "current_rainfall_mm": 88.0,
            "current_soil_moisture_pct": 58.0,
            "current_risk_score": 52.6,
            "current_risk_level": "MODERATE",
            "status": "WATCH"
        },
        {
            "name": "Darjeeling Valley Incline",
            "state_region": "West Bengal",
            "latitude": 27.0410,
            "longitude": 88.2663,
            "elevation_m": 2040,
            "slope_deg": 36.2,
            "land_cover": "Agriculture",
            "historical_events": 4,
            "current_rainfall_mm": 94.0,
            "current_soil_moisture_pct": 63.4,
            "current_risk_score": 58.1,
            "current_risk_level": "MODERATE",
            "status": "WATCH"
        },
        {
            "name": "Rishikesh Himalayan Gateway",
            "state_region": "Uttarakhand",
            "latitude": 30.0869,
            "longitude": 78.2676,
            "elevation_m": 372,
            "slope_deg": 22.0,
            "land_cover": "Forest",
            "historical_events": 1,
            "current_rainfall_mm": 45.0,
            "current_soil_moisture_pct": 39.0,
            "current_risk_score": 24.3,
            "current_risk_level": "LOW",
            "status": "NORMAL"
        },
        {
            "name": "Coorg Western Ghats Pass",
            "state_region": "Karnataka",
            "latitude": 12.4244,
            "longitude": 75.7382,
            "elevation_m": 1100,
            "slope_deg": 29.0,
            "land_cover": "Forest",
            "historical_events": 2,
            "current_rainfall_mm": 52.0,
            "current_soil_moisture_pct": 44.0,
            "current_risk_score": 29.5,
            "current_risk_level": "LOW",
            "status": "NORMAL"
        },
        {
            "name": "Dehradun Basin Plains",
            "state_region": "Uttarakhand",
            "latitude": 30.3165,
            "longitude": 78.0322,
            "elevation_m": 450,
            "slope_deg": 8.5,
            "land_cover": "Urban",
            "historical_events": 0,
            "current_rainfall_mm": 18.0,
            "current_soil_moisture_pct": 22.0,
            "current_risk_score": 6.8,
            "current_risk_level": "LOW",
            "status": "NORMAL"
        }
    ]

    for loc in locations:
        cursor.execute("""
        INSERT INTO locations (
            name, state_region, latitude, longitude, elevation_m, slope_deg,
            land_cover, historical_events, current_rainfall_mm, current_soil_moisture_pct,
            current_risk_score, current_risk_level, status, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            loc["name"], loc["state_region"], loc["latitude"], loc["longitude"],
            loc["elevation_m"], loc["slope_deg"], loc["land_cover"], loc["historical_events"],
            loc["current_rainfall_mm"], loc["current_soil_moisture_pct"],
            loc["current_risk_score"], loc["current_risk_level"], loc["status"],
            now.strftime("%Y-%m-%d %H:%M:%S")
        ))
        loc_id = cursor.lastrowid

        # Generate 7-day trend readings for each location
        # If High risk, show sharp increase over past 7 days
        days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"]
        if loc["current_risk_level"] == "HIGH":
            # Escalating storm scenario
            risk_curve = [32.0, 41.5, 54.0, 68.5, 79.0, 86.4, loc["current_risk_score"]]
            rain_curve = [35.0, 52.0, 80.0, 115.0, 150.0, 178.0, loc["current_rainfall_mm"]]
            moist_curve = [42.0, 48.0, 58.0, 68.0, 78.0, 84.0, loc["current_soil_moisture_pct"]]
        elif loc["current_risk_level"] == "MODERATE":
            risk_curve = [20.0, 24.0, 31.0, 42.0, 48.0, 55.0, loc["current_risk_score"]]
            rain_curve = [15.0, 22.0, 40.0, 62.0, 75.0, 82.0, loc["current_rainfall_mm"]]
            moist_curve = [30.0, 34.0, 42.0, 48.0, 54.0, 60.0, loc["current_soil_moisture_pct"]]
        else:
            risk_curve = [12.0, 14.0, 11.0, 18.0, 15.0, 20.0, loc["current_risk_score"]]
            rain_curve = [5.0, 8.0, 12.0, 14.0, 10.0, 16.0, loc["current_rainfall_mm"]]
            moist_curve = [22.0, 25.0, 24.0, 28.0, 26.0, 30.0, loc["current_soil_moisture_pct"]]

        for i in range(7):
            day_dt = now - timedelta(days=(6 - i))
            r_level = "LOW" if risk_curve[i] < 40 else ("MODERATE" if risk_curve[i] < 70 else "HIGH")
            cursor.execute("""
            INSERT INTO sensor_readings (
                location_id, timestamp, day_label, rainfall_mm, soil_moisture_pct, risk_score, risk_level
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                loc_id, day_dt.strftime("%Y-%m-%d"), days[i],
                rain_curve[i], moist_curve[i], risk_curve[i], r_level
            ))

    # Seed sample early warning alerts
    cursor.execute("""
    INSERT INTO alerts (
        location_id, location_name, severity, title, message, recommended_action, timestamp, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        1,
        "Wayanad Hills (Meppadi Zone)",
        "HIGH",
        "CRITICAL LANDSLIDE SUSCEPTIBILITY DETECTED",
        "Heavy precipitation (195mm) combined with 41.5° slope and 89.2% soil water saturation exceeds stability threshold.",
        "Issue precautionary evacuation advisory for downhill settlements; dispatch NDRF/SDRF teams and restrict hill highway transit.",
        now.strftime("%Y-%m-%d %H:%M:%S"),
        1
    ))

    cursor.execute("""
    INSERT INTO alerts (
        location_id, location_name, severity, title, message, recommended_action, timestamp, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        2,
        "Munnar Highlands (Gap Road Sector)",
        "HIGH",
        "ELEVATED LANDSLIDE ALERT",
        "Precipitation of 142mm has brought tea slope saturation above 76%. Debris flow risk elevated.",
        "Enact night travel ban along Gap Road stretch; activate local emergency monitoring checkposts.",
        (now - timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S"),
        1
    ))

    conn.commit()
    print("[Database] Seeded 7 locations, 49 historical records, and 2 active alerts.")


def get_all_locations():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations ORDER BY current_risk_score DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_location_by_id(loc_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM locations WHERE id = ?", (loc_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_location_history(loc_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM sensor_readings 
        WHERE location_id = ? 
        ORDER BY id ASC LIMIT 7
    """, (loc_id,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def get_active_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE is_active = 1 ORDER BY id DESC")
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def update_location_telemetry(loc_id, rainfall_mm, soil_moisture_pct, risk_score, risk_level):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    status = "CRITICAL" if risk_level == "HIGH" and risk_score >= 85 else (
        "WARNING" if risk_level == "HIGH" else (
            "WATCH" if risk_level == "MODERATE" else "NORMAL"
        )
    )

    cursor.execute("""
    UPDATE locations 
    SET current_rainfall_mm = ?,
        current_soil_moisture_pct = ?,
        current_risk_score = ?,
        current_risk_level = ?,
        status = ?,
        last_updated = ?
    WHERE id = ?
    """, (rainfall_mm, soil_moisture_pct, risk_score, risk_level, status, now_str, loc_id))

    # If high risk, log an alert
    if risk_level == "HIGH":
        cursor.execute("SELECT name FROM locations WHERE id = ?", (loc_id,))
        loc_row = cursor.fetchone()
        loc_name = loc_row["name"] if loc_row else f"Zone #{loc_id}"
        cursor.execute("""
        INSERT INTO alerts (location_id, location_name, severity, title, message, recommended_action, timestamp, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (
            loc_id,
            loc_name,
            "HIGH",
            f"HIGH RISK WARNING: {loc_name}",
            f"Simulated or detected rainfall of {rainfall_mm:.1f}mm and soil saturation of {soil_moisture_pct:.1f}% pushed risk to {risk_score:.1f}%.",
            "Immediate terrain surveillance recommended. Consider precautionary transit diversions.",
            now_str
        ))

    conn.commit()
    conn.close()


def save_searched_location(data):
    """Saves a searched area in India along with its evaluated risk metrics."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
    INSERT INTO searched_locations (
        query, name, state_region, latitude, longitude, elevation_m, slope_deg,
        rainfall_mm, soil_moisture_pct, land_cover, historical_events,
        risk_score, risk_level, timestamp
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("query", ""),
        data.get("name", "Unknown Region"),
        data.get("state_region", "India"),
        float(data.get("latitude", 0)),
        float(data.get("longitude", 0)),
        float(data.get("elevation_m", 500)),
        float(data.get("slope_deg", 25)),
        float(data.get("rainfall_mm", 50)),
        float(data.get("soil_moisture_pct", 40)),
        data.get("land_cover", "Forest"),
        int(data.get("historical_events", 0)),
        float(data.get("risk_score", 0)),
        data.get("risk_level", "LOW"),
        now_str
    ))
    conn.commit()
    inserted_id = cursor.lastrowid
    conn.close()
    return inserted_id


def get_searched_locations(limit=100):
    """Returns all user-searched areas in India from SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM searched_locations 
        ORDER BY id DESC LIMIT ?
    """, (limit,))
    rows = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return rows


def clear_searched_locations():
    """Clears search history if requested."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM searched_locations")
    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
