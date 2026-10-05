# GEOALERT — AI-Powered Landslide Risk Intelligence Platform
## Real-Time Weather Monitoring, Spatially Variable Rainfall & 7-Day Forecast-Driven Dynamic Landslide Risk Intelligence

[![Python 3.12+](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Tailwind CSS 3](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Research Advisory](https://img.shields.io/badge/Status-Research%20%2F%20Advisory-amber.svg)]()
[![Tests: 64/64 Passing](https://img.shields.io/badge/Tests-64%2F64%20Passed-brightgreen.svg)]()

---

## 1. Executive Summary & Core Innovation

Traditional landslide early warning systems relying purely on rainfall thresholds trigger excessive false alarms over flat, stable topography while failing to prioritize steep, fractured cut slopes. 

**GEOALERT** solves this fundamental operational limitation by separating static geomorphic terrain susceptibility $P(S)$ from dynamic precipitation triggers $P(D)$ into a scientifically grounded multiplicative risk formulation:

$$\text{Risk}(x, y, t) = P(S)_{xy} \times P(D)_{xyt}$$

With an empirical operational decision threshold $T_{\text{coup}} = 0.0502$ and a terrain safety floor $P(S)_{\text{floor}} = 0.1500$, the system delivers:
- **0.9526 ROC-AUC** and **0.9098 PR-AUC** on untouched spatial holdout evaluation.
- **80.4% Precision** and **82.2% Recall** on verified historical landslide inventories.
- **71.0% Reduction in False Alarms** compared to uncoupled rainfall-only threshold baselines.
- **Real-Time Weather Ingestion**: Continuous telemetry from Open-Meteo NWP (ECMWF IFS / GFS) covering 31 past days + today + 7 forecast days.
- **Spatially Variable Rainfall**: 12-station regional meteorological mesh across Meghalaya mapped to all 3,156 grid cells via geodesic Haversine distance.
- **7-Day Forward Predictive Timeline**: Dynamic rolling feature engine computing daily $P(D)_{xyt}$ and coupled risk forecasts with peak hazard warnings.

---

## 2. End-to-End System Architecture

```
                    REAL-TIME METEOROLOGICAL TELEMETRY LAYER
       Open-Meteo Global NWP (ECMWF IFS / GFS) | Hourly & Daily Precip, Temp, RH, Wind
                                       │
                                       ▼
                     THREAD-SAFE IN-MEMORY WEATHER CACHE
                   (15-min TTL, Geodesic Key Hashing, Graceful Fallback)
                                       │
         ┌─────────────────────────────┴─────────────────────────────┐
         ▼                                                           ▼
┌─────────────────────────────────┐                 ┌─────────────────────────────────┐
│  12-STATION METEOROLOGICAL MESH │                 │   DYNAMIC ROLLING FEATURE ENGINE│
│  Sohra, Mawsynram, Shillong,    │                 │   Exact 10 CHIRPS Predictors    │
│  Umsning, Nongpoh, Jowai,       │                 │   P_0, ARI-3..30, Max1d, Max3d, │
│  Khliehriat, Nongstoin, Mairang,│                 │   RainyDays-7..30, +1d..+7d NWP │
│  Tura, Williamnagar, Baghmara   │                 └────────────────┬────────────────┘
└────────────────┬────────────────┘                                  │
                 │                                                   │
                 └─────────────────────────┬─────────────────────────┘
                                           ▼
                            MODEL B (DYNAMIC TRIGGER HAZARD)
                        Frozen HistGradientBoosting Pipeline
                        Output: P(D)(x, y, t) in [0.0, 1.0]
                                           │
         ┌─────────────────────────────────┴─────────────────────────────────┐
         ▼                                                                   ▼
┌─────────────────────────────────┐                         ┌─────────────────────────────────┐
│   MODEL A (STATIC TERRAIN)      │                         │     DUAL-MODEL COUPLING ENGINE  │
│   Frozen Random Forest          │                         │     Risk(x,y,t) = P(S) * P(D)   │
│   16 Geotechnical Predictors    │                         │     T_coup = 0.0502             │
│   Output: P(S) in [0.0, 1.0]    │                         │     P(S)_floor = 0.1500         │
└────────────────┬────────────────┘                         └────────────────┬────────────────┘
                 │                                                           │
                 └─────────────────────────┬─────────────────────────────────┘
                                           ▼
                         4-TIER OPERATIONAL ALERT CLASSIFIER
                 Level 1: Green  (< 0.0502 or P(S) < 0.1500) - Baseline Monitoring
                 Level 2: Yellow (0.0502 - 0.1500)           - Advisory Notice
                 Level 3: Orange (0.1500 - 0.3500)           - Heightened Warning
                 Level 4: Red    (>= 0.3500)                 - Critical Hazard
                                           │
                                           ▼
                         FASTAPI BACKEND REST API SERVICE
                 Port 8000 | 10 Section Endpoints | 64/64 Pytest Passing
                                           │
                                           ▼
                       GEOALERT LIGHT GLASSMORPHIC WEB GIS CANVAS
                 Port 3000 | Next.js 15 App Router | 3,156 Cells @ 60fps
                 6-Layer Switcher | 7-Day Timeline | Location Intelligence
```

---

## 3. 12-Station Regional Meteorological Mesh

Meghalaya exhibits dramatic orographic rainfall gradients—from the rain-drenched southern escarpment to northern leeward rain shadows. GEOALERT resolves this spatial heterogeneity using 12 representative meteorological stations:

| Station ID | Station Name | District / Spatial Block | Geomorphic Zone | Lat / Lon | Elevation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `STN_MEG_SHL` | Shillong Central | East Khasi Hills | High Plateau | 25.5788°N, 91.8933°E | 1,496 m |
| `STN_MEG_SHR` | Sohra (Cherrapunjee) | East Khasi Hills | Escarpment (High Hazard) | 25.2702°N, 91.7323°E | 1,430 m |
| `STN_MEG_MWS` | Mawsynram | East Khasi Hills | Extreme Escarpment | 25.2975°N, 91.5826°E | 1,400 m |
| `STN_MEG_UMS` | Umsning Valley | Ri-Bhoi Block | Valley Basin (Low Hazard)| 25.7533°N, 91.8953°E | 610 m |
| `STN_MEG_NPH` | Nongpoh | Ri-Bhoi Block | Northern Foothills | 25.9036°N, 91.8812°E | 485 m |
| `STN_MEG_JOW` | Jowai Plateau | West Jaintia Hills | Eastern Ridge | 25.4528°N, 92.2033°E | 1,380 m |
| `STN_MEG_KHL` | Khliehriat | East Jaintia Hills | Mining Escarpment | 25.3582°N, 92.3683°E | 1,200 m |
| `STN_MEG_NGS` | Nongstoin | West Khasi Hills | Central Highland | 25.5197°N, 91.2692°E | 1,409 m |
| `STN_MEG_MRG` | Mairang | Eastern West Khasi | Granite Dome | 25.5614°N, 91.6389°E | 1,600 m |
| `STN_MEG_TRA` | Tura Peak | West Garo Hills | Western Escarpment | 25.5144°N, 90.2033°E | 349 m |
| `STN_MEG_WLM` | Williamnagar | East Garo Hills | Simsang River Valley | 25.6128°N, 90.5842°E | 260 m |
| `STN_MEG_BGH` | Baghmara | South Garo Hills | Southern Boundary | 25.1956°N, 90.6389°E | 120 m |

---

## 4. Web GIS 6-Layer Multi-Spectral Switcher

The interactive Web GIS map provides 6 distinct analytical views with rigorous cartographic separation between risk levels and precipitation amounts:

1. **Coupled Risk $P(S) \times P(D)$** (Default): Multiplicative operational risk classified into 4 alert tiers (Green, Yellow, Orange, Red).
2. **Terrain Susceptibility $P(S)$**: Model A static ground vulnerability derived from 16 geotechnical predictors (Slope, Elevation, Aspect, Curvature, Fault Proximity, Lithology).
3. **Dynamic Trigger $P(D)$**: Model B dynamic trigger probability derived from 10 CHIRPS rainfall predictors.
4. **Current Rainfall (mm)**: Spatially variable live precipitation from the 12-station mesh, rendered using a **distinct sequential Cyan-to-Purple palette** (`<5mm`: Cyan, `5-20mm`: Royal Blue, `20-50mm`: Indigo, `≥50mm`: Deep Purple) to guarantee zero visual confusion with hazard alert colors.
5. **Forecast Rainfall**: Projected 7-day cumulative precipitation from numerical weather predictions.
6. **Forecast Risk**: Peak projected coupled landslide hazard over the next 168 hours.

---

## 5. Pinned Demonstration Locations

For immediate verification of differential coupling and false alarm suppression, 3 pinned locations are accessible via one-click pills:

1. **Sohra / Cherrapunjee (`CELL_MEG_0878`)**
   - Terrain: Escarpment ($P(S) = 0.7152$, Slope: 28.4°, Elevation: 1,430m)
   - Dynamic: Heavy Orographic Monsoon ($P(D) = 0.6284$)
   - Coupled Risk: $0.4494$ &bull; **Level 4: Red (Critical Hazard)**
   - Insight: Steep terrain amplifies rainfall into immediate critical hazard.

2. **Umsning Valley (`CELL_MEG_2427`)**
   - Terrain: Flat Alluvial Basin ($P(S) = 0.0515$, Slope: 3.2°, Elevation: 610m)
   - Dynamic: Heavy Regional Rain ($P(D) = 0.6284$)
   - Coupled Risk: $0.0323$ &bull; **Level 1: Green (Safe Baseline)**
   - Insight: **False Alarm Suppression demonstration**. Conventional rainfall-only thresholds incorrectly flag this valley; GEOALERT's geotechnical floor ($P(S)_{\text{floor}} = 0.1500$) suppresses the false alarm.

3. **NH-40 Highway Cut Slope (`CELL_MEG_0765`)**
   - Terrain: Fractured Road Cut ($P(S) = 0.3542$, Slope: 22.1°, Elevation: 1,050m)
   - Dynamic: Moderate Rain ($P(D) = 0.4500$)
   - Coupled Risk: $0.1594$ &bull; **Level 3: Orange (Heightened Warning)**
   - Insight: Transit lifeline protection requiring convoy speed restrictions and catch-fence patrols.

---

## 6. Location Intelligence Inspector & Decision-Support XAI

Clicking any of the 3,156 spatial cells opens the comprehensive Location Intelligence panel:
- **Spatial Metadata**: Coordinates, elevation, and terrain slope.
- **Dual-Model Metrics**: $P(S)$ static susceptibility, $P(D)$ dynamic trigger, and multiplicative coupled risk score with progress bar.
- **Meteorological Telemetry**: Live precipitation, 7-day antecedent saturation, and 24-hour forecast accumulation.
- **Structured Explainable AI (XAI)**:
  - *Terrain Factor*: Geotechnical bedrock relief and slope stability assessment.
  - *Coupling Synergy*: Multiplicative interaction explaining why hazard is either amplified or suppressed.
- **Decision-Support Recommended Action**: Specific operational instructions (e.g. clearing culverts, inspecting catch-fences, patrolling creep zones).
- **Data Confidence Indicator**: Provenance badge (`HIGH`, `MEDIUM`, `LOW`), data source (`Open-Meteo NWP Global Model`), and antecedent completeness.
- **Operational Disclaimer**: Explicitly marked as *"Advisory intelligence for research and disaster planning. Not a statutory civil evacuation mandate."*

---

## 7. Complete API Catalog (Section 10)

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/health` | Service health, model integrity, and GeoJSON status |
| `GET` | `/api/v1/metadata` | Model feature counts, SHA-256 hashes, and alert tier thresholds |
| `GET` | `/api/v1/weather/status` | Live Open-Meteo telemetry status, cache stats, and data age |
| `GET` | `/api/v1/weather/current` | Current weather, 10 dynamic features, and short-term forecast intervals |
| `GET` | `/api/v1/weather/forecast` | 7-day daily numerical weather forecast series |
| `GET` | `/api/v1/weather/history` | 14-day antecedent daily precipitation observations |
| `GET` | `/api/v1/weather/location` | Location-specific weather, accumulation, and confidence metadata |
| `GET` | `/api/v1/weather/regions` | Telemetry and derived $P(D)$ for all 12 regional stations |
| `GET` | `/api/v1/weather/mesh/stations` | Station definitions and current readings |
| `GET` | `/api/v1/weather/mesh/risk-summary`| Spatially variable risk KPI distribution across all 3,156 cells |
| `GET` | `/api/v1/risk/live/grid` | Full 3,156-cell live risk surface computed via meteorological mesh |
| `GET` | `/api/v1/risk/live/location`| Location live risk, geotechnical XAI, recommendations, and confidence |
| `POST` | `/api/v1/risk/forecast` | 7-day predictive risk evaluation for arbitrary coordinates |
| `GET` | `/api/v1/risk/grid` | Section 34 GeoJSON spatial surface |
| `GET` | `/api/v1/risk/grid/summary` | Spatial block aggregated statistics |

---

## 8. Automated Verification & Testing

GEOALERT includes a 64-test regression suite covering cryptographic integrity, mathematical coupling bounds, weather caching, Open-Meteo ingestion, mesh assignment, and API contract conformity:

```bash
# Run full backend test suite (64/64 passing tests)
$env:PYTHONPATH="."; uv run --with pytest --with fastapi --with httpx --with pandas --with numpy --with scikit-learn --with joblib pytest backend/tests -v
```

---

## 9. Cryptographic Audit & Frozen Model Governance

To ensure reproducibility, all production machine learning models and spatial surfaces are locked and audited:

- **Model A (Static Terrain Susceptibility)**:
  - File: `models/expC_random_forest.joblib`
  - SHA-256: `1691cd678c2a9184cf608a9db0e464daee1e9daf237fd2c387b6d936685d5631`
- **Model B (Dynamic Precipitation Trigger)**:
  - File: `models/modelB_production_pipeline.joblib`
  - SHA-256: `e30aacc2f83eaca410a9a782089300ef1e920dd21051c042385d6159d97318f2`
- **Spatial Grid Surface**:
  - File: `data/phase4/section34_spatial_risk/phase4_section34_regional_risk_surface.geojson`
  - Features: Exactly 3,156 regional cells across Meghalaya

---

## 10. Operational Status & Scientific Disclaimer

GEOALERT is an advanced scientific research decision-support prototype developed as an AI-powered geotechnical and meteorological disaster risk intelligence platform. It operates strictly in **RESEARCH / ADVISORY MODE** to assist disaster management planners and geotechnical engineers. It does not issue statutory civil evacuation orders.

---

## 11. Comprehensive Documentation & Technical Guides

For in-depth operational procedures, technical specifications, and validation reports:

- **[System Deployment, Configuration & Operations Manual](docs/DEPLOYMENT.md)**: Local, Docker, and environment configuration.
- **[Cloud Deployment Guide](docs/CLOUD_DEPLOYMENT.md)**: Production deployment instructions for Next.js (Vercel) and FastAPI (Render / Railway).
- **[Comprehensive Demo Walkthrough Guide](docs/DEMO_WALKTHROUGH.md)**: Step-by-step walkthrough of Web GIS controls, layer switchers, and XAI inspector.
- **[Comprehensive Live Demonstration Script](docs/FINAL_DEMO_SCRIPT.md)**: Structured 5-minute technical presentation script.
- **[Technical & Scientific Evaluation Q&A](docs/TECHNICAL_QA.md)**: Rigorous answers to core architecture, weather telemetry, and false-alarm suppression questions.
- **[Official Key Metrics & Scientific Scorecard](docs/KEY_METRICS.md)**: Complete tabular scorecard of model accuracies, thresholds, and latencies.
- **[Comprehensive Product Overview](docs/PRODUCT_OVERVIEW.md)**: Mathematical formulations, regional expansion framework, and physical decoupling rationale.

