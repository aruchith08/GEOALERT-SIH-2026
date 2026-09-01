# SIH 2026 Grand Finale — Final Presentation Script
## AI-Powered Spatio-Temporal Landslide Risk Intelligence Platform (Meghalaya)
**Target Duration:** 4 minutes 30 seconds | **Mode:** RESEARCH / ADVISORY DEMONSTRATION

---

### **[0:00 – 0:30] Phase 1: The Problem with Rainfall-Only Warning Systems**
- **Action:** Presenter stands with Dashboard open on projector (`http://localhost:3000`).
- **Presenter Script:**
  > *"Respected Jury members, in high-relief mountainous terrains like Meghalaya and Northeast India, landslides cause catastrophic loss of life and sever critical highway corridors every monsoon season.*
  > *Existing operational warning systems rely almost exclusively on rainfall empirical thresholds. When a 50mm storm occurs over a district, traditional systems issue blanket emergency alarms across hundreds of square kilometers. This triggers severe false alarms in flat alluvial valleys and stable road sections that have zero geomorphic failure hazard.*
  > *Today, we present the **SIH 2026 Meghalaya Landslide Risk Intelligence Platform**, which solves this fundamental problem through a mathematically rigorous **Dual-Model Multiplicative Spatio-Temporal Coupling Architecture**."*

---

### **[0:30 – 1:15] Phase 2: Dual-Model Coupling Architecture**
- **Action:** Point to the Top KPI cards and coupling equation on the UI.
- **Presenter Script:**
  > *"Our core scientific principle is that rainfall cannot cause a landslide where the slope cannot physically fail. We decouple risk into two distinct machine learning models:*
  > *1. **Model A (Static Susceptibility)**: Evaluates 16 geotechnical, terrain, and hydrological features—such as slope, curvature, soil clay fraction, and road proximity—to generate baseline terrain failure probability $P(S)$.*
  > *2. **Model B (Dynamic Trigger)**: Evaluates 10 antecedent precipitation indices derived from multi-day CHIRPS time-series to generate dynamic rainfall trigger hazard $P(D)$.*
  > *We combine these models multiplicatively:*
  > $$\text{Risk}(x, y, t) = P(S)_{xy} \times P(D)_{xyt}$$
  > *Using our frozen decision threshold $T_{\text{coup}} = 0.0502$, rainfall triggers are strictly constrained by geomorphic slope susceptibility."*

---

### **[1:15 – 2:15] Phase 3: Interactive Regional Risk Map**
- **Action:** Navigate the Leaflet Map. Zoom into the Shillong–Sohra plateau corridor. Filter by *East Khasi Block*.
- **Presenter Script:**
  > *"On our interactive Web GIS canvas, we are rendering all **3,156 regional spatial cells** spanning the entire state of Meghalaya in EPSG:4326.*
  > *Notice that under an active monsoon surge across the state, **91.9% of Meghalaya remains safely classified as Level 1 Green**.*
  > *The system isolates emergency alerts to just **10 critical Level 4 Red cells (0.3%)** concentrated along the deeply incised Southern Escarpment and active highway cuts."*

---

### **[2:15 – 2:45] Phase 4: Location Inspector & Explainable AI**
- **Action:** Click a **Red Cell** near Sohra Gorge, then click a **Green Cell** in the nearby valley.
- **Presenter Script:**
  > *"When we click on a critical cell on the Sohra escarpment, the Location Inspector breaks down the risk:*
  > *• Static P(S) = 0.62 (42° slope, fractured sandstone)*
  > *• Dynamic P(D) = 0.63 (Saturated soil moisture)*
  > *• Coupled Risk = 0.3918 -> **Level 4: Red Critical Trigger**.*
  > *In contrast, clicking a flat valley cell under the exact same storm shows:*
  > *• Static P(S) = 0.04 (4° slope) -> Coupled Risk = 0.0248 -> **Level 1: Green Safe**.*
  > *Our terrain safety constraint automatically suppresses valley false alarms with 100% mathematical explainability."*

---

### **[2:45 – 3:20] Phase 5: Regional Analytics**
- **Action:** Switch to `/analytics` tab.
- **Presenter Script:**
  > *"Our Regional Analytics engine benchmarks vulnerability across all 5 spatial blocks:*
  > *• **East Khasi** carries 90% of Level 4 emergency cells due to extreme relief.*
  > *• **Garo Hills** exhibits 98.6% Green stability.*
  > *This granular spatial discrimination enables state disaster authorities to pre-position earth-moving equipment and emergency personnel with precision."*

---

### **[3:20 – 3:50] Phase 6: Highway Infrastructure Stress Simulations**
- **Action:** Switch to `/infrastructure` tab. Toggle between Dry, Monsoon, and Cloudburst on NH-40.
- **Presenter Script:**
  > *"For infrastructure stakeholders like NHAI and BRO, we simulate 5 critical transport corridors:*
  > *On the vital **NH-40 Guwahati–Shillong Highway**, we model how risk scales from 0.02 (Green) during dry conditions to 0.36 (Red) under active monsoon, identifying vulnerable cut-slopes before disasters strike."*

---

### **[3:50 – 4:30] Phase 7: Retrospective Validation Proof Points & Governance**
- **Action:** Switch to `/methodology` tab, highlight the validation metrics.
- **Presenter Script:**
  > *"Our coupling formulation was rigorously tested on an untouched geographic holdout partition (East Khasi Block 3):*
  > *• **0.9526 ROC-AUC** and **0.9098 PR-AUC**.*
  > *• **80.4% Precision** and **82.2% Recall**.*
  > *• **71.0% Reduction in False Alarms** compared to rainfall-only models.*
  > *All production models are cryptographically frozen with SHA-256 integrity verification."*

---

### **[4:30 – 5:00] Phase 8: Conclusion & Operations**
- **Action:** Switch to `/about` tab.
- **Presenter Script:**
  > *"The complete platform is fully containerized with Docker, REST API endpoints via FastAPI, and an offline-resilient Next.js GIS frontend ready for operational integration.*
  > *Thank you, and we now welcome your questions."*
