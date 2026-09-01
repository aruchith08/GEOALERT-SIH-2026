# SIH 2026 — 3–5 Minute Judge Demonstration Walkthrough
## Meghalaya Landslide Risk Intelligence Platform

### **Objective**
Deliver a crisp, authoritative, 3–5 minute presentation demonstrating why dual-model spatio-temporal coupling is mathematically and practically superior to single-variable rainfall alerting.

---

### **Step 1: Introduction & Problem Statement (30 seconds)**
- **Action**: Open `http://localhost:3000` (Main Dashboard).
- **Speaking Point**:
  > *"Traditional landslide early warning systems rely strictly on rainfall depth thresholds. When heavy monsoon rain hits Meghalaya, traditional models issue widespread alarms across entire districts—causing severe false alarms on flat alluvial valleys and road passes that are structurally safe.*
  > *Our SIH 2026 platform solves this by coupling **Model A (Static Terrain Susceptibility)** with **Model B (Dynamic Precipitation Trigger Hazard)** into a joint multiplicative risk formulation."*

---

### **Step 2: Interactive Regional Risk Map (45 seconds)**
- **Action**: Showcase the 3,156-cell Leaflet canvas spanning Meghalaya. Toggle the Spatial Block filter to *East Khasi Block* and *Garo Hills Block*.
- **Speaking Point**:
  > *"Here we see all 3,156 regional cells spanning the state of Meghalaya in EPSG:4326 WGS 84.*
  > *Notice that despite a uniform active-monsoon rainfall forcing across the state, **91.9% of the state remains safely classified as Level 1 Green** because flat valleys lack geomorphic failure susceptibility.*
  > *Critical Level 4 Red emergency triggers (0.3% of cells) are tightly constrained to steep escarpments and active highway road cuts in East Khasi and Jaintia Hills."*

---

### **Step 3: Location Inspector & Explainable AI (60 seconds)**
- **Action**: Click a **Red Cell** (e.g. `CELL_MEG_0512` near Sohra Gorge) to open the side Inspector. Then click a **Green Cell** in an alluvial plain.
- **Speaking Point**:
  > *"When we click a critical cell on the Sohra escarpment, the Location Inspector decomposes the threat:*
  > *• Static Susceptibility P(S) = 0.62 (Steep 42° slope, fractured sandstone, near highway cut)*
  > *• Dynamic Precipitation P(D) = 0.63 (Sustained antecedent saturation)*
  > *• Coupled Risk = P(S) × P(D) = 0.3918 -> **Level 4: Red Critical Alert**.*
  > *Now, if we click a flat valley cell under the exact same storm:*
  > *• Static P(S) = 0.04 (4° slope) -> Coupled Risk = 0.0248 -> **Level 1: Green Safe**.*
  > *Our terrain safety constraint **automatically suppresses false alarms on flat terrain**, saving emergency response resources."*

---

### **Step 4: Regional Analytics & Block Benchmarks (45 seconds)**
- **Action**: Navigate to `/analytics`.
- **Speaking Point**:
  > *"In our Regional Analytics view, we observe district-level aggregations:*
  > *• East Khasi accounts for 90% of Level 4 Red emergency alerts due to extreme relief.*
  > *• Garo Hills demonstrates 98.6% Green stability.*
  > *This demonstrates robust geographic discrimination across the 5 spatial partitions of Meghalaya."*

---

### **Step 5: Transport Infrastructure Stress Simulations (45 seconds)**
- **Action**: Navigate to `/infrastructure`. Toggle through **Dry Season**, **Active Monsoon**, and **Severe Cloudburst** scenarios for the *NH-40 Guwahati–Shillong Highway*.
- **Speaking Point**:
  > *"For infrastructure stakeholders like NHAI and BRO, we provide multi-scenario corridor simulations across 5 critical arteries:*
  > *On NH-40, risk scales monotonically from 0.02 (Green) in the dry season to 0.36 (Red) under active monsoon and 0.52 (Red) during extreme cloudbursts—identifying exactly where slope drainage and stabilization works are urgent."*

---

### **Step 6: Methodology & Retrospective Validation Evidence (30 seconds)**
- **Action**: Navigate to `/methodology`. Highlight the validation metrics box.
- **Speaking Point**:
  > *"Our dual-model coupling was strictly validated against an independent geographic holdout partition (Block 3 East Khasi):*
  > *• **0.9526 ROC-AUC** and **0.9098 PR-AUC**.*
  > *• **80.4% Precision** and **82.2% Recall**.*
  > *• **71.0% False Alarm Reduction** over rainfall-only baselines."*

---

### **Step 7: Conclusion & Production Packaging (15 seconds)**
- **Action**: Navigate to `/about` showing frozen SHA-256 hashes.
- **Speaking Point**:
  > *"The complete stack is fully containerized with Docker, REST API endpoints via FastAPI, and an offline-resilient Next.js GIS frontend ready for operational integration."*
