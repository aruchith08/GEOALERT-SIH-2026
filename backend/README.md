# SIH 2026 — Landslide Early Warning & Risk Monitoring System
## Backend Risk Inference API (Section 35)

### 1. Architecture Overview
This backend service provides a RESTful inference API for the SIH 2026 Landslide Early Warning System. It serves predictions from two permanently frozen, cryptographically verified machine learning models:
1. **Model A (Static Susceptibility)**: Evaluates baseline terrain landslide vulnerability $P(S) \in [0, 1]$ using 16 geotechnical, geomorphological, and environmental predictors.
2. **Model B (Dynamic Precipitation Trigger Hazard)**: Evaluates meteorological trigger hazard $P(D) \in [0, 1]$ using 10 antecedent rainfall predictors from CHIRPS.
3. **Coupled Risk Engine**: Fuses $P(S)$ and $P(D)$ using the multiplicative formula:
   $$\text{Risk}(x, y, t) = P(S) \times P(D)$$
4. **4-Tier Operational Alert Architecture**:
   - **Level 1 (Green)**: $\text{Risk} < 0.0502$ OR $P(S) < 0.1500$ (Low / Normal Monitoring)
   - **Level 2 (Yellow)**: $0.0502 \le \text{Risk} < 0.1500$ (Advisory / Early Warning Watch)
   - **Level 3 (Orange)**: $0.1500 \le \text{Risk} < 0.3500$ (Warning / Heightened Alert)
   - **Level 4 (Red)**: $\text{Risk} \ge 0.3500$ (Critical Emergency Trigger)

---

### 2. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Root information, version, and OpenAPI docs link. |
| `GET` | `/api/v1/health` | Backend and frozen model health status with SHA-256 verification. |
| `GET` | `/api/v1/metadata` | Full model metadata, feature schemas, and experimental status. |
| `POST` | `/api/v1/risk` | Single-point real-time inference ($16\text{ static} + 10\text{ dynamic}$ features). |
| `GET` | `/api/v1/risk/grid` | Serves the statewide Section 34 GeoJSON surface ($3,156$ cells across Meghalaya). |
| `GET` | `/api/v1/risk/grid/summary` | District / Block-level summary statistics across Meghalaya. |
| `GET` | `/api/v1/risk/location` | Nearest-grid cell lookup for any coordinate in Meghalaya. |

---

### 3. Frozen Model Artifacts
- **Model A Path**: `models/expC_random_forest.joblib`
  - SHA-256: `1691cd678c2a9184542d203da13f9fcfe84e8adcf7d57c7cb17c5d3345fafe02`
- **Model B Path**: `models/modelB_production_pipeline.joblib`
  - SHA-256: `e30aacc2f83eaca410a9a782089300ef1e920dd21051c042385d6159d97318f2`

---

### 4. Running the Backend Locally

```bash
# 1. Install dependencies
pip install -r backend/requirements.txt

# 2. Run backend with Uvicorn
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

# 3. Interactive Swagger UI
http://localhost:8000/docs
```

---

### 5. Running Automated Tests

```bash
pytest backend/tests/test_api.py -v
```

---

### 6. Non-Operational & Governance Notice
This backend serves experimental inference derived from retrospective validation experiments. It is not an active public early warning broadcast or official civil protection alert system.
