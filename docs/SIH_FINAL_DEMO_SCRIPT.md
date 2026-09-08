# GEOALERT — SIH 2026 Grand Finale Live Demonstration Script

**Duration:** 5 Minutes  
**Target Audience:** SIH Grand Finale Evaluators, Disaster Management Dignitaries, Technical Judges  
**Presenter Roles:** Lead ML Architect & GIS Systems Engineer  

---

### [0:00 - 0:45] Minute 1: The Core Scientific Problem & The False Alarm Paradox

**Action:** Open dashboard at `http://localhost:3000`. Show the clean light-mode glassmorphic interface.

**Speaker:**
> "Honorable Judges, Meghalaya is home to Sohra and Mawsynram—the wettest regions on Earth. When heavy monsoon rain falls on steep slopes, deadly landslides strike. But current early warning systems have a fatal flaw: they rely purely on rainfall thresholds.
>
> When 100mm of rain falls, legacy systems flag the entire state as Red Alert. That triggers panic and unnecessary evacuations in flat river valleys where landslides are physically impossible, while failing to pinpoint fractured highway cuts.
>
> **GEOALERT solves this.** We decouple landslide hazard into two mathematically separate models:
> Model A evaluates static geotechnical terrain susceptibility $P(S)$.
> Model B evaluates dynamic antecedent precipitation triggers $P(D)$.
> They couple multiplicatively: $\text{Risk} = P(S) \times P(D)$.
> The result: **0.9526 ROC-AUC** and a **71% reduction in false alarms**."

---

### [0:45 - 1:45] Minute 2: Real-Time Weather Monitoring & 12-Station Meteorological Mesh

**Action:** Point to the top Navbar status pill and the 12-station regional mesh.

**Speaker:**
> "Look at our Navbar status indicator: `● LIVE WEATHER — Last Updated: 2 min ago`. This is not a static demo—it is an authentic real-time telemetry pipeline connected to Open-Meteo Global NWP.
>
> Meghalaya has extreme orographic microclimates. The southern escarpment receives torrential downpours while the northern slopes sit in rain shadows. GEOALERT resolves this through a **12-Station Regional Meteorological Mesh**—from Sohra and Mawsynram to Umsning and Tura.
>
> Each cell out of our 3,156 regional grid points is mapped to its nearest meteorological station via geodesic Haversine distance, evaluating 10 rolling antecedent precipitation features in real-time."

---

### [1:45 - 2:45] Minute 3: The 6-Layer Switcher & The Umsning vs. Sohra Demonstration

**Action:** Click the **6-Layer Switcher** buttons, then click the **Sohra** pill, followed by the **Umsning Valley** pill.

**Speaker:**
> "Notice our 6-Layer GIS Switcher. When viewing **Current Rainfall (mm)**, we use a distinct cyan-to-purple sequential palette, completely separate from our green, yellow, orange, and red risk tiers. A judge or civil operator will never confuse rainfall depth with landslide risk.
>
> Now, let us prove False Alarm Suppression live:
> First, I click **Sohra (Cherrapunjee)**. Terrain susceptibility $P(S)$ is high at 0.715. Coupled risk reaches 0.449—**Level 4: Red Alert**. Urgent slope closures and patrol teams are required.
>
> Now, under the exact same storm, I click **Umsning Valley**.
> Look at the difference: Model A terrain susceptibility is only 0.051. Because the terrain is flat, coupled risk is just 0.032—**Level 1: Green**.
> Legacy systems would have evacuated Umsning. GEOALERT suppresses the false alarm with mathematical precision."

---

### [2:45 - 3:45] Minute 4: 7-Day Forecast Risk Timeline & Location Intelligence

**Action:** Scroll down to the **7-Day Dynamic Risk Forecast Timeline**, then highlight the **Location Intelligence Inspector**.

**Speaker:**
> "Disaster management cannot wait until rain has already fallen. GEOALERT provides forward-looking decision support through our **7-Day Dynamic Risk Forecast Timeline**.
>
> Using 168-hour numerical weather predictions, our rolling feature engine projects antecedent pore pressure saturation forward for each day. Notice our **Peak Risk Alert Banner**, which warns operators exactly which day will experience maximum hazard.
>
> When we inspect any location, GEOALERT generates **Explainable AI (XAI)** breaking down bedrock factors and coupling synergies, coupled with actionable decision support—such as inspecting catch-fences and clearing culvert blockages."

---

### [3:45 - 5:00] Minute 5: Scientific Integrity, Robustness & NER Scalability

**Action:** Navigate to `/methodology` and `/infrastructure`.

**Speaker:**
> "To ensure scientific rigor, both Model A and Model B are cryptographically frozen with verified SHA-256 hashes. Our regression suite passes 32 out of 32 unit and integration tests.
>
> On our **Infrastructure Corridors** page, we track critical highway lifelines including NH-40, NH-44/NH-6, and state highways with segmented mileage risk profiles.
>
> Crucially, GEOALERT operates under **RESEARCH / ADVISORY MODE** with strict scientific honesty—we never fabricate live telemetry. Furthermore, this architecture is fully scalable across all 8 Northeast Indian states and the Western Ghats.
>
> GEOALERT turns raw geospatial and meteorological data into actionable, life-saving intelligence. Thank you, and we welcome your questions."
