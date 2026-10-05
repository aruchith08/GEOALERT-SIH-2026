#!/usr/bin/env python3
"""
scripts/run_backend.py
Starts the FastAPI backend service with proper root path resolution.
"""

import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Apply sklearn 1.6 compatibility patch if necessary
import sklearn.compose._column_transformer
if not hasattr(sklearn.compose._column_transformer, '_RemainderColsList'):
    class _RemainderColsList(list):
        pass
    sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList

import uvicorn
from backend.app.main import app

if __name__ == "__main__":
    port_env = os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT") or os.environ.get("PORT") or "8000"
    port = int(port_env)
    print(f"Starting GEOALERT FastAPI Backend from: {BASE_DIR} on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="info")

