# SIH 2026 — Meghalaya Landslide Risk Intelligence Platform
## Frontend Web GIS Dashboard (Section 36)

### 1. Overview
The SIH 2026 Landslide Risk Intelligence Platform is an interactive geospatial decision-support application for Meghalaya and Northeast India. It fuses:
- **Model A (Static Susceptibility)**: 16 environmental and geotechnical terrain features $\to P(S) \in [0, 1]$
- **Model B (Dynamic Precipitation Trigger Hazard)**: 10 CHIRPS antecedent rainfall predictors $\to P(D) \in [0, 1]$
- **Coupled Risk Formulation**: $\text{Risk}(x, y, t) = P(S) \times P(D)$ with frozen threshold $T_{\text{coup}} = 0.0502$
- **4-Tier Operational Alert Architecture**:
  - **Level 1 (Green)**: $\text{Risk} < 0.0502$ OR $P(S) < 0.1500$
  - **Level 2 (Yellow)**: $0.0502 \le \text{Risk} < 0.1500$
  - **Level 3 (Orange)**: $0.1500 \le \text{Risk} < 0.3500$
  - **Level 4 (Red)**: $\text{Risk} \ge 0.3500$

---

### 2. Architecture & Pages

- **Risk Map (`/` & `/risk-map`)**: Interactive Leaflet canvas rendering 3,156 spatial cells across Meghalaya, complete with spatial block filtering, alert tier filtering, minimum risk slider, and an interactive Location Inspector.
- **Analytics (`/analytics`)**: District and spatial block aggregations comparing mean $P(S)$, mean $P(D)$, mean risk, and high-risk percentages.
- **Infrastructure (`/infrastructure`)**: 5 critical transport corridors (NH-40, NH-44/NH-6, Shillong–Sohra, Tura–Williamnagar, Nongstoin–Mawkyrwat) under Dry, Monsoon, and Cloudburst storm simulations.
- **Methodology (`/methodology`)**: Architectural pipeline diagrams, 16 static / 10 dynamic feature specifications, and retrospective validation metrics ($0.9526$ ROC-AUC, $71\%$ false alarm reduction).
- **About (`/about`)**: System governance, SHA-256 cryptographic model hashes, and open-source tech stack.

---

### 3. Setup and Local Execution

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# Open http://localhost:3000 in your browser
```

---

### 4. Backend Connection & Offline Resilience
- Configured to communicate with the FastAPI backend at `http://localhost:8000/api/v1` via `NEXT_PUBLIC_API_BASE_URL`.
- If the backend is starting up or offline, the frontend gracefully falls back to the embedded Section 34 GeoJSON surface with zero crashes.

---

### 5. Research & Non-Operational Disclaimer
This platform is an experimental ML research product for disaster management and decision support. It is not an active public early-warning broadcast.
