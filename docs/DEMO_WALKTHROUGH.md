# GEOALERT — Comprehensive Demo Walkthrough Guide

This walkthrough guides evaluators, judges, and operators through the complete real-time weather monitoring and forecast-driven landslide risk intelligence platform.

---

### Step 1: Open Dashboard & Inspect 4-State Navbar Indicator
1. Navigate to `http://localhost:3000`.
2. Observe the top navigation bar status indicator:
   - **State 1 (Live Weather)**: `● LIVE WEATHER — Last Updated: 2 min ago` (Pulsing green dot, connected to Open-Meteo NWP).
   - **State 2 (Stale Cache)**: `● WEATHER DATA STALE — Last Updated: 35 min ago` (Amber indicator if cache exceeds TTL).
   - **State 3 (Demo / Scenario)**: `● DEMO / SCENARIO MODE` (Blue indicator when evaluating calibrated historical scenarios).
   - **State 4 (Offline Fallback)**: `● WEATHER PROVIDER UNAVAILABLE` (Rose indicator if provider is disconnected).
3. Confirm the operational mode badge: `RESEARCH / ADVISORY`.

---

### Step 2: Explore the 6-Layer Multi-Spectral Web GIS Switcher
In the floating glass layer pill bar above the map, switch between all 6 layers:
1. **Coupled Risk (Default)**: Visualizes the final operational risk tiers (Green, Yellow, Orange, Red).
2. **Terrain P(S)**: Visualizes Model A static ground vulnerability. Notice high values along the southern Meghalaya escarpment.
3. **Trigger P(D)**: Visualizes Model B rainfall trigger probability.
4. **Live Rain (mm)**: Notice the **distinct Cyan-to-Purple sequential palette** (`<5mm`: Cyan, `5-20mm`: Royal Blue, `20-50mm`: Indigo, `≥50mm`: Deep Purple). Explain that this separation ensures physical rainfall depth is never confused with landslide hazard alert tiers.
5. **Forecast Rain**: Visualizes 7-day forward precipitation accumulation.
6. **Forecast Risk**: Displays the peak forward-projected coupled hazard across the next 168 hours.

---

### Step 3: Test Pinned Location 1 — Sohra / Cherrapunjee (`CELL_MEG_0878`)
Click the **Sohra (Cherrapunjee)** pill:
- The map smoothly flies and centers on `CELL_MEG_0878`.
- Model A Terrain Susceptibility: $P(S) = 0.7152$ (Steep 28.4° escarpment slope).
- Model B Dynamic Trigger: $P(D) = 0.6284$ (Heavy orographic precipitation).
- Coupled Risk: $P(S) \times P(D) = 0.4494$ &bull; **Level 4: Red (Critical Hazard)**.
- **Key Insight**: Demonstrates that high rainfall coinciding with steep topography triggers immediate emergency response.

---

### Step 4: Test Pinned Location 2 — Umsning Valley (`CELL_MEG_2427`) [FALSE ALARM SUPPRESSION]
Click the **Umsning Valley** pill:
- The map centers on `CELL_MEG_2427`.
- Model A Terrain Susceptibility: $P(S) = 0.0515$ (Flat 3.2° valley basin, 610m elevation).
- Model B Dynamic Trigger: $P(D) = 0.6284$ (Identical regional rainfall).
- Coupled Risk: $P(S) \times P(D) = 0.0323$ &bull; **Level 1: Green (Safe Baseline)**.
- **Key Scientific Insight**: Demonstrates **71.0% False Alarm Suppression**. A traditional rainfall-only threshold would sound a red alert here; GEOALERT's geotechnical floor ($P(S)_{\text{floor}} = 0.1500$) prevents needless civil disruption.

---

### Step 5: Test Pinned Location 3 — NH-40 Corridor (`CELL_MEG_0765`)
Click the **NH-40 Highway** pill:
- The map centers on `CELL_MEG_0765`.
- Model A: $P(S) = 0.3542$ (Road cut slope, 22.1°).
- Coupled Risk: **Level 3: Orange (Heightened Warning)**.
- **Key Insight**: Protects critical freight lifelines between Guwahati and Shillong.

---

### Step 6: Explore 7-Day Forecast Risk Timeline
Scroll down to the **7-Day Dynamic Risk Forecast Timeline**:
1. Review the 7 daily forecast cards displaying date, day offset, forecast precipitation, dynamic trigger $P(D)$, and coupled risk score.
2. Note the **Peak Risk Alert Banner** highlighting the exact date of maximum projected hazard.
3. Click any individual day card to expand daily geotechnical features ($ARI_3$, $ARI_7$, $ARI_{15}$, $ARI_{30}$).

---

### Step 7: Inspect Location Intelligence Panel & Decision-Support XAI
On the right-side inspector panel:
1. Review coordinates, elevation, and terrain slope.
2. Read the **Explainable AI (XAI)** rationale separating Terrain factors from Coupling Synergy.
3. Review the **Decision-Support Recommended Action** card (drainage inspection, catch-fence maintenance).
4. Inspect the **Data Confidence Indicator** (`HIGH CONFIDENCE`, Open-Meteo NWP Global Model, 30-day antecedent window).
