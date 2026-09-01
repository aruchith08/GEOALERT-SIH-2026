"""
backend/app/main.py
===================
FastAPI Application Entry Point for GEOALERT Risk & Dynamic Intelligence API.
"""

import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import (
    PROJECT_NAME, API_VERSION, API_PREFIX,
    CORS_ORIGINS_RAW, CORS_ORIGIN_REGEX
)
from backend.app.model_service import model_service
from backend.app.routes import health, risk, spatial, metadata, rainfall


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Eagerly load & cryptographically verify Model A & Model B at startup
    model_service.load_models()
    yield


app = FastAPI(
    title=PROJECT_NAME,
    version=API_VERSION,
    description=(
        "Production AI-Powered Dual-Model Spatio-Temporal Landslide Susceptibility "
        "and Dynamic Rainfall Trigger Hazard Platform for Meghalaya / Northeast India."
    ),
    openapi_url=f"{API_PREFIX}/openapi.json",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Robust Cloud CORS: Supports all Vercel domains, Render, Railway, Localhost, and custom origins
if CORS_ORIGINS_RAW == "*" or not CORS_ORIGINS_RAW:
    app.add_middleware(
        CORSMiddleware,
        allow_origin_regex=CORS_ORIGIN_REGEX,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    allowed_list = [o.strip() for o in CORS_ORIGINS_RAW.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_list,
        allow_origin_regex=r"https?://.*\.vercel\.app|https?://localhost(:\d+)?|https?://127\.0\.0\.1(:\d+)?",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

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
