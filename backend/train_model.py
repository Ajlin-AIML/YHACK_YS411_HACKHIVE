"""
LandslideGuard AI - Model Training & Evaluation Pipeline
Challenge 24: AI-Powered Landslide Early Warning & Monitoring System
"""

import os
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, recall_score, precision_score, f1_score

# Ensure directories exist
os.makedirs("data", exist_ok=True)
os.makedirs("models", exist_ok=True)

DATA_PATH = os.path.join("data", "landslide_dataset.csv")
MODEL_PATH = os.path.join("models", "landslide_model.joblib")


def generate_synthetic_dataset(n_samples=3000, random_seed=42):
    """
    Generates a realistic geological and meteorological dataset for landslide susceptibility.
    Incorporates physical landslide dynamics:
    - Steep slope (>30 deg) + High rainfall (>120 mm) + High soil moisture (>75%) sharply triggers landslides.
    - Barren land has much weaker shear strength than Forested terrain.
    - Historical landslide frequency indicates unstable shear planes.
    """
    np.random.seed(random_seed)

    # 1. Rainfall (mm in last 24-48 hours)
    # Mixture of normal rain and extreme monsoon events
    rainfall = np.concatenate([
        np.random.gamma(shape=3.0, scale=20.0, size=int(n_samples * 0.7)), # 0 - 140 mm
        np.random.uniform(140, 320, size=int(n_samples * 0.3))            # heavy storm 140 - 320 mm
    ])
    rainfall = np.clip(rainfall, 0, 350)

    # 2. Slope angle (degrees)
    slope = np.random.beta(a=2.5, b=3.5, size=n_samples) * 58 # 0 to ~55 degrees

    # 3. Elevation (meters above sea level)
    elevation = np.random.uniform(150, 2800, size=n_samples)

    # 4. Soil moisture (% saturation)
    # Correlated with rainfall but with soil retention lag
    base_moisture = np.random.uniform(15, 60, size=n_samples)
    soil_moisture = base_moisture + (rainfall / 350.0) * 45.0 + np.random.normal(0, 5, n_samples)
    soil_moisture = np.clip(soil_moisture, 10, 99)

    # 5. Land Cover
    land_covers = ["Forest", "Agriculture", "Grassland", "Barren", "Urban"]
    cover_probs = [0.40, 0.25, 0.15, 0.12, 0.08]
    land_cover = np.random.choice(land_covers, size=n_samples, p=cover_probs)

    # Land cover susceptibility weight
    cover_risk_multiplier = {
        "Forest": 0.55,       # Strong root cohesion protects slopes
        "Agriculture": 0.95,  # Moderate stability depending on terracing
        "Grassland": 0.85,    # Shallow root network
        "Barren": 1.65,       # Exposed topsoil, zero root cohesion
        "Urban": 1.30         # Cut slopes, drainage interference
    }
    cover_multipliers = np.array([cover_risk_multiplier[c] for c in land_cover])

    # 6. Historical landslide count in vicinity (0 to 8)
    historical_events = np.random.poisson(lam=0.8, size=n_samples)
    historical_events = np.clip(historical_events, 0, 8)

    # 7. Geological physics-based probability formula
    # Factor of Safety proxy calculation:
    # High rainfall, high soil saturation, steep slope, barren ground, and prior failures increase hazard
    z_score = (
        0.015 * (rainfall - 90) +
        0.075 * (slope - 26) +
        0.035 * (soil_moisture - 60) +
        0.0003 * (elevation - 800) +
        0.35 * (cover_multipliers - 1.0) +
        0.25 * historical_events - 1.2
    )

    # Sigmoid function for base probability
    prob = 1.0 / (1.0 + np.exp(-z_score))
    
    # Add minor stochastic environmental noise
    noisy_prob = np.clip(prob + np.random.normal(0, 0.04, n_samples), 0.01, 0.99)
    landslide = (noisy_prob >= 0.50).astype(int)

    df = pd.DataFrame({
        "rainfall_mm": np.round(rainfall, 1),
        "slope_deg": np.round(slope, 1),
        "elevation_m": np.round(elevation, 0).astype(int),
        "soil_moisture_pct": np.round(soil_moisture, 1),
        "land_cover": land_cover,
        "historical_events": historical_events,
        "landslide": landslide
    })

    df.to_csv(DATA_PATH, index=False)
    print(f"[Dataset] Generated {n_samples} records saved to {DATA_PATH}")
    print(f"[Dataset] Landslide occurrences: {landslide.sum()} ({landslide.sum()/n_samples*100:.1f}%)")
    return df


def train_and_evaluate():
    if not os.path.exists(DATA_PATH):
        df = generate_synthetic_dataset()
    else:
        df = pd.read_csv(DATA_PATH)
        print(f"[Dataset] Loaded existing data from {DATA_PATH} ({len(df)} rows)")

    # Features and Target
    X = df[["rainfall_mm", "slope_deg", "elevation_m", "soil_moisture_pct", "land_cover", "historical_events"]]
    y = df["landslide"]

    num_features = ["rainfall_mm", "slope_deg", "elevation_m", "soil_moisture_pct", "historical_events"]
    cat_features = ["land_cover"]

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), num_features),
            ("cat", OneHotEncoder(drop="first", handle_unknown="ignore"), cat_features)
        ]
    )

    # Balanced class weights & tuned trees for high recall in disaster detection
    clf = RandomForestClassifier(
        n_estimators=150,
        max_depth=12,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1
    )

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("classifier", clf)
    ])

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print("\n[Training] Training Random Forest Classifier...")
    pipeline.fit(X_train, y_train)

    # Evaluate
    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, y_pred)
    rec = recall_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "="*50)
    print("      LANDSLIDEGUARD AI - MODEL PERFORMANCE")
    print("="*50)
    print(f"Accuracy  : {acc*100:.2f}%")
    print(f"Recall    : {rec*100:.2f}%  (Crucial for disaster safety)")
    print(f"Precision : {prec*100:.2f}%")
    print(f"F1-Score  : {f1*100:.2f}%")
    print("\nConfusion Matrix:")
    print(f"  [TN={cm[0,0]:3d}  FP={cm[0,1]:3d}]")
    print(f"  [FN={cm[1,0]:3d}  TP={cm[1,1]:3d}]")
    print("="*50)

    # Feature Importance analysis
    # Extract transformed feature names
    cat_encoder = pipeline.named_steps["preprocessor"].named_transformers_["cat"]
    cat_names = list(cat_encoder.get_feature_names_out(cat_features))
    all_features = num_features + cat_names
    importances = pipeline.named_steps["classifier"].feature_importances_

    feature_rank = sorted(zip(all_features, importances), key=lambda x: x[1], reverse=True)
    print("\n[Feature Importances]")
    for feat, imp in feature_rank:
        print(f"  {feat:<25}: {imp*100:.1f}%")

    # Save model and metadata
    metadata = {
        "pipeline": pipeline,
        "features": list(X.columns),
        "num_features": num_features,
        "cat_features": cat_features,
        "feature_importances": dict(feature_rank),
        "metrics": {
            "accuracy": round(float(acc), 4),
            "recall": round(float(rec), 4),
            "precision": round(float(prec), 4),
            "f1_score": round(float(f1), 4)
        }
    }

    joblib.dump(metadata, MODEL_PATH)
    print(f"\n[Model] Successfully exported trained model package to {MODEL_PATH}")
    return metadata


if __name__ == "__main__":
    train_and_evaluate()
