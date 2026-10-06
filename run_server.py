import os
import sys

# Ensure repository root and lib directory are on sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

lib_dir = os.path.join(BASE_DIR, "lib")
if lib_dir not in sys.path:
    sys.path.insert(0, lib_dir)

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
    try:
        import uvicorn
    except ModuleNotFoundError:
        import subprocess
        req_file = os.path.join(BASE_DIR, "requirements.txt")
        os.makedirs(lib_dir, exist_ok=True)
        print(f"Dependencies not pre-installed. Installing to {lib_dir} from {req_file}...", flush=True)
        res = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--no-cache-dir", "--target", lib_dir, "-r", req_file],
            capture_output=True,
            text=True
        )
        if res.returncode != 0:
            print(f"PIP STDOUT:\n{res.stdout}", file=sys.stderr, flush=True)
            print(f"PIP STDERR:\n{res.stderr}", file=sys.stderr, flush=True)
            raise RuntimeError(f"pip install failed with exit code {res.returncode}:\n{res.stderr}")
        if lib_dir not in sys.path:
            sys.path.insert(0, lib_dir)
        import uvicorn

    # Catalyst AppSail injects X_ZOHO_CATALYST_LISTEN_PORT; other PaaS inject PORT
    port_env = os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT") or os.environ.get("PORT") or "8000"
    port = int(port_env)
    print(f"Starting GEOALERT Backend on 0.0.0.0:{port}...")
    uvicorn.run('backend.app.main:app', host='0.0.0.0', port=port, reload=False)


