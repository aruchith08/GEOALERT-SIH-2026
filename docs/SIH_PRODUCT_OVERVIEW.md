# GEOALERT — Comprehensive Product Overview
## Smart India Hackathon (SIH 2026) • Problem Statement ID: SIH-2026-GEOALERT

---

### 1. Executive Summary & Operational Challenge

Meghalaya presents one of the most severe landslide hazards in South Asia. Cherrapunjee (Sohra) and Mawsynram receive 8,000–12,000 mm of annual rainfall. When intense precipitation interacts with steep, fractured Precambrian gneiss and roadside cut slopes along critical highway corridors (e.g. NH-40, NH-44/NH-6), catastrophic slope failures routinely sever connectivity.

Traditional landslide early warning systems rely exclusively on empirical rainfall threshold curves (e.g. Caine, 1980; Guzzetti et al., 2007). These systems suffer from a fatal operational defect: **excessive false alarms over flat, stable topography** (such as the Umsning Valley basin), eroding civil trust and misdirecting emergency resources.

**GEOALERT** provides a definitive scientific and engineering solution:
- **Dual-Model Decoupling**: Rigorously separates static geotechnical terrain susceptibility $P(S)$ from dynamic precipitation triggers $P(D)$.
- **Multiplicative Coupling Formula**:
  $$\text{Risk}(x, y, t) = P(S)_{xy} \times P(D)_{xyt}$$
- **Decision Threshold Floor**: $T_{\text{coup}} = 0.0502$ and $P(S)_{\text{floor}} = 0.1500$.
- **Demonstrated Efficacy**:
  - **0.9526 ROC-AUC** & **0.9098 PR-AUC** on untouched spatial holdout evaluation.
  - **71.0% False Alarm Reduction** compared to uncoupled rainfall-only baselines.
  - **Real-Time 12-Station Meteorological Mesh** across Meghalaya.
  - **7-Day Forward Risk Forecasting** with peak hazard identification.

---

### 2. Dual-Model Architecture & Cryptographic Integrity

1. **Model A — Static Terrain Susceptibility $P(S)$**:
   - Algorithm: Random Forest Classifier (100 estimators, max depth 12)
   - Predictors: 16 geotechnical, geomorphic, and lithological features (Elevation, Slope, Aspect, Plan/Profile Curvature, TWI, Flow Accumulation, Distance to Faults, Distance to Streams, Distance to Roads, Lithology, Soil Type, Land Cover, Geomorphic Zone, Road Density, Drainage Density).
   - Artifact: `models/expC_random_forest.joblib`
   - SHA-256: `1691cd678c2a9184cf608a9db0e464daee1e9daf237fd2c387b6d936685d5631`

2. **Model B — Dynamic Rainfall Trigger Hazard $P(D)$**:
   - Algorithm: HistGradientBoostingClassifier Pipeline with StandardScaler
   - Predictors: 10 dynamic CHIRPS precipitation indicators ($P_0$, $ARI_3$, $ARI_7$, $ARI_{15}$, $ARI_{30}$, $Max1d_{7d}$, $Max3d_{30d}$, $RainyDays_{7d}$, $RainyDays_{15d}$, $RainyDays_{30d}$).
   - Artifact: `models/modelB_production_pipeline.joblib`
   - SHA-256: `e30aacc2f83eaca410a9a782089300ef1e920dd21051c042385d6159d97318f2`

3. **Section 34 Spatial Surface**:
   - Grid: 3,156 discrete spatial cells covering all 5 regional blocks of Meghalaya.
   - GeoJSON: `data/phase4/section34_spatial_risk/phase4_section34_regional_risk_surface.geojson`

---

### 3. Real-Time Meteorological Monitoring & 12-Station Mesh

Meghalaya exhibits intense orographic microclimates. GEOALERT models this spatial heterogeneity via 12 regional meteorological stations:
- **East Khasi Escarpment**: Sohra (Cherrapunjee), Mawsynram, Shillong Central.
- **Ri-Bhoi Leeward Basin**: Umsning Valley (False Alarm Suppression benchmark), Nongpoh Foothills.
- **Jaintia Hills Mining Corridor**: Jowai Plateau, Khliehriat Escarpment.
- **West Khasi Highlands**: Nongstoin Central, Mairang Granite Dome.
- **Garo Hills Foothills**: Tura Peak, Williamnagar Simsang Valley, Baghmara Border.

Each station continuously updates hourly and daily precipitation, temperature, relative humidity, wind speed, and computes dynamic $P(D)$ from a rolling 31-day antecedent observation window.

---

### 4. 7-Day Forecast-Driven Predictive Timeline

GEOALERT incorporates forward numerical weather predictions (ECMWF IFS / GFS) across a 168-hour horizon:
- Simulates daily rainfall accumulation for Days +1 to +7.
- Dynamically updates antecedent moisture indicators ($ARI_3$, $ARI_7$, $ARI_{15}$, $ARI_{30}$) along a forward rolling window.
- Evaluates Model B on projected feature vectors to compute daily $P(D)_{xyt}$.
- Determines peak coupled hazard date, offset, and trend alert.

---

### 5. Multi-Spectral 6-Layer Web GIS Switcher

The dashboard provides 6 distinct analytical views with complete visual separation between hazard risk tiers and physical rainfall depth:
1. `Coupled Risk P(S) * P(D)`: Operational 4-tier risk classification.
2. `Terrain Susceptibility P(S)`: Baseline static ground vulnerability.
3. `Dynamic Trigger P(D)`: Immediate rainfall pore-pressure trigger hazard.
4. `Live Rainfall (mm)`: Spatially variable precipitation rendered in a **distinct Cyan-to-Purple sequential palette** (`<5mm`, `5-20mm`, `20-50mm`, `≥50mm`).
5. `Forecast Rainfall`: Projected 7-day cumulative precipitation.
6. `Forecast Risk`: Projected peak coupled hazard over the next 168 hours.

---

### 6. Operational Protocol & Scientific Disclaimer
GEOALERT operates under **RESEARCH / ADVISORY MODE**. It provides scientific decision-support for disaster management authorities and infrastructure engineers. It is not an official statutory civil protection evacuation broadcast.
