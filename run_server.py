import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == '__main__':
    import uvicorn
    uvicorn.run('backend.app.main:app', host='0.0.0.0', port=8000, reload=False)
