# GEOALERT — Comprehensive Judge Technical & Scientific Q&A
## Smart India Hackathon (SIH 2026)

---

### Q1: How do you ingest live weather data in real time, and what is your update latency?
**Answer:**
GEOALERT connects to Open-Meteo Global Numerical Weather Prediction (NWP) models (synthesizing ECMWF IFS and GFS feeds). The ingestion pipeline retrieves hourly and daily precipitation, temperature, relative humidity, and wind speed. 
To optimize responsiveness and avoid third-party API rate-limiting, GEOALERT uses a thread-safe in-memory cache with a 15-minute TTL. Grid cell assignments across our 12-station regional mesh are pre-computed using vectorized Haversine geodesic calculations, allowing the backend to serve spatially variable risk updates for all 3,156 cells in under 45 milliseconds.

---

### Q2: Why decouple static terrain susceptibility P(S) from dynamic rainfall trigger P(D)?
**Answer:**
Decoupling static and dynamic factors is the central scientific innovation of GEOALERT. Traditional empirical rainfall thresholds (e.g., Caine, 1980) collapse all variables into a single precipitation threshold ($I = a \cdot D^{-b}$). This creates massive operational false alarms over flat, alluvial basins where slope failure is physically impossible regardless of rainfall accumulation.
By separating static ground vulnerability $P(S)$ (16 geotechnical/lithological predictors) from dynamic pore-pressure triggers $P(D)$ (10 antecedent CHIRPS predictors), and multiplying them with an operational susceptibility floor ($P(S)_{\text{floor}} = 0.1500$), GEOALERT reduces false alarms by 71.0% while achieving 0.9526 ROC-AUC on spatial holdout tests.

---

### Q3: What happens if internet connectivity is severed or the weather API is unreachable?
**Answer:**
GEOALERT implements a resilient 4-state fallback architecture governed by scientific honesty:
1. **Fresh Cache**: Serves live data if cached within 15 minutes.
2. **Stale Cache**: If external requests fail but cached data exists (<60 min), data is served with an amber `WEATHER DATA STALE` banner.
3. **Calibrated Geomorphic Scenarios**: If completely offline, the system seamlessly transitions to calibrated seasonal scenarios (Dry Season, Moderate Monsoon, Active Monsoon Surge, Extreme Cloudburst) with an explicit `DEMO / SCENARIO MODE` badge.
4. **Zero Fabrication**: The system *never* claims live status when operating on fallback data.

---

### Q4: Why are rainfall map colors cyan-to-purple while risk colors are green-yellow-orange-red?
**Answer:**
This is an intentional cartographic design decision to prevent cognitive overload and catastrophic decision errors. In emergency management, green, yellow, orange, and red represent operational alert tiers (Safe, Advisory, Warning, Critical Hazard). 
If rainfall accumulation were also rendered in green-yellow-red, an operator might misinterpret a heavy rain reading over a safe valley as a critical landslide alert. GEOALERT renders physical rainfall depth in a sequential Cyan-to-Purple palette (`<5mm`: Cyan, `5-20mm`: Blue, `20-50mm`: Indigo, `≥50mm`: Purple), ensuring hazard severity and physical precipitation are never visually conflated.

---

### Q5: How do you project risk 7 days into the future without satellite rainfall data for future days?
**Answer:**
Future rainfall is projected using numerical weather prediction (NWP) quantitative precipitation forecasts (QPF). Our rolling dynamic feature engine takes the 30-day historical antecedent accumulation window, appends the forecasted daily rainfall for Days +1 through +7, and dynamically recalculates the antecedent indicators ($ARI_3$, $ARI_7$, $ARI_{15}$, $ARI_{30}$, $Max1d_{7d}$, $Max3d_{30d}$, and rainy day counts) along a sliding forward window. 
Model B is then evaluated on each forward feature vector to project daily $P(D)_{xyt}$ and coupled risk, identifying the exact peak hazard date and offset.

---

### Q6: Can this platform scale beyond Meghalaya to other Northeast Indian states or the Western Ghats?
**Answer:**
Yes, GEOALERT was architected from Day 1 for regional scalability:
- **Global / Regional Predictors**: All 16 static features (SRTM DEM, ALOS PALSAR, Sentinel-2 NDVI, GSI lithology) and 10 dynamic features (CHIRPS / Open-Meteo) have seamless coverage across the entire North Eastern Region (NER) and Western Ghats.
- **Mesh Expandability**: The regional meteorological mesh dynamically expands simply by registering station coordinates in `weather_mesh.py`.
- **Validation**: Our 5-fold spatial block cross-validation demonstrates high generalization across unseen geological formations.

---

### Q7: Does GEOALERT issue official civil evacuation orders?
**Answer:**
No. GEOALERT operates strictly under **RESEARCH / ADVISORY MODE**. It is an advanced scientific decision-support system designed to empower disaster management authorities (SDMA / DDMA) and highway engineers with predictive insights. Official statutory civil evacuation orders remain the sole legal authority of district magistrates and authorized government agencies.
