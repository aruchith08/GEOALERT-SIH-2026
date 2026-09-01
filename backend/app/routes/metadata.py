"""
backend/app/routes/metadata.py
==============================
Model provenance, feature schemas, and experimental status metadata.
"""

from fastapi import APIRouter
from backend.app.config import (
    PROJECT_NAME, API_VERSION,
    EXPECTED_MODEL_A_SHA256, EXPECTED_MODEL_B_SHA256,
    STATIC_FEATURES, DYNAMIC_FEATURES,
    FROZEN_COUPLING_THRESHOLD
)

router = APIRouter(tags=["Metadata"])


@router.get("/metadata")
def get_metadata():
    return {
        "project": PROJECT_NAME,
        "api_version": API_VERSION,
        "status": "EXPERIMENTAL_BACKEND_INFERENCE",
        "is_operational_public_warning": False,
        "models": {
            "model_a": {
                "name": "Static Landslide Susceptibility Model (Model A)",
                "classifier": "Experiment C Random Forest Pipeline",
                "feature_count": len(STATIC_FEATURES),
                "features": STATIC_FEATURES,
                "output": "P(S) in [0.0, 1.0]",
                "sha256": EXPECTED_MODEL_A_SHA256
            },
            "model_b": {
                "name": "Dynamic Precipitation Trigger Hazard Model (Model B)",
                "classifier": "Section 30 HistGradientBoosting Pipeline",
                "feature_count": len(DYNAMIC_FEATURES),
                "features": DYNAMIC_FEATURES,
                "output": "P(D) in [0.0, 1.0]",
                "sha256": EXPECTED_MODEL_B_SHA256
            }
        },
        "coupling_architecture": {
            "formulation": "Risk(x, y, t) = P(S) * P(D)",
            "coupling_threshold": FROZEN_COUPLING_THRESHOLD,
            "provenance": "Inherited from Section 32 Retrospective Validation on Block 5 Jaintia Hills"
        },
        "alert_tier_architecture": {
            "Level 1: Green": "Risk < 0.0502 OR P(S) < 0.1500 (Low / Normal Monitoring)",
            "Level 2: Yellow": "0.0502 <= Risk < 0.1500 (Advisory / Early Warning Watch)",
            "Level 3: Orange": "0.1500 <= Risk < 0.3500 (Warning / Heightened Alert)",
            "Level 4: Red": "Risk >= 0.3500 (Critical / Immediate Emergency Trigger)"
        }
    }
