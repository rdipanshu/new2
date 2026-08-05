import sys
from pathlib import Path

# Add backend/ to import path. Vercel bundles it via includeFiles in vercel.json.
backend_dir = Path(__file__).parent.parent / "backend"
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from server import app
