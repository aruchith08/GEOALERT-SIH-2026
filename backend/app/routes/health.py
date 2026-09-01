"""
backend/app/routes/health.py
============================
Health check endpoint.
"""

from datetime import datetime
from fastapi import APIRouter
from backend.app.schemas import HealthCheckResponse
from backend.app.model_service import model_service
from backend.app.config import GEOJSON_SURFACE_PATH, API_VERSION

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthCheckResponse)
def health_check():
    geojson_exists = GEOJSON_SURFACE_PATH.exists()
    status_str = "healthy" if (model_service.is_loaded and model_service.model_a_verified and model_service.model_b_verified and geojson_exists) else "degraded"

    return HealthCheckResponse(
        status=status_str,
        backend_running=True,
        model_a_loaded=model_service.is_loaded,
        model_b_loaded=model_service.is_loaded,
        model_a_hash_verified=model_service.model_a_verified,
        model_b_hash_verified=model_service.model_b_verified,
        spatial_geojson_available=geojson_exists,
        timestamp=datetime.now().isoformat(),
        version=API_VERSION
    )
