import os
import subprocess
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")

CERTS_DIR = Path("/app/backend/uploads/certs")
client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

count = 0
for cert in db.certifications.find({"file_type": "pdf", "thumb_url": {"$exists": False}}):
    pdf_path = CERTS_DIR / Path(cert["file_url"]).name
    if not pdf_path.exists():
        continue
    out_base = str(pdf_path.with_suffix("")) + "_thumb"
    r = subprocess.run(["pdftoppm", "-png", "-f", "1", "-l", "1", "-r", "80", "-singlefile", str(pdf_path), out_base], capture_output=True)
    thumb = Path(out_base + ".png")
    if r.returncode == 0 and thumb.exists():
        db.certifications.update_one({"id": cert["id"]}, {"$set": {"thumb_url": f"/api/uploads/certs/{thumb.name}"}})
        count += 1
        print(f"thumb: {cert['title']}")

print(f"\nGenerated {count} thumbnails")
