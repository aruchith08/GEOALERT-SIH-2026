"""
backend/app/main.py
===================
FastAPI Application Entry Point for SIH 2026 Landslide Risk & Dynamic Intelligence API.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import PROJECT_NAME, API_VERSION, API_PREFIX, CORS_ORIGINS
from backend.app.model_service import model_service
from backend.app.routes import health, risk, spatial, metadata, rainfall

app = FastAPI(
    title=PROJECT_NAME,
    version=API_VERSION,
    description=(
        "Production AI-Powered Dual-Model Spatio-Temporal Landslide Susceptibility "
        "and Dynamic Rainfall Trigger Hazard Platform for Meghalaya / Northeast India."
    ),
    openapi_url=f"{API_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Eagerly load & cryptographically verify Model A & Model B at startup
@app.on_event("startup")
def startup_event():
    model_service.load_models()

# Include Routers
app.include_router(health.router, prefix=API_PREFIX)
app.include_router(risk.router, prefix=API_PREFIX)
app.include_router(rainfall.router, prefix=API_PREFIX)
app.include_router(spatial.router, prefix=API_PREFIX)
app.include_router(metadata.router, prefix=API_PREFIX)


@app.get("/")
def root():
    return {
        "project": PROJECT_NAME,
        "version": API_VERSION,
        "docs_url": "/docs",
        "api_prefix": API_PREFIX,
        "status": "active"
    }
