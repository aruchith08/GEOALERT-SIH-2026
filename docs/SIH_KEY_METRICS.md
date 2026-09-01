# SIH 2026 — Official Key Metrics & Scientific Scorecard

```
+========================================================================================================+
|                                    SIH 2026 SCIENTIFIC SCORECARD                                       |
+========================================================================================================+
| METRIC CATEGORY                     | PARAMETER / FORMULATION               | VALUE / AUDIT STATUS    |
+-------------------------------------+---------------------------------------+-------------------------+
| Regional Spatial Grid Coverage      | EPSG:4326 (Meghalaya State)           | 3,156 Valid Cells       |
| Model A: Static Susceptibility      | Random Forest (16 Environmental Feats)| P(S) in [0.0, 1.0]      |
| Model B: Dynamic Trigger Hazard     | HistGradientBoosting (10 CHIRPS Feats)| P(D) in [0.0, 1.0]      |
| Spatio-Temporal Coupling Equation   | Risk(x,y,t) = P(S) * P(D)             | Multiplicative Joint    |
| Operational Decision Threshold      | T_coup                                | 0.0502 (Frozen)         |
| Static Terrain Safety Floor         | P(S)_floor                            | 0.1500 (Valley Guard)   |
| Holdout ROC-AUC (Block 3)           | Untouched East Khasi Partition        | 0.9526                  |
| Holdout PR-AUC (Block 3)            | Precision-Recall Area                 | 0.9098                  |
| Holdout Precision                   | TP / (TP + FP)                        | 80.4%                   |
| Holdout Recall / Sensitivity        | TP / (TP + FN)                        | 82.2%                   |
| False Alarm Reduction               | Over Dynamic Model B Baseline         | 71.0% Reduction         |
| Backend Inference Latency           | Single-point /api/v1/risk             | 73.9 ms                 |
| Spatial GeoJSON Serving Latency     | Full 3,156-point Grid                 | 134.1 ms                |
| Model A SHA-256 Checksum            | expC_random_forest.joblib             | 1691cd678c2a9184...     |
| Model B SHA-256 Checksum            | modelB_production_pipeline.joblib     | e30aacc2f83eaca4...     |
| System Operating Status             | Non-Operational Research Prototype    | RESEARCH / ADVISORY     |
+========================================================================================================+
```
