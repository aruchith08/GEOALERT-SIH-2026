import os
import sys

# Ensure repository root is on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Apply sklearn 1.6+ compatibility patch if necessary
try:
    import sklearn.compose._column_transformer
    if not hasattr(sklearn.compose._column_transformer, '_RemainderColsList'):
        class _RemainderColsList(list):
            pass
        sklearn.compose._column_transformer._RemainderColsList = _RemainderColsList
except Exception:
    pass

if __name__ == '__main__':
    import uvicorn
    # Catalyst AppSail injects X_ZOHO_CATALYST_LISTEN_PORT; other PaaS inject PORT
    port_env = os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT") or os.environ.get("PORT") or "8000"
    port = int(port_env)
    print(f"Starting GEOALERT Backend on 0.0.0.0:{port}...")
    uvicorn.run('backend.app.main:app', host='0.0.0.0', port=port, reload=False)

