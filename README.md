# GEOALERT — AI-Powered Landslide Risk Intelligence Platform
## Smart India Hackathon (SIH 2026) • Dual-Model Spatio-Temporal Susceptibility & Dynamic Precipitation Early Warning System

[![Python 3.12+](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://www.python.org/)
[![Next.js 15](https://img.shields.io/badge/Next.js-15-black.svg)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![Tailwind CSS 3](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Research Advisory](https://img.shields.io/badge/Status-Research%20%2F%20Advisory-amber.svg)]()

---

## 1. Executive Summary & Value Proposition

Traditional landslide early warning systems relying purely on rainfall thresholds trigger excessive false alarms over flat, stable topography while failing to prioritize steep, highly fractured cut slopes. 

**GEOALERT** solves this fundamental limitation by rigorously separating static geomorphic terrain susceptibility from dynamic precipitation triggers into a unified multiplicative risk formulation:

$$\\text{Risk}(x, y, t) = P(S)_{xy} \\times P(D)_{xyt}$$

With an empirical operational decision threshold $T_{\\text{coup}} = 0.0502$ and a terrain safety floor $P(S)_{\\text{floor}} = 0.1500$, the system achieves:
- **0.9526 ROC-AUC** and **0.9098 PR-AUC** on untouched spatial holdout evaluation.
- **80.4% Precision** and **82.2% Recall** on confirmed landslide events.
- **71.0% Reduction in False Alarms** compared to rainfall-only threshold baselines.

---

## 2. System Architecture

```
                    DATA LAYER (16 Static + 10 Dynamic CHIRPS Features)
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌───────────────────────────────┐             ┌───────────────────────────────┐
│     MODEL A (STATIC TERRAIN)  │             │     MODEL B (DYNAMIC RAIN)    │
│ Random Forest (16 Predictors) │             │ HistGradientBoosting (CHIRPS) │
│ Output: P(S) in [0.0, 1.0]    │             │ Output: P(D) in [0.0, 1.0]    │
└───────────────┬───────────────┘             └───────────────┬───────────────┘
                │                                             │
                └──────────────────────┬──────────────────────┘
                                       ▼
                        DUAL-MODEL COUPLING ENGINE
                        Risk(x,y,t) = P(S) * P(D)
                                       │
                                       ▼
                        4-TIER OPERATIONAL ALERT CLASSIFIER
                        Level 1: Green  (< 0.0502 or P(S) < 0.15)
                        Level 2: Yellow (0.0502 <= Risk < 0.1500)
                        Level 3: Orange (0.1500 <= Risk < 0.3500)
                        Level 4: Red    (Risk >= 0.3500)
                                       │
                                       ▼
                       FASTAPI BACKEND INFERENCE SERVICE
                       (Port 8000 | /api/v1/risk, /grid, /rainfall)
                                       │
                                       ▼
                      GEOALERT LIGHT GLASSMORPHIC WEB GIS CANVAS
                      (Port 3000 | 3,156 Regional Cells @ 60fps)
```

---

## 3. Dynamic Rainfall Intelligence & Calibrated Scenarios

Model B evaluates 10 antecedent precipitation features in real-time to compute dynamic landslide probability $P(D)$:

| Meteorological Scenario | 24h Rain ($P_0$) | 3-Day ARI ($ARI_3$) | 7-Day ARI ($ARI_7$) | 30-Day ARI ($ARI_{30}$) | Model B $P(D)$ Output | Dynamic Hazard State |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Dry Season (Baseline)** | 0.0 mm | 0.0 mm | 0.0 mm | 5.0 mm | **0.0189** | Dormant Hazard ($< 0.20$) |
| **Moderate Monsoon** | 20.0 mm | 35.0 mm | 70.0 mm | 200.0 mm | **0.0240** | Baseline Saturation |
| **Active Monsoon Surge** | 45.0 mm | 110.0 mm | 180.0 mm | 520.0 mm | **0.6284** | Critical Trigger ($\\ge 0.50$) |
| **Extreme Cloudburst** | 85.0 mm | 180.0 mm | 290.0 mm | 780.0 mm | **0.7477** | Severe Trigger ($\\ge 0.50$) |

---

## 4. Web GIS Application Pages

1. **GEOALERT Command Center (`/` & `/risk-map`)**: Interactive GIS map rendering 3,156 spatial cells across Meghalaya, featuring 3-way floating pill layer toggles (`Coupled Risk`, `Terrain Susceptibility`, `Rainfall Trigger`), interactive rainfall sliders, and a Location Intelligence Inspector with *"Why is this location at risk?"* explainability.
2. **Regional Analytics (`/analytics`)**: District risk synthesis and vulnerability rankings across East Khasi, Jaintia Hills, Ri-Bhoi, West Khasi, and Garo Hills.
3. **Infrastructure Corridors (`/infrastructure`)**: Highway lifeline stress testing (NH-40, NH-44/NH-6, SH-5, SH-12, MDR-22) under Dry, Monsoon, and Cloudburst storm simulations.
4. **Scientific Methodology (`/methodology`)**: Architectural pipeline diagrams, mathematical coupling proofs, and 4-tier alert specifications.
5. **Technical Provenance (`/about`)**: Model provenance, cryptographic SHA-256 checksums, and dataset documentation.

---

## 5. Quick Start & Execution

### **Option A: Docker Compose (Recommended)**
```bash
# Clone the repository & launch full stack
docker compose up --build

# Access Web GIS Dashboard: http://localhost:3000
# Access FastAPI Swagger Docs: http://localhost:8000/docs
```

### **Option B: Local Development**
```bash
# 1. Backend Service (FastAPI)
python scripts/run_backend.py
# Backend runs at http://localhost:8000

# 2. Frontend Application (Next.js)
cd frontend
npm install
npm run build
npm run start
# Frontend runs at http://localhost:3000
```

---

## 6. Automated Verification & Testing

Run the complete backend regression test suite (17/17 passing tests):
```bash
pytest backend/tests -v
```

Run the end-to-end differential coupling and dynamic rainfall verification:
```bash
python scratch/execute_e2e_verification.py
```

---

## 7. Frozen Model Governance & Cryptographic Auditing

All production machine learning pipelines are cryptographically locked:
- **Model A (Static Susceptibility)**: `models/expC_random_forest.joblib`
  - SHA-256: `1691cd678c2a9184cf608a9db0e464daee1e9daf237fd2c387b6d936685d5631`
- **Model B (Dynamic Trigger Hazard)**: `models/modelB_production_pipeline.joblib`
  - SHA-256: `e30aacc2f83eaca410a9a782089300ef1e920dd21051c042385d6159d97318f2`

---

## 8. Scientific Status & Disclaimer
This software is an experimental machine learning decision-support platform developed for Smart India Hackathon (SIH 2026). It operates in **RESEARCH / ADVISORY MODE** and does not constitute an official civil protection public warning broadcast.
