import os
import re
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

SRC = Path("/tmp/certs_extract/Certs")
DEST = Path("/app/backend/uploads/certs")
CATEGORIES = ["Anthropic", "IBM", "Cisco", "Google", "University of Helsinki", "Amazon", "Simplilearn"]

client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

base_time = datetime.now(timezone.utc)
count = 0
for cat_dir in sorted(SRC.iterdir()):
    if not cat_dir.is_dir() or cat_dir.name not in CATEGORIES:
        continue
    for f in sorted(cat_dir.iterdir()):
        ext = f.suffix.lower()
        title = re.sub(r"\s+", " ", f.stem).strip()
        if ext == ".txt":
            if "verify" in f.stem.lower():
                continue
            file_url, file_type = None, None
        elif ext in [".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"]:
            fname = f"{uuid.uuid4().hex}{ext}"
            shutil.copy(f, DEST / fname)
            file_url = f"/api/uploads/certs/{fname}"
            file_type = "pdf" if ext == ".pdf" else "image"
        else:
            continue
        if db.certifications.find_one({"title": title, "category": cat_dir.name}):
            continue
        db.certifications.insert_one({
            "id": str(uuid.uuid4()),
            "title": title,
            "category": cat_dir.name,
            "file_url": file_url,
            "file_type": file_type,
            "created_at": (base_time + timedelta(seconds=count)).isoformat(),
        })
        count += 1
        print(f"[{cat_dir.name}] {title} ({file_type or 'no file'})")

print(f"\nImported {count} certifications. Total in DB: {db.certifications.count_documents({})}")
