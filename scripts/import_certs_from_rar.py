"""Import certifications from /tmp/certs_extract/ into MongoDB + copy files to uploads/certs.

- Fuzzy-matches per-cert verify URLs from verify.txt.
- Handles category-wide URLs (Cisco, IBM, University of Helsinki).
- Special-cases file-less "Introduction To Generative AI" (Google) with badge URL.
- Generates PDF thumbnails via pdftoppm.
- Idempotent: re-inserting the same (title, category) is skipped.
- Emits backend/seed_certs.json so fresh deploys auto-seed.
"""
import os
import re
import json
import uuid
import shutil
import subprocess
from pathlib import Path
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

SRC = Path("/tmp/certs_extract")
UPLOADS_ROOT = Path("/app/backend/uploads/certs")
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)
SEED_JSON = Path("/app/backend/seed_certs.json")

CATEGORIES = ["Anthropic", "IBM", "Cisco", "Google", "University of Helsinki", "Amazon", "Simplilearn"]
FILE_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"}


def normalize(s: str) -> str:
    """Strip punctuation and lowercase for fuzzy matching."""
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def parse_verify_txt(path: Path):
    """Return either a string (single URL for whole category) or a dict {norm_title: url}."""
    if not path.exists():
        return None
    lines = [ln.strip() for ln in path.read_text().splitlines() if ln.strip()]
    if not lines:
        return None
    # Single URL only?
    if len(lines) == 1 and lines[0].startswith("http"):
        return lines[0]
    mapping = {}
    for ln in lines:
        # Try common separators: em-dash, hyphen with spaces, colon
        m = re.match(r"^(.+?)\s+[—\-–:]{1,2}\s+(https?://\S+)\s*$", ln)
        if not m:
            m = re.match(r"^(.+?)\s+(https?://\S+)\s*$", ln)
        if m:
            title, url = m.group(1).strip(), m.group(2).strip()
            mapping[normalize(title)] = url
    return mapping


def make_pdf_thumb(pdf_path: Path) -> Path | None:
    out_base = str(pdf_path.with_suffix("")) + "_thumb"
    r = subprocess.run(
        ["pdftoppm", "-png", "-f", "1", "-l", "1", "-r", "80", "-singlefile", str(pdf_path), out_base],
        capture_output=True,
    )
    thumb = Path(out_base + ".png")
    if r.returncode == 0 and thumb.exists():
        return thumb
    return None


client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

# Optional: reset first so re-runs are clean
if os.environ.get("RESET_CERTS") == "1":
    print("Wiping existing certifications...")
    db.certifications.delete_many({})

base_time = datetime.now(timezone.utc)
inserted = 0
skipped = 0

# Per-category order counter (continue from max existing order per category)
def next_order(category: str) -> int:
    doc = db.certifications.find({"category": category}).sort("order", -1).limit(1)
    top = list(doc)
    return (top[0].get("order", -1) + 1) if top else 0


for cat in CATEGORIES:
    cat_dir = SRC / cat
    if not cat_dir.exists():
        print(f"skip missing dir: {cat}")
        continue

    # Parse verify.txt / Verify.txt if present
    verify = None
    for name in ("verify.txt", "Verify.txt"):
        vp = cat_dir / name
        if vp.exists():
            verify = parse_verify_txt(vp)
            break

    for f in sorted(cat_dir.iterdir()):
        if f.name.lower() in ("verify.txt",):
            continue
        ext = f.suffix.lower()
        raw_title = re.sub(r"\s+", " ", f.stem).strip()

        # Special-case: Google "Introduction To Generative AI.txt" - file-less card
        if ext == ".txt":
            if cat == "Google" and normalize(raw_title) == normalize("Introduction To Generative AI"):
                badge_url = f.read_text().strip()
                if db.certifications.find_one({"title": raw_title, "category": cat}):
                    print(f"[{cat}] SKIP existing: {raw_title}")
                    skipped += 1
                    continue
                cert = {
                    "id": str(uuid.uuid4()),
                    "title": raw_title,
                    "category": cat,
                    "verify_url": badge_url,
                    "file_url": None,
                    "file_type": None,
                    "thumb_url": None,
                    "order": next_order(cat),
                    "created_at": (base_time + timedelta(seconds=inserted)).isoformat(),
                    "views": 0,
                }
                db.certifications.insert_one(cert)
                inserted += 1
                print(f"[{cat}] + {raw_title} (file-less badge)")
            continue

        if ext not in FILE_EXTS:
            continue

        # Duplicate check
        if db.certifications.find_one({"title": raw_title, "category": cat}):
            print(f"[{cat}] SKIP existing: {raw_title}")
            skipped += 1
            continue

        # Copy file with UUID name
        uid = uuid.uuid4().hex
        dest_name = f"{uid}{ext}"
        dest_path = UPLOADS_ROOT / dest_name
        shutil.copy2(f, dest_path)

        file_url = f"/api/uploads/certs/{dest_name}"
        file_type = "pdf" if ext == ".pdf" else "image"

        thumb_url = None
        if file_type == "pdf":
            thumb = make_pdf_thumb(dest_path)
            if thumb is not None:
                thumb_url = f"/api/uploads/certs/{thumb.name}"

        # Verify URL
        verify_url = None
        if isinstance(verify, str):
            verify_url = verify  # category-wide URL
        elif isinstance(verify, dict):
            verify_url = verify.get(normalize(raw_title))

        cert = {
            "id": str(uuid.uuid4()),
            "title": raw_title,
            "category": cat,
            "verify_url": verify_url,
            "file_url": file_url,
            "file_type": file_type,
            "thumb_url": thumb_url,
            "order": next_order(cat),
            "created_at": (base_time + timedelta(seconds=inserted)).isoformat(),
            "views": 0,
        }
        db.certifications.insert_one(cert)
        inserted += 1
        print(f"[{cat}] + {raw_title} ({file_type}{' + thumb' if thumb_url else ''}{' + verify' if verify_url else ''})")


# Summary
total = db.certifications.count_documents({})
print("\n" + "=" * 60)
print(f"Inserted: {inserted}   Skipped: {skipped}   Total in DB now: {total}")
for cat in CATEGORIES:
    print(f"  {cat}: {db.certifications.count_documents({'category': cat})}")

# Emit seed_certs.json for auto-seed on future deploys
certs = list(db.certifications.find({}, {"_id": 0}).sort([("category", 1), ("order", 1)]))
SEED_JSON.write_text(json.dumps({"count": len(certs), "certifications": certs}, indent=2, default=str))
print(f"\nWrote {SEED_JSON} ({SEED_JSON.stat().st_size} bytes, {len(certs)} certs)")
