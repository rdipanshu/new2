"""Iteration 5: verify_urls on specific certs + contact linkedin/github fields."""
import os
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"


EXPECTED_VERIFY = {
    "CCNA 200-301 Network Fundamentals": "simpli-web.app.link",
    "Git Training": "simpli-web.app.link",
    "Introduction to CISSP": "simpli-web.app.link",
    "Machine Learning Using Python": "simpli-web.app.link",
    "Gemini for Google Workspace": "simpli-web.app.link",
    "AWS Foundations - Machine Learning Basics": "simpli-web.app.link",
    "Introduction To Generative AI": "skills.google",
}


def test_specific_verify_urls_applied():
    r = requests.get(f"{API}/certifications")
    assert r.status_code == 200
    certs = r.json()
    by_title = {c["title"]: c for c in certs}
    missing = []
    for title, host_frag in EXPECTED_VERIFY.items():
        c = by_title.get(title)
        if not c:
            missing.append(f"MISSING_CERT:{title}")
            continue
        v = c.get("verify_url") or ""
        if host_frag not in v:
            missing.append(f"{title} -> verify_url={v!r} expected host {host_frag}")
    assert not missing, "\n".join(missing)


def test_ccna_specific_url():
    r = requests.get(f"{API}/certifications")
    certs = r.json()
    ccna = next((c for c in certs if c["title"] == "CCNA 200-301 Network Fundamentals"), None)
    assert ccna is not None
    assert ccna.get("verify_url") == "https://simpli-web.app.link/e/veRghNOuj5b", f"got {ccna.get('verify_url')}"


def test_contact_page_has_socials():
    r = requests.get(f"{API}/pages/contact")
    assert r.status_code == 200
    d = r.json()["data"]
    assert "linkedin" in d, f"linkedin missing in contact.data keys={list(d.keys())}"
    assert "github" in d, f"github missing in contact.data keys={list(d.keys())}"
    assert d["linkedin"].startswith("http"), f"linkedin not URL: {d['linkedin']}"
    assert d["github"].startswith("http"), f"github not URL: {d['github']}"


def test_gen_ai_cert_has_no_file_but_verify():
    """Introduction To Generative AI: expects verify_url set, file_url may be empty."""
    r = requests.get(f"{API}/certifications")
    certs = r.json()
    c = next((c for c in certs if c["title"] == "Introduction To Generative AI"), None)
    assert c is not None
    assert c.get("verify_url"), "verify_url missing for Introduction To Generative AI"
    assert "skills.google" in c["verify_url"]
