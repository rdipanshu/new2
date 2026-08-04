"""Backend API tests for Dipanshu Rana portfolio + admin CMS."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://vercel-ready-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "rdipanshu@gmail.com"
ADMIN_PASSWORD = "CyberAdmin@2026"

PAGES = ["home", "summary", "skills", "experience", "certifications", "education", "activity", "contact"]


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and "user" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    return data["token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ---------- AUTH ----------
class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong_pw_test_1"})
        assert r.status_code in (401, 429)

    def test_me_with_bearer(self, auth_headers):
        r = requests.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401


# ---------- PAGES ----------
class TestPages:
    def test_get_all_pages(self):
        r = requests.get(f"{API}/pages")
        assert r.status_code == 200
        data = r.json()
        ids = {p["page_id"] for p in data}
        assert set(PAGES).issubset(ids), f"Missing pages: {set(PAGES) - ids}"

    def test_get_home(self):
        r = requests.get(f"{API}/pages/home")
        assert r.status_code == 200
        d = r.json()
        assert d["data"]["title"] == "Dipanshu Rana"

    def test_update_home_requires_auth(self):
        r = requests.put(f"{API}/pages/home", json={"data": {"title": "hacked"}})
        assert r.status_code == 401

    def test_update_home_with_auth_and_revert(self, auth_headers):
        original = requests.get(f"{API}/pages/home").json()
        new_data = dict(original["data"])
        new_data["title"] = "TEST_TitleUpdated"
        r = requests.put(f"{API}/pages/home", json={"data": new_data, "video_url": original["video_url"]}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["data"]["title"] == "TEST_TitleUpdated"
        # Revert
        r2 = requests.put(f"{API}/pages/home", json={"data": original["data"], "video_url": original["video_url"]}, headers=auth_headers)
        assert r2.status_code == 200
        r3 = requests.get(f"{API}/pages/home")
        assert r3.json()["data"]["title"] == "Dipanshu Rana"


# ---------- CERTIFICATIONS ----------
class TestCerts:
    created_id = None

    def test_categories(self):
        r = requests.get(f"{API}/certifications/categories")
        assert r.status_code == 200
        assert "Google" in r.json()

    def test_create_requires_auth(self):
        r = requests.post(f"{API}/certifications", data={"title": "x", "category": "Google"})
        assert r.status_code == 401

    def test_create_invalid_category(self, auth_headers):
        r = requests.post(f"{API}/certifications", data={"title": "TEST_cert", "category": "NotAVendor"}, headers=auth_headers)
        assert r.status_code == 400

    def test_create_cert(self, auth_headers):
        r = requests.post(f"{API}/certifications", data={"title": "TEST_GoogleCert", "category": "Google"}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["title"] == "TEST_GoogleCert"
        assert d["category"] == "Google"
        assert "id" in d
        TestCerts.created_id = d["id"]

    def test_list_cert(self):
        r = requests.get(f"{API}/certifications")
        assert r.status_code == 200
        assert any(c["id"] == TestCerts.created_id for c in r.json())

    def test_update_cert(self, auth_headers):
        r = requests.put(f"{API}/certifications/{TestCerts.created_id}", data={"title": "TEST_Updated", "category": "IBM"}, headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["title"] == "TEST_Updated"
        assert r.json()["category"] == "IBM"

    def test_delete_cert(self, auth_headers):
        r = requests.delete(f"{API}/certifications/{TestCerts.created_id}", headers=auth_headers)
        assert r.status_code == 200
        # verify gone
        r2 = requests.get(f"{API}/certifications")
        assert not any(c["id"] == TestCerts.created_id for c in r2.json())


# ---------- UPLOAD ----------
class TestUpload:
    def test_upload_requires_auth(self):
        r = requests.post(f"{API}/upload", files={"file": ("t.png", b"data", "image/png")})
        assert r.status_code == 401

    def test_upload_png(self, auth_headers):
        # tiny valid png
        png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626000000000050001a5f645400000000049454e44ae426082")
        r = requests.post(f"{API}/upload", files={"file": ("test.png", io.BytesIO(png), "image/png")}, headers=auth_headers)
        assert r.status_code == 200, r.text
        url = r.json()["url"]
        assert url.startswith("/api/uploads/")
        # fetch it back
        r2 = requests.get(f"{BASE_URL}{url}")
        assert r2.status_code == 200


# ---------- CONTACT ----------
class TestContact:
    created_id = None

    def test_submit_message(self):
        r = requests.post(f"{API}/contact", json={"name": "TEST_User", "email": "test@example.com", "subject": "hi", "message": "hello world"})
        assert r.status_code == 200
        TestContact.created_id = r.json()["id"]

    def test_list_requires_auth(self):
        r = requests.get(f"{API}/contact/messages")
        assert r.status_code == 401

    def test_list_messages(self, auth_headers):
        r = requests.get(f"{API}/contact/messages", headers=auth_headers)
        assert r.status_code == 200
        assert any(m["id"] == TestContact.created_id for m in r.json())

    def test_delete_message(self, auth_headers):
        r = requests.delete(f"{API}/contact/messages/{TestContact.created_id}", headers=auth_headers)
        assert r.status_code == 200


# ---------- NEW: Contact mark-as-read ----------
class TestMarkRead:
    def test_mark_read_flow(self, auth_headers):
        # create message
        r = requests.post(f"{API}/contact", json={"name": "TEST_ReadUser", "email": "read@example.com", "subject": "read-test", "message": "test read flag"})
        assert r.status_code == 200
        mid = r.json()["id"]

        # unauthenticated PATCH must return 401
        r_unauth = requests.patch(f"{API}/contact/messages/{mid}/read")
        assert r_unauth.status_code == 401

        # authenticated PATCH sets read=true
        r_ok = requests.patch(f"{API}/contact/messages/{mid}/read", headers=auth_headers)
        assert r_ok.status_code == 200
        assert r_ok.json().get("ok") is True

        # verify via list
        r_list = requests.get(f"{API}/contact/messages", headers=auth_headers)
        assert r_list.status_code == 200
        found = [m for m in r_list.json() if m["id"] == mid]
        assert found and found[0]["read"] is True

        # 404 for unknown id
        r_404 = requests.patch(f"{API}/contact/messages/nonexistent-id/read", headers=auth_headers)
        assert r_404.status_code == 404

        # cleanup
        requests.delete(f"{API}/contact/messages/{mid}", headers=auth_headers)


# ---------- NEW: Certifications count + PDF thumbnail ----------
class TestCertsBulk:
    def test_35_certs_and_thumbs(self):
        r = requests.get(f"{API}/certifications")
        assert r.status_code == 200
        certs = r.json()
        assert len(certs) >= 35, f"Expected >=35 certs, got {len(certs)}"
        pdf_certs = [c for c in certs if (c.get("file_type") or "").lower() == "pdf" or (c.get("file_url") or "").lower().endswith(".pdf")]
        with_thumb = [c for c in pdf_certs if c.get("thumb_url")]
        # spec: 31 PDF certs should have thumb_url
        assert len(with_thumb) >= 31, f"Expected >=31 PDFs with thumb_url, got {len(with_thumb)} of {len(pdf_certs)} PDFs"

        # category counts
        by_cat = {}
        for c in certs:
            by_cat[c["category"]] = by_cat.get(c["category"], 0) + 1
        expected = {"Anthropic": 12, "Google": 7, "Simplilearn": 7, "IBM": 4, "Cisco": 3, "University of Helsinki": 1, "Amazon": 1}
        for cat, n in expected.items():
            assert by_cat.get(cat, 0) >= n, f"Category {cat}: expected>={n}, got {by_cat.get(cat, 0)}"

    def test_upload_pdf_generates_thumb(self, auth_headers):
        # minimal valid 1-page PDF
        pdf_bytes = (
            b"%PDF-1.4\n"
            b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
            b"2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n"
            b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 300]/Contents 4 0 R/Resources<<>>>>endobj\n"
            b"4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 50 150 Td (TEST PDF) Tj ET\nendstream endobj\n"
            b"xref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000053 00000 n \n0000000098 00000 n \n0000000178 00000 n \n"
            b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n260\n%%EOF"
        )
        files = {"file": ("test_thumb.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
        data = {"title": "TEST_PDFThumbCert", "category": "Google"}
        r = requests.post(f"{API}/certifications", data=data, files=files, headers=auth_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        cert_id = d["id"]
        try:
            assert d.get("file_url"), "file_url missing"
            # thumb_url should be populated for PDF uploads
            assert d.get("thumb_url"), f"thumb_url missing for PDF cert: {d}"
            # verify thumb is reachable
            thumb_url = d["thumb_url"]
            if thumb_url.startswith("/"):
                r_thumb = requests.get(f"{BASE_URL}{thumb_url}")
                assert r_thumb.status_code == 200
        finally:
            requests.delete(f"{API}/certifications/{cert_id}", headers=auth_headers)


# ---------- NEW: verify_url + reorder ----------
class TestVerifyUrlAndReorder:
    def test_verify_url_count_and_order_field(self):
        r = requests.get(f"{API}/certifications")
        assert r.status_code == 200
        certs = r.json()
        # every cert should have an 'order' int field
        assert all(isinstance(c.get("order"), int) for c in certs), "All certs must have order:int"
        # at least 20 certs with verify_url populated (Anthropic=12 + more)
        with_verify = [c for c in certs if c.get("verify_url")]
        # CCNA 200-301 verify_url removed in iteration 4; expect >=19
        assert len(with_verify) >= 19, f"Expected >=19 certs with verify_url, got {len(with_verify)}"

    def test_certs_sorted_by_order_within_category(self):
        r = requests.get(f"{API}/certifications")
        certs = r.json()
        by_cat = {}
        for c in certs:
            by_cat.setdefault(c["category"], []).append(c)
        for cat, lst in by_cat.items():
            orders = [c["order"] for c in lst]
            assert orders == sorted(orders), f"Category {cat} not sorted by order: {orders}"

    def test_reorder_requires_auth(self):
        r = requests.post(f"{API}/certifications/reorder", json={"ids": ["a", "b"]})
        assert r.status_code == 401

    def test_create_with_verify_url_update_clear_and_reorder(self, auth_headers):
        # create with verify_url
        r = requests.post(
            f"{API}/certifications",
            data={"title": "TEST_ReorderCert", "category": "Google", "verify_url": "https://example.com/verify/xyz"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        cert = r.json()
        cert_id = cert["id"]
        try:
            assert cert["verify_url"] == "https://example.com/verify/xyz"
            assert isinstance(cert.get("order"), int)

            # GET to verify persisted
            g = requests.get(f"{API}/certifications").json()
            found = next(c for c in g if c["id"] == cert_id)
            assert found["verify_url"] == "https://example.com/verify/xyz"

            # PUT to update verify_url
            r2 = requests.put(f"{API}/certifications/{cert_id}",
                              data={"verify_url": "https://example.com/updated"}, headers=auth_headers)
            assert r2.status_code == 200
            assert r2.json()["verify_url"] == "https://example.com/updated"

            # PUT with __CLEAR__ sentinel clears verify_url to null (iteration 4 fix)
            r3 = requests.put(f"{API}/certifications/{cert_id}",
                              data={"verify_url": "__CLEAR__"}, headers=auth_headers)
            assert r3.status_code == 200
            assert r3.json().get("verify_url") is None

            # Reorder: swap the new cert with another Google cert (put it first)
            google_certs = [c for c in g if c["category"] == "Google"]
            google_ids = [c["id"] for c in google_certs]
            # move cert_id to position 0
            google_ids.remove(cert_id)
            new_order = [cert_id] + google_ids
            r4 = requests.post(f"{API}/certifications/reorder", json={"ids": new_order}, headers=auth_headers)
            assert r4.status_code == 200
            assert r4.json().get("ok") is True

            # verify order persisted (cert_id should have order=0)
            g2 = requests.get(f"{API}/certifications").json()
            found2 = next(c for c in g2 if c["id"] == cert_id)
            assert found2["order"] == 0, f"Expected order=0, got {found2['order']}"
            # verify other ids got their sequential order
            for idx, cid in enumerate(new_order):
                cc = next(c for c in g2 if c["id"] == cid)
                assert cc["order"] == idx

            # Restore original order for Google category (by created_at asc which was original)
            original_google_sorted = sorted(google_certs, key=lambda c: c["created_at"])
            restore_ids = [c["id"] for c in original_google_sorted]
            # include the new cert at end (it'll get deleted next)
            restore_ids.append(cert_id)
            requests.post(f"{API}/certifications/reorder", json={"ids": restore_ids}, headers=auth_headers)
        finally:
            requests.delete(f"{API}/certifications/{cert_id}", headers=auth_headers)



# ---------- NEW: Analytics ----------
class TestAnalytics:
    def test_visit_valid_page(self):
        r = requests.post(f"{API}/analytics/visit", json={"page": "home"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_visit_invalid_page(self):
        r = requests.post(f"{API}/analytics/visit", json={"page": "not_a_page"})
        assert r.status_code == 400

    def test_summary_requires_auth(self):
        r = requests.get(f"{API}/analytics/summary")
        assert r.status_code == 401

    def test_cert_view_increments(self, auth_headers):
        # create a temp cert to safely test view increment
        r = requests.post(f"{API}/certifications", data={"title": "TEST_ViewCert", "category": "Google"}, headers=auth_headers)
        assert r.status_code == 200
        cert_id = r.json()["id"]
        try:
            # fire 3 views
            for _ in range(3):
                rv = requests.post(f"{API}/analytics/cert-view", json={"cert_id": cert_id})
                assert rv.status_code == 200
            # verify via analytics/summary top_certs
            s = requests.get(f"{API}/analytics/summary", headers=auth_headers)
            assert s.status_code == 200
            data = s.json()
            for key in ["total_visits", "visits_last_7_days", "visits_by_page", "top_certs", "unread_messages"]:
                assert key in data, f"missing {key} in summary"
            assert isinstance(data["visits_by_page"], list)
            assert isinstance(data["top_certs"], list)
            match = [c for c in data["top_certs"] if c["id"] == cert_id]
            assert match, f"cert {cert_id} not in top_certs"
            assert match[0]["views"] >= 3
        finally:
            requests.delete(f"{API}/certifications/{cert_id}", headers=auth_headers)

    def test_summary_totals_increase(self, auth_headers):
        s1 = requests.get(f"{API}/analytics/summary", headers=auth_headers).json()
        requests.post(f"{API}/analytics/visit", json={"page": "skills"})
        requests.post(f"{API}/analytics/visit", json={"page": "contact"})
        s2 = requests.get(f"{API}/analytics/summary", headers=auth_headers).json()
        assert s2["total_visits"] >= s1["total_visits"] + 2


# ---------- Re-verify verify_url clear via __CLEAR__ sentinel ----------
class TestVerifyUrlClear:
    def test_clear_sentinel(self, auth_headers):
        r = requests.post(f"{API}/certifications",
                          data={"title": "TEST_ClearCert", "category": "Google", "verify_url": "https://foo.com/v"},
                          headers=auth_headers)
        assert r.status_code == 200
        cid = r.json()["id"]
        try:
            assert r.json()["verify_url"] == "https://foo.com/v"
            # clear via sentinel
            r2 = requests.put(f"{API}/certifications/{cid}",
                              data={"verify_url": "__CLEAR__"}, headers=auth_headers)
            assert r2.status_code == 200
            assert r2.json().get("verify_url") is None
            # verify persisted
            g = requests.get(f"{API}/certifications").json()
            found = next(c for c in g if c["id"] == cid)
            assert found.get("verify_url") is None
        finally:
            requests.delete(f"{API}/certifications/{cid}", headers=auth_headers)
