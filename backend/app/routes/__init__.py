"""
backend/app/routes/__init__.py
"""
from backend.app.routes.health import router as health_router
from backend.app.routes.metadata import router as metadata_router
from backend.app.routes.risk import router as risk_router
from backend.app.routes.spatial import router as spatial_router

__all__ = ["health_router", "metadata_router", "risk_router", "spatial_router"]
