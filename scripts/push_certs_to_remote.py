"""Bulk-upload certifications from /tmp/certs_extract to a REMOTE deployment
using the standard POST /api/certifications multipart endpoint (works with older code).
"""
import os
import re
import json
import time
from pathlib import Path
import requests

BASE = os.environ.get("PROD_BASE", "https://dipanshu.co.in")
EMAIL = os.environ.get("PROD_EMAIL", "rdipanshu@gmail.com")
PASS = os.environ.get("PROD_PASS", "aaxw!#77#4")
SRC = Path("/tmp/certs_extract")
CATEGORIES = ["Anthropic", "IBM", "Cisco", "Google", "University of Helsinki", "Amazon", "Simplilearn"]
FILE_EXTS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".gif"}


def normalize(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def parse_verify(path: Path):
    if not path.exists():
        return None
    lines = [ln.strip() for ln in path.read_text().splitlines() if ln.strip()]
    if not lines:
        return None
    if len(lines) == 1 and lines[0].startswith("http"):
        return lines[0]
    m = {}
    for ln in lines:
        mm = re.match(r"^(.+?)\s+[—\-–:]{1,2}\s+(https?://\S+)\s*$", ln)
        if not mm:
            mm = re.match(r"^(.+?)\s+(https?://\S+)\s*$", ln)
        if mm:
            m[normalize(mm.group(1).strip())] = mm.group(2).strip()
    return m


# Login
r = requests.post(f"{BASE}/api/auth/login", json={"email": EMAIL, "password": PASS}, timeout=30)
r.raise_for_status()
token = r.json()["token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Logged in to {BASE}")

# Existing certs on remote — skip these to be idempotent
existing = requests.get(f"{BASE}/api/certifications", timeout=30).json()
existing_keys = {(c["title"], c["category"]) for c in existing}
print(f"Existing on remote: {len(existing)}")

uploaded = 0
skipped = 0
errors = []

for cat in CATEGORIES:
    cat_dir = SRC / cat
    if not cat_dir.exists():
        continue
    verify = None
    for name in ("verify.txt", "Verify.txt"):
        vp = cat_dir / name
        if vp.exists():
            verify = parse_verify(vp)
            break

    for f in sorted(cat_dir.iterdir()):
        if f.name.lower() == "verify.txt":
            continue
        ext = f.suffix.lower()
        title = re.sub(r"\s+", " ", f.stem).strip()

        # File-less badge card (Google/Introduction to Generative AI)
        if ext == ".txt":
            if cat == "Google" and normalize(title) == normalize("Introduction To Generative AI"):
                if (title, cat) in existing_keys:
                    print(f"  SKIP existing: [{cat}] {title}")
                    skipped += 1
                    continue
                badge_url = f.read_text().strip()
                data = {"title": title, "category": cat, "verify_url": badge_url}
                try:
                    resp = requests.post(f"{BASE}/api/certifications", headers=headers, data=data, timeout=60)
                    resp.raise_for_status()
                    uploaded += 1
                    print(f"  + [{cat}] {title} (file-less)")
                except Exception as e:
                    errors.append(f"{cat}/{f.name}: {e}")
                    print(f"  ✗ [{cat}] {title}: {e}")
            continue

        if ext not in FILE_EXTS:
            continue

        if (title, cat) in existing_keys:
            print(f"  SKIP existing: [{cat}] {title}")
            skipped += 1
            continue

        vurl = ""
        if isinstance(verify, str):
            vurl = verify
        elif isinstance(verify, dict):
            vurl = verify.get(normalize(title), "") or ""

        data = {"title": title, "category": cat, "verify_url": vurl}
        with open(f, "rb") as fh:
            files = {"file": (f.name, fh, "application/pdf" if ext == ".pdf" else "image/*")}
            try:
                resp = requests.post(f"{BASE}/api/certifications", headers=headers, data=data, files=files, timeout=120)
                resp.raise_for_status()
                uploaded += 1
                print(f"  + [{cat}] {title}{' + verify' if vurl else ''}")
            except Exception as e:
                errors.append(f"{cat}/{f.name}: {e}")
                print(f"  ✗ [{cat}] {title}: {e}")

        time.sleep(0.15)  # be gentle

print("\n" + "=" * 60)
print(f"Uploaded: {uploaded}   Skipped: {skipped}   Errors: {len(errors)}")
for e in errors:
    print("  -", e)
final = requests.get(f"{BASE}/api/certifications", timeout=30).json()
print(f"Total on remote now: {len(final)}")
from collections import Counter
print("By category:", dict(Counter(c["category"] for c in final)))
