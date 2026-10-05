# GEOALERT — Cloud Deployment Guide
## Deploying Next.js to Vercel & FastAPI to Render / Railway

---

### Architecture Overview
```
┌──────────────────────────────────────────────┐
│           VERCEL (Frontend Web GIS)          │
│   https://geoalert.vercel.app                │
│   - Next.js 15 App Router                    │
│   - Leaflet Canvas 3,156 cells @ 60fps       │
│   - Light Glassmorphic Command Center        │
└──────────────────────┬───────────────────────┘
                       │ HTTPS API Requests
                       │ (NEXT_PUBLIC_API_BASE_URL)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│       ZOHO CATALYST / RENDER / RAILWAY (Backend API)        │
│   https://geoalert-backend.development.catalystserverless.com│
│   - FastAPI (Python 3.12)                                   │
│   - Frozen Model A (Random Forest)                          │
│   - Frozen Model B (CHIRPS Pipeline)                        │
│   - Multiplicative Risk Engine (<10ms)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Deploying the Backend on Zoho Catalyst AppSail (Recommended)

> For full details, see the complete guide: **[`docs/ZOHO_CATALYST_DEPLOYMENT.md`](ZOHO_CATALYST_DEPLOYMENT.md)**.

Zoho Catalyst AppSail is the ideal zero-cost serverless PaaS for long-running FastAPI services:

1. **Log in** to [Zoho Catalyst Console](https://catalyst.zoho.com).
2. Go to **Develop > AppSail** and click **Create AppSail**.
3. **Configuration**:
   - **Service Name**: `geoalert-backend`
   - **Stack**: `Python` (Python 3.12 or 3.11)
   - **Memory**: `1024 MB`
   - **Startup Command**: `python3 run_server.py`
4. **Environment Variables**:
   - `PYTHONPATH`: `.`
   - `CORS_ORIGINS`: `*`
   - `WEATHER_REFRESH_INTERVAL`: `600`
   - `COORDINATE_AUTO_REFRESH_INTERVAL`: `600`
5. Connect your GitHub repository (`GEOALERT-SIH-2026`, branch `main`) or deploy via CLI (`catalyst deploy`).
6. Copy your public HTTPS URL (e.g., `https://geoalert-backend-XXXXXXXXX.development.catalystserverless.com`).

---

## 2. Deploying the Backend on Render (Alternative)

### **Method A: Render Blueprint (Easiest)**
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Blueprint**.
2. Connect your GitHub repository: `aruchith08/GEOALERT-SIH-2026`.
3. Render will detect `render.yaml` and configure the **FastAPI Web Service**.
4. Click **Apply**.
5. Once deployed, copy your backend URL: e.g. `https://geoalert-backend.onrender.com`.
6. Verify live health: `https://geoalert-backend.onrender.com/api/v1/health` &rarr; `{"status": "ok"}`.

### **Method B: Manual Web Service on Render**
- **Runtime:** Python
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **Health Check Path:** `/api/v1/health`
- **Environment Variables:**
  - `PYTHON_VERSION`: `3.12.8`
  - `CORS_ORIGINS`: `*`

---

## 3. Deploying the Backend on Railway

*(Note: Railway free trial requires payment upon credit expiration; use Zoho Catalyst for ongoing zero-cost hosting).*

1. Go to [Railway Dashboard](https://railway.app/) and click **New Project > Deploy from GitHub repo**.
2. Select `aruchith08/GEOALERT-SIH-2026`.
3. Railway automatically detects `railway.json` and `Procfile`.
4. In **Settings > Networking**, click **Generate Domain**.
5. Copy your live URL: e.g. `https://geoalert-production.up.railway.app`.

---

## 4. Deploying the Frontend on Vercel

1. Go to [Vercel Dashboard](https://vercel.com/) and click **Add New > Project**.
2. Import `aruchith08/GEOALERT-SIH-2026`.
3. In **Project Settings**:
   - **Framework Preset:** Next.js
   - **Root Directory:** `frontend` (or leave default if using root `vercel.json`)
4. In **Environment Variables**, add:
   - **Name:** `NEXT_PUBLIC_API_BASE_URL`
   - **Value:** `https://geoalert-backend-XXXXXXXXX.development.catalystserverless.com/api/v1` (or your Render URL)
5. Click **Deploy**.
6. Your Vercel frontend is live!

---

## 5. Environment Variables Summary

| Component | Variable | Example Value | Description |
| :--- | :--- | :--- | :--- |
| **Frontend** | `NEXT_PUBLIC_API_BASE_URL` | `https://<appsail-url>/api/v1` | URL of the live backend inference service |
| **Backend** | `CORS_ORIGINS` | `*` | Allowed CORS origins (accepts all Vercel preview & production URLs) |
| **Backend** | `X_ZOHO_CATALYST_LISTEN_PORT` | `9000` | Port assigned dynamically by Zoho Catalyst AppSail |
| **Backend** | `PORT` | `8000` | Port assigned dynamically by Render/Railway |
| **Backend** | `PYTHONPATH` | `.` | Python path resolution for package imports |

---

## 6. Verifying Cross-Origin Requests (CORS)

The backend is configured with:
```python
allow_origin_regex = r"https?://.*"
```
This guarantees that **any Vercel deployment** (`https://*-aruchith08.vercel.app`, custom domain, or local development) can query the backend with zero CORS friction.
