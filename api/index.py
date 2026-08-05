import sys
import os
import traceback
from pathlib import Path

# Vercel bundles backend/** via includeFiles in vercel.json.
# On Lambda the layout is /var/task/api/index.py and /var/task/backend/server.py
root_dir = Path(__file__).parent.parent
backend_dir = root_dir / "backend"

for p in [str(backend_dir), str(root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Attempt to import the real app; if ANYTHING fails, provide a
# zero-dependency ASGI fallback that surfaces the traceback as JSON.
try:
    from server import app
    handler = app
except Exception:
    _boot_error = traceback.format_exc()

    async def app(scope, receive, send):
        """Minimal ASGI fallback - no third-party deps needed."""
        import json
        if scope["type"] == "lifespan":
            msg = await receive()
            await send({"type": "lifespan.startup.complete"})
            msg = await receive()
            await send({"type": "lifespan.shutdown.complete"})
            return
        body = json.dumps({
            "status": "boot_error",
            "message": "Failed to import backend/server.py",
            "traceback": _boot_error,
            "sys_path": sys.path,
            "backend_dir_exists": backend_dir.exists(),
            "backend_dir_contents": os.listdir(str(backend_dir)) if backend_dir.exists() else [],
        }).encode()
        await send({
            "type": "http.response.start",
            "status": 500,
            "headers": [[b"content-type", b"application/json"]],
        })
        await send({"type": "http.response.body", "body": body})

    handler = app
