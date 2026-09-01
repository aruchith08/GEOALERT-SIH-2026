# SIH 2026 — Product Positioning & Scientific Architecture Dossier
## AI-Powered Landslide Risk Intelligence Platform for Meghalaya

### **1. Executive Summary**
Landslides in Northeast India represent a persistent multi-hazard threat to human life, critical highway transport corridors, and regional connectivity. Traditional warning approaches that rely exclusively on rainfall empirical thresholds ($I-D$ curves) suffer from severe false-alarm rates because rainfall occurs across broad regions regardless of local terrain slope or geotechnical stability.

The **SIH 2026 Landslide Risk Intelligence Platform** introduces a **Dual-Model Multiplicative Spatio-Temporal Coupling Architecture** that explicitly constrains rainfall triggers by baseline terrain susceptibility.

---

### **2. Mathematical Formulation**
Let $x, y$ denote spatial coordinates and $t$ denote time:
- **$P(S)_{xy}$**: Static Landslide Susceptibility evaluated by **Model A** (Random Forest trained on 16 static geotechnical, geomorphological, hydrological, and environmental factors).
- **$P(D)_{xyt}$**: Dynamic Precipitation Trigger Hazard evaluated by **Model B** (HistGradientBoosting trained on 10 Antecedent Rainfall Indices derived from CHIRPS).
- **Coupled Risk Formulation**:
  $$\text{Risk}(x, y, t) = P(S)_{xy} \times P(D)_{xyt}$$

---

### **3. 4-Tier Operational Alert Framework ($T_{\text{coup}} = 0.0502$)**
```
+----------------+-------------------------------+------------------------------------------------------+
| Alert Tier     | Decision Condition            | Operational Action & Characterization                |
+----------------+-------------------------------+------------------------------------------------------+
| Level 1 Green  | Risk < 0.0502 OR P(S) < 0.150 | Low / Baseline Monitoring. Valley false-alarm suppression. |
| Level 2 Yellow | 0.0502 <= Risk < 0.1500       | Advisory Watch. Slope drainage maintenance standby.  |
| Level 3 Orange | 0.1500 <= Risk < 0.3500       | Warning Alert. Highway caution & heavy vehicle limits.|
| Level 4 Red    | Risk >= 0.3500                | Critical Emergency. Imminent failure protocols & closures. |
+----------------+-------------------------------+------------------------------------------------------+
```

---

### **4. Validation Proof Points (Holdout Block 3 East Khasi)**
- **$0.9526$ ROC-AUC** and **$0.9098$ PR-AUC**
- **$80.4\%$ Precision** (vs. $49.2\%$ for rainfall-only Model B)
- **$71.0\%$ Reduction in False Alarms**
- **$82.2\%$ Recall** capturing confirmed landslide events
