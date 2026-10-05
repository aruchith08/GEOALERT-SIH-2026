# Deploying GEOALERT Backend to Zoho Catalyst AppSail

This guide provides step-by-step instructions for deploying the **GEOALERT FastAPI Backend & Machine Learning Models** to **Zoho Catalyst AppSail**, replacing Railway after trial expiration.

---

## 1. Why Zoho Catalyst AppSail?

- **Generous Free Quota**: Zoho Catalyst provides a generous free tier with complimentary platform credits renewed every month.
- **Dedicated PaaS (AppSail)**: AppSail is Zoho Catalyst's standalone application platform designed specifically for long-running servers, microservices, and web frameworks like FastAPI, Flask, Express, and Django.
- **Native Python & Docker Support**: Supports managed Python 3.11/3.12 runtimes as well as custom Docker/OCI container deployments.
- **Automated HTTPS & Custom Domains**: Free SSL certificates and subdomains (`*.catalystserverless.com`) ready out of the box.

---

## 2. Platform Architecture & Pre-Configured Files

The repository is already pre-configured for Zoho Catalyst AppSail:

| File | Purpose |
| :--- | :--- |
| `catalyst.json` | Project manifest linking AppSail service to the repository root. |
| `app-config.json` | AppSail configuration specifying startup command, Python runtime, memory allocation, and environment variables. |
| `.catalystignore` | Prevents uploading large raw satellite GIS data (`data/`) and frontend node modules, keeping the deployment archive ultra-lean (~20 MB). |
| `run_server.py` | Production entrypoint that automatically reads `$X_ZOHO_CATALYST_LISTEN_PORT` and applies scikit-learn runtime compatibility patches. |
| `Dockerfile` | Multi-stage production container for Docker-based AppSail deployment. |
| `requirements.txt` | Pinned backend dependencies (`fastapi`, `uvicorn`, `scikit-learn`, `xgboost`, `pandas`, `numpy`, `joblib`, `httpx`). |

---

## 3. Deployment Method A: Zoho Catalyst Web Console (Recommended & Easiest)

You can deploy directly through the browser without installing any command-line tools.

### Step 1: Create a Project in Zoho Catalyst
1. Go to the [Zoho Catalyst Console](https://catalyst.zoho.com) and log in (or sign up for free).
2. Click **Create Project**.
3. Name your project (e.g., `geoalert-platform`) and select your preferred data center region (e.g., US, IN, EU).

### Step 2: Create AppSail Service
1. In the left navigation sidebar under **Develop**, click **AppSail**.
2. Click **Create AppSail** (or **Add AppSail**).
3. Fill in the service details:
   - **AppSail Name**: `geoalert-backend`
   - **Runtime Type**: **Catalyst-Managed Runtime**
   - **Stack**: **Python** (Select **Python 3.12** or **Python 3.11**)

### Step 3: Choose Deployment Source
You have two options:

#### Option 1: Direct GitHub Repository Connection
- Select **Source: GitHub**.
- Connect your GitHub account and select the repository: `GEOALERT-SIH-2026`.
- Branch: `main`.

#### Option 2: Upload ZIP / Folder
- If deploying via ZIP, create a zip file containing the repository root **excluding** `data/` and `frontend/` (the `.catalystignore` already filters this if using CLI).
- Upload the zip file.

### Step 4: Configure Execution & Resources
- **Startup Command**:
  ```bash
  python3 run_server.py
  ```
- **Memory Allocation**:
  - Select **1024 MB** (recommended for Random Forest & XGBoost model inference; minimum 512 MB).
- **Environment Variables**:
  Add the following key-value pairs in the **Environment Variables** section:
  | Key | Value | Description |
  | :--- | :--- | :--- |
  | `PYTHONPATH` | `.` | Ensures Python finds the `backend` package. |
  | `CORS_ORIGINS` | `*` | Allows cross-origin requests from Vercel frontend. |
  | `WEATHER_REFRESH_INTERVAL` | `600` | Mesh weather synchronization cadence (seconds). |
  | `COORDINATE_AUTO_REFRESH_INTERVAL` | `600` | Coordinate forecast cache refresh cadence (seconds). |

### Step 5: Click Deploy
1. Click **Deploy**.
2. Catalyst will automatically:
   - Install dependencies from `requirements.txt`.
   - Start the server using `python3 run_server.py`.
   - Assign a dynamic port via `$X_ZOHO_CATALYST_LISTEN_PORT`.
   - Expose a public HTTPS URL (e.g., `https://geoalert-backend-XXXXXXXXX.development.catalystserverless.com`).

---

## 4. Deployment Method B: Zoho Catalyst CLI

If you prefer deploying from your terminal:

### Step 1: Install Catalyst CLI
Ensure Node.js (v18+) is installed, then install the CLI globally:
```bash
npm install -g zcatalyst-cli
```

### Step 2: Login to Catalyst
```bash
catalyst login
```
*A browser window will open for authentication.*

### Step 3: Initialize Project
In the root directory of this repository:
```bash
catalyst init
```
- When prompted, select your existing Catalyst Project.
- When prompted for components, select **AppSail**.
- Choose `geoalert-backend`.

### Step 4: Deploy
```bash
catalyst deploy
```
Catalyst CLI will bundle the files (respecting `.catalystignore`), upload them, install requirements, and deploy the service.

---

## 5. Deployment Method C: Docker Container on Catalyst

If you want an immutable container runtime on AppSail:

1. Build the Docker container locally:
   ```bash
   docker build -t geoalert-backend:latest .
   ```
2. In the Catalyst Console under **AppSail**:
   - Choose **Runtime Type: Custom Runtime (Docker Image)**.
   - Connect your registry (e.g., Docker Hub: `docker.io/<your-username>/geoalert-backend:latest`).
   - Click **Deploy**.

---

## 6. Verifying the Deployed Backend

Once AppSail finishes deploying, copy your AppSail URL (e.g., `https://geoalert-backend-12345.development.catalystserverless.com`) and test the endpoints:

### 1. Health & Readiness Probe
```bash
curl https://<YOUR_CATALYST_URL>/api/v1/health
```
**Expected Response:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "models_loaded": {
    "model_a_rf": true,
    "model_b_pipeline": true
  },
  "spatial_surface_loaded": true,
  "live_weather_sync_active": true
}
```

### 2. Interactive Swagger Docs
Open in your browser:
```
https://<YOUR_CATALYST_URL>/docs
```

### 3. Landslide Risk Inference Test
```bash
curl -X POST "https://<YOUR_CATALYST_URL>/api/v1/predict/landslide-risk" \
  -H "Content-Type: application/json" \
  -d '{
    "elevation": 1150.0,
    "slope": 28.5,
    "aspect": 145.0,
    "plan_curvature": -0.02,
    "profile_curvature": 0.03,
    "twi": 6.8,
    "spi": 45.0,
    "ndvi_mean": 0.62,
    "soil_clay_fraction": 0.28,
    "soil_sand_fraction": 0.45,
    "soil_bulk_density": 1.35,
    "soil_ph": 5.8,
    "distance_to_roads": 120.0,
    "distance_to_streams": 85.0,
    "landcover_code": 2,
    "lithology_code": 4,
    "rainfall_event_day": 85.0,
    "ari_3": 120.0,
    "ari_7": 195.0,
    "ari_15": 260.0,
    "ari_30": 340.0,
    "max_1day_7d": 85.0,
    "max_3day_30d": 140.0,
    "rainy_days_7d": 5,
    "rainy_days_15d": 11,
    "rainy_days_30d": 19
  }'
```

---

## 7. Connecting Your Frontend on Vercel

To connect your Next.js dashboard deployed on Vercel to the new Zoho Catalyst backend:

1. Open your [Vercel Dashboard](https://vercel.com/dashboard).
2. Select your `geoalert-frontend` project.
3. Go to **Settings** -> **Environment Variables**.
4. Edit or create the environment variable:
   - **Key**: `NEXT_PUBLIC_API_BASE_URL`
   - **Value**: `https://<YOUR_CATALYST_URL>/api/v1`
   - **Environment**: Check **Production**, **Preview**, and **Development**.
5. Click **Save**.
6. Go to **Deployments** -> select the latest deployment -> click **Redeploy**.

Your frontend is now communicating with your high-performance ML backend running on Zoho Catalyst AppSail!

---

## 8. Troubleshooting

### Port Binding Timeout
- **Symptom**: AppSail logs show `Application failed to bind to port within 10 seconds`.
- **Fix**: AppSail dynamically assigns the port via `$X_ZOHO_CATALYST_LISTEN_PORT`. In `run_server.py`, port resolution is already configured:
  ```python
  port = int(os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT") or os.environ.get("PORT") or "8000")
  ```
  Ensure your startup command is `python3 run_server.py`.

### Memory Limit / OOM
- **Symptom**: App crashes upon loading `expC_random_forest.joblib` or `modelB_production_pipeline.joblib`.
- **Fix**: In the Catalyst Console under AppSail settings, increase memory to **1024 MB**.

### CORS Errors
- **Symptom**: Frontend console displays `Access-Control-Allow-Origin missing`.
- **Fix**: Ensure `CORS_ORIGINS=*` is set in AppSail environment variables. The backend CORS middleware will accept all origins by default.
