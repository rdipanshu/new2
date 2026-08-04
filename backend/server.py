from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import shutil
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import asyncio
import bcrypt
import jwt
import resend
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel

mongo_url = os.environ.get('MONGO_URL', '')
if mongo_url:
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ.get('DB_NAME', 'portfolio')]
else:
    client = None
    db = None

BUNDLED_UPLOADS_DIR = ROOT_DIR / "uploads"
# UPLOADS_DIR can be overridden via environment variable.
UPLOADS_DIR = Path(os.environ.get("UPLOADS_DIR", str(BUNDLED_UPLOADS_DIR)))
try:
    (UPLOADS_DIR / "videos").mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / "certs").mkdir(parents=True, exist_ok=True)
    (UPLOADS_DIR / "misc").mkdir(parents=True, exist_ok=True)
except Exception as _dir_err:
    logging.getLogger(__name__).warning("Uploads directory creation skipped: %s", _dir_err)

# If running against a fresh persistent volume, seed it from the files bundled with the repo
# so the site has its videos / certs / CV on first deploy.
if UPLOADS_DIR.resolve() != BUNDLED_UPLOADS_DIR.resolve() and BUNDLED_UPLOADS_DIR.exists():
    try:
        # Seed top-level files (e.g. CV_Dipanshu_Rana.pdf)
        for src_file in BUNDLED_UPLOADS_DIR.iterdir():
            if src_file.is_file():
                dst_file = UPLOADS_DIR / src_file.name
                if not dst_file.exists():
                    shutil.copy2(src_file, dst_file)
        # Seed subfolders only if the target subfolder is empty
        for sub in ("videos", "certs", "misc"):
            src_dir = BUNDLED_UPLOADS_DIR / sub
            dst_dir = UPLOADS_DIR / sub
            if src_dir.exists() and not any(dst_dir.iterdir()):
                for f in src_dir.iterdir():
                    if f.is_file():
                        shutil.copy2(f, dst_dir / f.name)
    except Exception as _seed_err:
        logging.getLogger(__name__).warning("Uploads seed skipped: %s", _seed_err)

app = FastAPI()
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"
JWT_SECRET = os.environ.get("JWT_SECRET", "default-jwt-secret-key-change-in-prod")
CATEGORIES = ["Anthropic", "IBM", "Cisco", "Google", "University of Helsinki", "Amazon", "Simplilearn"]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------- Auth helpers ----------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": datetime.now(timezone.utc) + timedelta(days=1), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ---------- Models ----------
class LoginRequest(BaseModel):
    email: str
    password: str


class PageUpdate(BaseModel):
    video_url: Optional[str] = None
    data: Optional[dict] = None


class ContactMessage(BaseModel):
    name: str
    email: str
    subject: Optional[str] = ""
    message: str


class ReorderRequest(BaseModel):
    ids: List[str]


class VisitEvent(BaseModel):
    page: str


class CertViewEvent(BaseModel):
    cert_id: str


class BlogPostCreate(BaseModel):
    title: str
    content: str
    excerpt: Optional[str] = ""
    tags: List[str] = []
    published: bool = True


class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    tags: Optional[List[str]] = None
    published: Optional[bool] = None


# ---------- Default content ----------
DEFAULT_PAGES = {
    "home": {
        "video_url": "/api/uploads/videos/home.mp4",
        "data": {
            "overline": "// CYBERSECURITY SPECIALIST & NETWORK SECURITY ENGINEER",
            "title": "Dipanshu Rana",
            "subtitle": "Securing digital frontiers, one system at a time.",
            "tagline": "Proactive vulnerability hunter, penetration tester and full-stack security architect leveraging AI-driven threat intelligence to safeguard enterprise digital assets.",
            "cta_primary": "View Portfolio",
            "cta_secondary": "Contact Me",
        },
    },
    "summary": {
        "video_url": "/api/uploads/videos/summary.mp4",
        "data": {
            "heading": "Professional Summary",
            "body": "Results-driven Cybersecurity Specialist and Network Security Engineer. Proactive in identifying vulnerabilities using automated scanning tools and AI-driven threat intelligence, deploying critical patches, and optimizing security configurations to safeguard enterprise digital assets. Adept at leveraging modern programming languages (Python, JavaScript, Rust), integrating Generative AI and Large Language Models (LLMs) for automated security workflows, conducting advanced penetration testing with Kali Linux, and driving process automation. Additionally proficient in full-stack web architecture and comprehensive digital lifecycle management, designing secure, high-performance web infrastructures from inception to deployment.",
        },
    },
    "skills": {
        "video_url": "/api/uploads/videos/skills.mp4",
        "data": {
            "heading": "Skills & Arsenal",
            "categories": [
                {"name": "Cybersecurity & Threat Management", "skills": ["Vulnerability Assessment", "Penetration Testing", "Incident Response", "Threat Intelligence", "SIEM (Splunk)", "IDS/IPS", "Malware Analysis"]},
                {"name": "Offensive & Defensive Security Tools", "skills": ["Kali Linux", "Metasploit", "Nmap", "Burp Suite", "Wireshark", "SQLmap", "Nessus", "Acunetix", "Mimikatz", "BloodHound", "Gophish", "Lynis", "Wifite", "Aircrack-ng"]},
                {"name": "Network & Cloud Security", "skills": ["Firewall Administration (Cisco, Palo Alto)", "AWS/GCP Cloud Security", "TCP/IP Protocols", "Endpoint Security", "Zero Trust Architecture", "Network Integrity"]},
                {"name": "Technical Proficiencies", "skills": ["Python", "JavaScript", "TypeScript", "Rust", "C", "C++", "Java", "Bash", "PowerShell", "SQL"]},
                {"name": "Web & Application Security", "skills": ["OWASP Top 10", "Secure Code Review", "Custom Security Scripting", "Automated Vulnerability Assessments", "Bug Bounty Hunting"]},
                {"name": "Frameworks & Compliance", "skills": ["ISO 27001", "NIST Cybersecurity Framework", "Risk Assessment", "Security Auditing", "Data Protection"]},
                {"name": "Core Competencies", "skills": ["Systems Architecture", "Workflow Optimization", "Independent Execution"]},
                {"name": "AI Security & Machine Learning", "skills": ["TensorFlow", "PyTorch", "Scikit-learn", "Hugging Face Transformers", "AI-powered Threat Intelligence (SIEM/XDR)", "Behavioral Analytics", "Generative AI for Incident Summaries", "Anomaly Detection Algorithms"]},
                {"name": "Web Architecture & Lifecycle Management", "skills": ["Full-Stack Web Development", "CMS Administration", "Digital Infrastructure Management", "UI/UX Implementation", "Web Performance Optimization", "Secure Hosting Administration"]},
            ],
        },
    },
    "experience": {
        "video_url": "/api/uploads/videos/experience.mp4",
        "data": {
            "heading": "Experience Timeline",
            "items": [
                {"company": "Credwin Pvt. Ltd.", "role": "Information Security", "period": "July 2024 - Present", "points": ["Consulting for government projects (UPCL, PTCUL)", "Securing OT/IT environments", "Evaluating network expansion security postures", "Ensuring ISO 27001/NIST compliance"]},
                {"company": "Pegasus Enterprises", "role": "Security Operations", "period": "November 2022 - July 2024", "points": ["Executed enterprise security architecture", "Oversaw network monitoring and vulnerability scanning", "Directed enterprise security operations", "Developed security metrics for executive leadership"]},
                {"company": "Independent Consultant", "role": "Freelancing & Web Solutions Architect", "period": "Ongoing", "points": ["Penetration testing engagements", "Continuous network monitoring", "Developing automated ML-based threat detection models", "Leveraging AI agents (ChatGPT, Copilot) for vulnerability research"]},
            ],
        },
    },
    "certifications": {
        "video_url": "/api/uploads/videos/certifications.mp4",
        "data": {
            "heading": "Certifications & Badges",
            "intro": "Verified credentials across leading technology vendors. Filter by issuer.",
        },
    },
    "education": {
        "video_url": "/api/uploads/videos/education.mp4",
        "data": {
            "heading": "Education",
            "items": [
                {"degree": "Bachelor of Computer Applications", "school": "Vivekananda Institute of Professional Studies, Pitampura", "date": "June 2021", "highlight": "Core Member of ACE"},
                {"degree": "12th Grade (Intermediate)", "school": "Holy Child School, Rampur", "date": "March 2018", "highlight": ""},
                {"degree": "10th Grade (Matriculation)", "school": "Holy Child School, Rampur", "date": "March 2016", "highlight": ""},
            ],
        },
    },
    "activity": {
        "video_url": "/api/uploads/videos/activity.mp4",
        "data": {
            "heading": "Activity & Honors",
            "honors": ["Core Member of ACE", "TIME Person of the Year 2006"],
            "hobbies": ["Avid mountain traveler", "Road trip enthusiast", "Passionate automotive enthusiast", "Active participant in online/strategy gaming", "Specialty coffee enthusiast"],
        },
    },
    "blog": {
        "video_url": "/api/uploads/videos/home.mp4",
        "data": {
            "heading": "Security Write-ups",
            "intro": "Articles, research notes and write-ups on cybersecurity, AI-driven defense and secure architecture.",
        },
    },
    "contact": {
        "video_url": "/api/uploads/videos/contact.mp4",
        "data": {
            "heading": "Get In Touch",
            "intro": "Open to consulting engagements, security assessments and collaboration. Drop a message below.",
            "location": "Rudrapur, India 263153",
            "phone": "+91-9897979338",
            "email": "rdipanshu@gmail.com",
            "website": "dipanshu.co.in",
            "linkedin": "https://www.linkedin.com/in/rdipanshu/",
            "github": "https://github.com/rdipanshu",
        },
    },
}


# ---------- Health ----------
@api_router.get("/health")
async def health():
    try:
        await db.command("ping")
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "db": db_ok}


# ---------- Auth routes ----------
@api_router.post("/auth/login")
async def login(body: LoginRequest, request: Request, response: Response):
    email = body.email.strip().lower()
    identifier = f"{request.client.host}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    now = datetime.now(timezone.utc)
    if attempt and attempt.get("count", 0) >= 5:
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if now < locked_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in 15 minutes.")
        await db.login_attempts.delete_one({"identifier": identifier})
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"locked_until": (now + timedelta(minutes=15)).isoformat()}},
            upsert=True,
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    await db.login_attempts.delete_one({"identifier": identifier})
    token = create_access_token(user["id"], email)
    response.set_cookie(key="access_token", value=token, httponly=True, secure=True, samesite="none", max_age=86400, path="/")
    return {"token": token, "user": {"id": user["id"], "email": user["email"], "name": user.get("name", "Admin")}}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


# ---------- Pages ----------
@api_router.get("/pages")
async def get_pages():
    pages = await db.pages.find({}, {"_id": 0}).to_list(50)
    return pages


@api_router.get("/pages/{page_id}")
async def get_page(page_id: str):
    page = await db.pages.find_one({"page_id": page_id}, {"_id": 0})
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page


@api_router.put("/pages/{page_id}")
async def update_page(page_id: str, body: PageUpdate, user: dict = Depends(get_current_user)):
    if page_id not in DEFAULT_PAGES:
        raise HTTPException(status_code=404, detail="Unknown page")
    update = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if body.video_url is not None:
        update["video_url"] = body.video_url
    if body.data is not None:
        update["data"] = body.data
    await db.pages.update_one({"page_id": page_id}, {"$set": update})
    return await db.pages.find_one({"page_id": page_id}, {"_id": 0})


# ---------- Certifications ----------
def save_upload(file: UploadFile, subdir: str) -> str:
    ext = Path(file.filename or "file").suffix.lower() or ".bin"
    fname = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / subdir / fname
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)
    return f"/api/uploads/{subdir}/{fname}"


def make_pdf_thumb(file_url: str) -> Optional[str]:
    import subprocess
    pdf_path = UPLOADS_DIR / "certs" / Path(file_url).name
    out_base = str(pdf_path.with_suffix("")) + "_thumb"
    r = subprocess.run(["pdftoppm", "-png", "-f", "1", "-l", "1", "-r", "80", "-singlefile", str(pdf_path), out_base], capture_output=True)
    thumb = Path(out_base + ".png")
    if r.returncode == 0 and thumb.exists():
        return f"/api/uploads/certs/{thumb.name}"
    return None


@api_router.get("/certifications")
async def list_certifications(category: Optional[str] = None):
    query = {"category": category} if category else {}
    certs = await db.certifications.find(query, {"_id": 0}).sort([("order", 1), ("created_at", 1)]).to_list(500)
    return certs


@api_router.post("/certifications/reorder")
async def reorder_certifications(body: ReorderRequest, user: dict = Depends(get_current_user)):
    for idx, cert_id in enumerate(body.ids):
        await db.certifications.update_one({"id": cert_id}, {"$set": {"order": idx}})
    return {"ok": True}


@api_router.get("/certifications/categories")
async def cert_categories():
    return CATEGORIES


@api_router.post("/certifications")
async def create_certification(
    title: str = Form(...),
    category: str = Form(...),
    verify_url: Optional[str] = Form(None),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user),
):
    if category not in CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Category must be one of {CATEGORIES}")
    file_url, file_type, thumb_url = None, None, None
    if file and file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"]:
            raise HTTPException(status_code=400, detail="Only images (png/jpg/webp/gif) or PDF allowed")
        file_url = save_upload(file, "certs")
        file_type = "pdf" if ext == ".pdf" else "image"
        if file_type == "pdf":
            thumb_url = make_pdf_thumb(file_url)
    max_order = await db.certifications.find({"category": category}).sort("order", -1).limit(1).to_list(1)
    cert = {
        "id": str(uuid.uuid4()),
        "title": title,
        "category": category,
        "verify_url": (verify_url or "").strip() or None,
        "file_url": file_url,
        "file_type": file_type,
        "thumb_url": thumb_url,
        "order": (max_order[0].get("order", 0) + 1) if max_order else 0,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.certifications.insert_one({**cert})
    return cert


@api_router.put("/certifications/{cert_id}")
async def update_certification(
    cert_id: str,
    title: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    verify_url: Optional[str] = Form("__KEEP__"),
    file: UploadFile = File(None),
    user: dict = Depends(get_current_user),
):
    cert = await db.certifications.find_one({"id": cert_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    update = {}
    if title is not None:
        update["title"] = title
    if verify_url == "__CLEAR__":
        update["verify_url"] = None
    elif verify_url not in (None, "__KEEP__"):
        update["verify_url"] = verify_url.strip() or None
    if category is not None:
        if category not in CATEGORIES:
            raise HTTPException(status_code=400, detail="Invalid category")
        update["category"] = category
    if file and file.filename:
        ext = Path(file.filename).suffix.lower()
        if ext not in [".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"]:
            raise HTTPException(status_code=400, detail="Only images or PDF allowed")
        update["file_url"] = save_upload(file, "certs")
        update["file_type"] = "pdf" if ext == ".pdf" else "image"
        update["thumb_url"] = make_pdf_thumb(update["file_url"]) if ext == ".pdf" else None
    if update:
        await db.certifications.update_one({"id": cert_id}, {"$set": update})
    return await db.certifications.find_one({"id": cert_id}, {"_id": 0})


@api_router.delete("/certifications/{cert_id}")
async def delete_certification(cert_id: str, user: dict = Depends(get_current_user)):
    result = await db.certifications.delete_one({"id": cert_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Certification not found")
    return {"ok": True}


@api_router.get("/certifications/export")
async def export_certifications(user: dict = Depends(get_current_user)):
    """Download all certifications as a JSON blob for backup / migration between envs."""
    certs = await db.certifications.find({}, {"_id": 0}).sort([("category", 1), ("order", 1)]).to_list(1000)
    return {"count": len(certs), "certifications": certs}


class BulkImportRequest(BaseModel):
    certifications: List[dict]
    mode: Optional[str] = "merge"  # "merge" = upsert by id (default); "replace" = wipe then insert


@api_router.post("/certifications/import")
async def import_certifications(body: BulkImportRequest, user: dict = Depends(get_current_user)):
    """Bulk import certifications from a JSON payload (companion to /export).
    - mode='merge' (default): upsert by id; existing certs with matching id are updated, new ones inserted.
    - mode='replace': wipe the collection first, then insert everything.
    File URLs in payload must point to files that already exist under /api/uploads/certs/.
    """
    if not body.certifications:
        raise HTTPException(status_code=400, detail="No certifications provided")
    if body.mode not in ("merge", "replace"):
        raise HTTPException(status_code=400, detail="mode must be 'merge' or 'replace'")
    if body.mode == "replace":
        await db.certifications.delete_many({})
    inserted, updated = 0, 0
    for c in body.certifications:
        if not isinstance(c, dict):
            continue
        cert = dict(c)
        cert.pop("_id", None)
        cert.setdefault("id", str(uuid.uuid4()))
        cert.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        if cert.get("category") not in CATEGORIES:
            continue
        existing = await db.certifications.find_one({"id": cert["id"]})
        if existing:
            await db.certifications.update_one({"id": cert["id"]}, {"$set": cert})
            updated += 1
        else:
            await db.certifications.insert_one(cert)
            inserted += 1
    total = await db.certifications.count_documents({})
    return {"inserted": inserted, "updated": updated, "total": total, "mode": body.mode}


# ---------- Generic upload (videos/images for pages) ----------
@api_router.post("/upload")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = Path(file.filename or "").suffix.lower()
    allowed = [".mp4", ".webm", ".mov", ".png", ".jpg", ".jpeg", ".webp", ".gif", ".pdf"]
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Allowed types: {allowed}")
    subdir = "videos" if ext in [".mp4", ".webm", ".mov"] else "misc"
    url = save_upload(file, subdir)
    return {"url": url}


# ---------- Analytics ----------
@api_router.post("/analytics/visit")
async def track_visit(body: VisitEvent):
    if body.page not in DEFAULT_PAGES:
        raise HTTPException(status_code=400, detail="Unknown page")
    await db.page_visits.insert_one({"id": str(uuid.uuid4()), "page": body.page, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"ok": True}


@api_router.post("/analytics/cert-view")
async def track_cert_view(body: CertViewEvent):
    await db.certifications.update_one({"id": body.cert_id}, {"$inc": {"views": 1}})
    return {"ok": True}


@api_router.get("/analytics/summary")
async def analytics_summary(user: dict = Depends(get_current_user)):
    total = await db.page_visits.count_documents({})
    by_page = await db.page_visits.aggregate([
        {"$group": {"_id": "$page", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]).to_list(20)
    since = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    last7 = await db.page_visits.count_documents({"created_at": {"$gte": since}})
    top_certs = await db.certifications.find(
        {"views": {"$gt": 0}}, {"_id": 0, "id": 1, "title": 1, "category": 1, "views": 1}
    ).sort("views", -1).limit(10).to_list(10)
    unread = await db.contact_messages.count_documents({"read": False})
    return {
        "total_visits": total,
        "visits_last_7_days": last7,
        "visits_by_page": [{"page": b["_id"], "count": b["count"]} for b in by_page],
        "top_certs": top_certs,
        "unread_messages": unread,
    }


# ---------- Blog ----------
def slugify(title: str) -> str:
    import re
    return re.sub(r"-+", "-", re.sub(r"[^a-z0-9]+", "-", title.lower())).strip("-") or "post"


async def unique_slug(title: str, exclude_id: Optional[str] = None) -> str:
    base = slugify(title)
    slug, n = base, 2
    while True:
        query = {"slug": slug}
        if exclude_id:
            query["id"] = {"$ne": exclude_id}
        if not await db.blog_posts.find_one(query):
            return slug
        slug = f"{base}-{n}"
        n += 1


@api_router.get("/blog")
async def list_blog_posts():
    return await db.blog_posts.find({"published": True}, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(200)


@api_router.get("/blog/admin")
async def list_all_blog_posts(user: dict = Depends(get_current_user)):
    return await db.blog_posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)


@api_router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@api_router.post("/blog")
async def create_blog_post(body: BlogPostCreate, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    post = {
        "id": str(uuid.uuid4()),
        "slug": await unique_slug(body.title),
        "title": body.title,
        "excerpt": body.excerpt or "",
        "content": body.content,
        "tags": body.tags,
        "published": body.published,
        "created_at": now,
        "updated_at": now,
    }
    await db.blog_posts.insert_one({**post})
    return post


@api_router.put("/blog/{post_id}")
async def update_blog_post(post_id: str, body: BlogPostUpdate, user: dict = Depends(get_current_user)):
    post = await db.blog_posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if "title" in update and update["title"] != post["title"]:
        update["slug"] = await unique_slug(update["title"], exclude_id=post_id)
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.blog_posts.update_one({"id": post_id}, {"$set": update})
    return await db.blog_posts.find_one({"id": post_id}, {"_id": 0})


@api_router.delete("/blog/{post_id}")
async def delete_blog_post(post_id: str, user: dict = Depends(get_current_user)):
    result = await db.blog_posts.delete_one({"id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"ok": True}


# ---------- Contact ----------
resend.api_key = os.environ.get("RESEND_API_KEY", "")


async def send_contact_email(msg: dict):
    if not resend.api_key:
        return
    html = f"""
    <table style="font-family:Arial,sans-serif;max-width:600px;width:100%;border-collapse:collapse;background:#0a0a0a;color:#e4e4e7;">
      <tr><td style="padding:24px;border:1px solid #27272a;">
        <h2 style="color:#22d3ee;margin:0 0 16px;">New Portfolio Contact Message</h2>
        <p style="margin:4px 0;"><strong>Name:</strong> {msg['name']}</p>
        <p style="margin:4px 0;"><strong>Email:</strong> {msg['email']}</p>
        <p style="margin:4px 0;"><strong>Subject:</strong> {msg['subject'] or '(none)'}</p>
        <p style="margin:16px 0 4px;"><strong>Message:</strong></p>
        <p style="margin:0;padding:12px;background:#18181b;border-left:3px solid #22d3ee;">{msg['message']}</p>
      </td></tr>
    </table>
    """
    params = {
        "from": os.environ.get("SENDER_EMAIL", "onboarding@resend.dev"),
        "to": [os.environ.get("NOTIFY_EMAIL", "rdipanshu@gmail.com")],
        "subject": f"Portfolio Contact: {msg['subject'] or msg['name']}",
        "html": html,
    }
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Contact notification email sent: {result.get('id')}")
    except Exception as e:
        logger.error(f"Failed to send contact notification email: {e}")


@api_router.post("/contact")
async def submit_contact(body: ContactMessage):
    msg = {
        "id": str(uuid.uuid4()),
        "name": body.name,
        "email": body.email,
        "subject": body.subject or "",
        "message": body.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False,
    }
    await db.contact_messages.insert_one({**msg})
    asyncio.create_task(send_contact_email(msg))
    return {"ok": True, "id": msg["id"]}


@api_router.get("/contact/messages")
async def list_messages(user: dict = Depends(get_current_user)):
    return await db.contact_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api_router.patch("/contact/messages/{msg_id}/read")
async def mark_message_read(msg_id: str, user: dict = Depends(get_current_user)):
    result = await db.contact_messages.update_one({"id": msg_id}, {"$set": {"read": True}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"ok": True}


@api_router.delete("/contact/messages/{msg_id}")
async def delete_message(msg_id: str, user: dict = Depends(get_current_user)):
    result = await db.contact_messages.delete_one({"id": msg_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"ok": True}


# ---------- Startup ----------
@app.on_event("startup")
async def seed():
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    admin_email = os.environ["ADMIN_EMAIL"].lower()
    admin_password = os.environ["ADMIN_PASSWORD"]
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "name": "Dipanshu Rana",
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})
    for page_id, content in DEFAULT_PAGES.items():
        if not await db.pages.find_one({"page_id": page_id}):
            await db.pages.insert_one({"page_id": page_id, **content})

    # Auto-seed / self-heal certifications from bundled backend/seed_certs.json.
    # - If DB is empty, seed everything.
    # - If DB has cert rows whose file_url points at a missing file (typical on ephemeral filesystems
    #   after a container restart), and seed_certs.json has a cert with the same (title, category),
    #   replace the broken row with the seed data (which references files bundled in the repo).
    try:
        seed_file = ROOT_DIR / "seed_certs.json"
        if seed_file.exists():
            import json as _json
            with open(seed_file) as f:
                payload = _json.load(f)
            items = payload.get("certifications", payload) if isinstance(payload, dict) else payload
            items = [c for c in (items or []) if isinstance(c, dict) and c.get("category") in CATEGORIES]
            seed_index = {(c.get("title", ""), c.get("category", "")): c for c in items}

            existing_count = await db.certifications.count_documents({})
            if existing_count == 0:
                for c in items:
                    cert = {k: v for k, v in c.items() if k != "_id"}
                    cert.setdefault("id", str(uuid.uuid4()))
                    cert.setdefault("created_at", datetime.now(timezone.utc).isoformat())
                    await db.certifications.insert_one(cert)
                logger.info("Auto-seeded %d certifications from seed_certs.json", len(items))
            else:
                # Self-heal: replace broken cert rows (missing files) with seed data when available.
                healed = 0
                async for c in db.certifications.find({}):
                    fu = c.get("file_url")
                    if not fu:
                        continue
                    rel = fu.replace("/api/uploads/", "", 1).lstrip("/")
                    disk_path = UPLOADS_DIR / rel
                    if disk_path.exists():
                        continue
                    key = (c.get("title", ""), c.get("category", ""))
                    seed = seed_index.get(key)
                    if not seed:
                        continue
                    new_cert = {k: v for k, v in seed.items() if k != "_id"}
                    new_cert["id"] = c.get("id") or new_cert.get("id") or str(uuid.uuid4())
                    new_cert.setdefault("created_at", c.get("created_at") or datetime.now(timezone.utc).isoformat())
                    await db.certifications.replace_one({"_id": c["_id"]}, new_cert)
                    healed += 1
                if healed:
                    logger.info("Self-healed %d certifications with missing files (repointed to bundled URLs)", healed)
    except Exception as e:
        logger.warning("Cert seed/heal skipped: %s", e)


app.include_router(api_router)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
