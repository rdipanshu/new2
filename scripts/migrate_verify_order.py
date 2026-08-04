import os
from pathlib import Path
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv(Path(__file__).parent.parent / "backend" / ".env")
client = MongoClient(os.environ["MONGO_URL"])
db = client[os.environ["DB_NAME"]]

ANTHROPIC = {
    "Claude 101": "https://verify.skilljar.com/c/effa96j6ksss",
    "Claude Platform 101": "https://verify.skilljar.com/c/pco4hyvrqg66",
    "Claude Code 101": "https://verify.skilljar.com/c/amzhqp5bmc8y",
    "AI Fluency - Framework and Foundations": "https://verify.skilljar.com/c/6e8d4cwgwvdd",
    "Claude with the Anthropic API": "https://verify.skilljar.com/c/u4io6c7dhi9o",
    "Introduction to Agent Skills": "https://verify.skilljar.com/c/wcruwob2erwg",
    "Teaching the AI Fluency Framework": "https://verify.skilljar.com/c/w5ue6fm8skew",
    "Introduction to Model Context Protocol": "https://verify.skilljar.com/c/rsgrvyndewit",
    "Model Context Protocol - Advanced Topics": "https://verify.skilljar.com/c/heoq4hvpspb4",
    "AI Fluency - AI Capabilities and Limitations": "https://verify.skilljar.com/c/cu6zz8muhmvy",
    "AI Fluency for Students": "https://verify.skilljar.com/c/b2vxwktvjufv",
    "Introduction to Subagents": "https://verify.skilljar.com/c/85qu5xo2n4ec",
}
CATEGORY_LINKS = {
    "IBM": "https://www.credly.com/badges/5a541d7d-8622-420e-9185-7e73350d9a95/public_url",
    "Cisco": "https://www.credly.com/badges/4c93b8b2-785f-412c-a5f8-b25e84af5c6d/public_url",
    "University of Helsinki": "https://certificates.mooc.fi/validate/92v066tnfv",
}

for title, url in ANTHROPIC.items():
    r = db.certifications.update_one({"category": "Anthropic", "title": title}, {"$set": {"verify_url": url}})
    print(f"Anthropic '{title}': {'ok' if r.matched_count else 'NOT FOUND'}")

for cat, url in CATEGORY_LINKS.items():
    r = db.certifications.update_many({"category": cat, "verify_url": {"$in": [None]}}, {"$set": {"verify_url": url}})
    print(f"{cat}: {r.modified_count} updated")

for cat in db.certifications.distinct("category"):
    certs = list(db.certifications.find({"category": cat}).sort("created_at", 1))
    for idx, c in enumerate(certs):
        db.certifications.update_one({"id": c["id"]}, {"$set": {"order": idx}})
    print(f"order set: {cat} ({len(certs)})")

print("done. with verify_url:", db.certifications.count_documents({"verify_url": {"$ne": None}}))
