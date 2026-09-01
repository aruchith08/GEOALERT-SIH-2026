#!/usr/bin/env python3
"""
scripts/run_backend.py
Starts the FastAPI backend service with proper root path resolution.
"""

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
    print(f"Starting SIH 2026 FastAPI Backend from: {BASE_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
