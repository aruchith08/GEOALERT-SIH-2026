# SIH 2026 — System Deployment, Configuration & Operations Manual
## GEOALERT: Real-Time Weather Monitoring & Forecast-Driven Landslide Risk Intelligence Platform

---

### 1. System Requirements & Prerequisites
- **Docker**: Engine 24.0+ & Docker Compose v2.20+
- **Host OS**: Linux (Ubuntu 22.04+ LTS), macOS (Ventura+), or Windows 10/11 with WSL2
- **Runtime**: Python 3.12+ (or uv package manager), Node.js 20.18+ (Next.js 15 App Router)
- **Memory**: Minimum 4 GB RAM (8 GB recommended for raster caching and full mesh evaluation)
- **Storage**: 5 GB free disk space

---

### 2. Environment Variables Reference

| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `WEATHER_PROVIDER` | `open-meteo` | Telemetry provider (`open-meteo` or `mock`) |
| `WEATHER_CACHE_TTL_SECONDS` | `900` | In-memory cache TTL (15 minutes) |
| `OPEN_METEO_BASE_URL` | `https://api.open-meteo.com/v1/forecast` | Open-Meteo Global NWP endpoint |
| `SECTION34_GEOJSON_PATH` | `data/phase4/.../phase4_section34_regional_risk_surface.geojson` | 3,156-cell spatial risk surface |
| `MODEL_A_PATH` | `models/expC_random_forest.joblib` | Frozen Model A pipeline |
| `MODEL_B_PATH` | `models/modelB_production_pipeline.joblib` | Frozen Model B pipeline |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend URL for Next.js frontend |

---

### 3. Docker Deployment (One-Click Launch)

```bash
# 1. Clone repository and navigate to root
cd GEOALERT-SIH-2026

# 2. Build and launch all microservices in detached mode
docker compose up -d --build

# 3. Verify running containers
docker compose ps

# 4. Stream combined logs
docker compose logs -f

# 5. Graceful shutdown
docker compose down
```

---

### 4. Service Architecture & Port Mapping

| Service | Port | Local Endpoint | Health Check URI | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Frontend Web GIS** | `3000` | `http://localhost:3000` | `http://localhost:3000/` | Interactive Next.js 15 Light Glassmorphic GIS |
| **Backend API Service** | `8000` | `http://localhost:8000` | `http://localhost:8000/api/v1/health` | FastAPI REST inference engine |
| **Swagger Interactive Docs** | `8000` | `http://localhost:8000/docs` | `http://localhost:8000/docs` | OpenAPI 3.1 live documentation |

---

### 5. Complete API Catalog (Section 10)

1. **System Health & Metadata**:
   - `GET /api/v1/health`: Checks model hashes, CSV/GeoJSON integrity, and API health.
   - `GET /api/v1/metadata`: Returns feature counts, model algorithms, and decision thresholds.

2. **Real-Time Weather & Telemetry**:
   - `GET /api/v1/weather/status`: Reports provider status, cache size, hit rate, and data age.
   - `GET /api/v1/weather/current`: Returns current weather, 10 dynamic features, and short-term forecast intervals.
   - `GET /api/v1/weather/forecast`: Returns 7-day numerical daily weather forecast series.
   - `GET /api/v1/weather/history`: Returns 14-day antecedent precipitation observations.
   - `GET /api/v1/weather/location`: Location-specific weather, accumulations, and data confidence.
   - `GET /api/v1/weather/regions`: Telemetry and derived P(D) for all 12 regional stations.
   - `GET /api/v1/weather/mesh/stations`: Station coordinates, elevations, and sensor telemetry.
   - `GET /api/v1/weather/mesh/risk-summary`: 3,156-cell risk KPI distribution computed via mesh.

3. **Risk Inference & Forecasting**:
   - `GET /api/v1/risk/live/grid`: Full 3,156-cell live risk surface computed via meteorological mesh.
   - `GET /api/v1/risk/live/location`: Evaluates location live risk, geotechnical XAI, recommendations, and confidence.
   - `POST /api/v1/risk/forecast`: 7-day predictive risk evaluation for arbitrary coordinates.
   - `GET /api/v1/risk/grid`: Serves static Section 34 GeoJSON surface.
   - `GET /api/v1/risk/grid/summary`: District aggregated hazard summaries.
   - `POST /api/v1/risk/evaluate-point`: Interactive single-point dual-model inference.

---

### 6. Real-Time Meteorological Telemetry Pipeline & Mesh Architecture

- **Data Ingestion**: Queries Open-Meteo Global NWP for hourly and daily precipitation, temperature, relative humidity, and wind speed.
- **Antecedent Accumulation Window**: Maintains a rolling 31-day historical observation buffer + today + 7-day forward numerical weather predictions.
- **Dynamic Feature Derivation**: Computes the exact 10 CHIRPS features required by Model B:
  `rainfall_event_day`, `ari_3`, `ari_7`, `ari_15`, `ari_30`, `max_1day_7d`, `max_3day_30d`, `rainy_days_7d`, `rainy_days_15d`, `rainy_days_30d`.
- **12-Station Regional Mesh**: Vectorized nearest-station assignment maps all 3,156 cells to their nearest meteorological station via Haversine distance.
- **Resilient Fallback**: If external internet connectivity is severed, the cache delivers graceful fallback to calibrated geomorphic seasonal scenarios without downtime.
