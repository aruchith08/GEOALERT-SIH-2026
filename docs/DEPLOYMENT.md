# SIH 2026 — System Deployment & Operations Manual

### 1. System Requirements
- **Docker**: Engine 24.0+ & Docker Compose v2.20+
- **Host OS**: Linux (Ubuntu 22.04+), macOS, or Windows 10/11 with WSL2
- **Memory**: Minimum 4 GB RAM (8 GB recommended)
- **Disk Space**: 5 GB available storage

---

### 2. Docker Deployment
```bash
# 1. Start all services in detached mode
docker compose up -d --build

# 2. View running containers
docker compose ps

# 3. Stream service logs
docker compose logs -f

# 4. Stop stack
docker compose down
```

---

### 3. Service Ports & Health Check Endpoints

| Service | Port | Endpoint | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend Web GIS** | `3000` | `http://localhost:3000` | Next.js interactive web dashboard |
| **Backend REST API** | `8000` | `http://localhost:8000/api/v1/health` | FastAPI health and model SHA-256 verification |
| **Swagger Interactive Docs**| `8000` | `http://localhost:8000/docs` | OpenAPI 3.1 interactive API documentation |

---

### 4. API Endpoints Catalog

- `GET /api/v1/health`: Checks backend running state, Model A / Model B loading, and GeoJSON availability.
- `GET /api/v1/metadata`: Returns model feature counts, cryptographic hashes, and alert tier definitions.
- `POST /api/v1/risk`: Single-point inference ($16	ext{ static} + 10	ext{ dynamic}$ features).
- `GET /api/v1/risk/grid`: Serves statewide $3,156$-cell GeoJSON surface.
- `GET /api/v1/risk/grid/summary`: Returns district-level hazard aggregations.
- `GET /api/v1/risk/location`: Nearest precomputed grid cell lookup.

---

### 5. Future Live Rainfall Ingestion Interface
In future operational deployments, automated cron services can fetch live IMD AWS/CHIRPS grids, compute the 10 dynamic CHIRPS features, evaluate Model B $P(D)$, and broadcast updated risk surfaces via WebSocket or cached Redis layers.
