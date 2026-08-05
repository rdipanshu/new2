import sys
import os
import traceback
from pathlib import Path

# Add search paths so `from server import app` works
current_dir = Path(__file__).parent
root_dir = current_dir.parent
backend_dir = root_dir / "backend"

for p in [str(current_dir), str(backend_dir), str(root_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Attempt to import the real app; if ANYTHING fails, provide a
# zero-dependency ASGI fallback that surfaces the traceback as JSON
# instead of crashing the Vercel function with a generic 500.
try:
    from server import app
    handler = app
except Exception:
    _boot_error = traceback.format_exc()

    async def app(scope, receive, send):
        """Minimal ASGI fallback – no FastAPI needed."""
        import json
        if scope["type"] == "lifespan":
            msg = await receive()
            await send({"type": "lifespan.startup.complete"})
            msg = await receive()
            await send({"type": "lifespan.shutdown.complete"})
            return
        body = json.dumps({
            "status": "boot_error",
            "message": "The serverless function failed to import server.py",
            "traceback": _boot_error,
            "env_keys": sorted(os.environ.keys()),
        }).encode()
        await send({
            "type": "http.response.start",
            "status": 500,
            "headers": [
                [b"content-type", b"application/json"],
            ],
        })
        await send({
            "type": "http.response.body",
            "body": body,
        })

    handler = app
