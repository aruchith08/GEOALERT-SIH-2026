@echo off
uv run --with fastapi --with uvicorn --with pydantic --with pandas --with numpy --with scikit-learn --with xgboost --with joblib --with httpx python run_server.py
