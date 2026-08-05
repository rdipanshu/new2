import sys
import traceback
from pathlib import Path

current_dir = Path(__file__).parent
backend_dir = current_dir / "backend"

for p in [str(current_dir), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

try:
    from server import app
except Exception as e:
    err_msg = traceback.format_exc()
    from fastapi import FastAPI
    app = FastAPI()

    @app.get("/api/health")
    @app.get("/health")
    @app.get("/api/{full_path:path}")
    async def fallback_catchall(full_path: str = ""):
        return {"status": "error", "message": "Root serverless import failed", "detail": str(e), "traceback": err_msg}

handler = app
