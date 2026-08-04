"""Iteration 6 tests: certifications count (37, Google=9) + Blog CRUD."""
import os
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_EMAIL = "rdipanshu@gmail.com"
ADMIN_PASSWORD = "CyberAdmin@2026"

SEEDED_BLOG_SLUG = "cyber-security-hub-25"  # per review request
SEEDED_BLOG_SLUG_ALT = "securing-ot-it-convergence-in-power-utilities"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(session):
    r = session.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


# -------------- Certifications --------------
class TestCertifications:
    def test_total_37_and_google_9(self, session):
        r = session.get(f"{BASE_URL}/api/certifications")
        assert r.status_code == 200
        data = r.json()
        assert len(data) == 37, f"Expected 37 total certs, got {len(data)}"
        google = [c for c in data if c["category"] == "Google"]
        assert len(google) == 9, f"Expected 9 Google certs, got {len(google)}"

    def test_new_google_pdfs_have_thumbs(self, session):
        r = session.get(f"{BASE_URL}/api/certifications", params={"category": "Google"})
        assert r.status_code == 200
        google = r.json()
        titles = {c["title"]: c for c in google}
        for expected in ["AI for Brainstorming and Planning", "Design Prompts for Everyday Work Tasks"]:
            match = next((c for k, c in titles.items() if expected.lower() in k.lower()), None)
            assert match is not None, f"Missing cert: {expected}"
            assert match.get("file_type") == "pdf"
            assert match.get("thumb_url"), f"Missing thumb_url for {expected}"


# -------------- Blog --------------
class TestBlogPublic:
    def test_list_returns_published_only_without_content(self, session):
        r = session.get(f"{BASE_URL}/api/blog")
        assert r.status_code == 200
        posts = r.json()
        assert len(posts) >= 1
        for p in posts:
            assert p.get("published") is True
            assert "content" not in p, "list endpoint must exclude 'content' field"
        # Seeded post present - accept either slug variant
        slugs = {p["slug"] for p in posts}
        assert (SEEDED_BLOG_SLUG in slugs) or (SEEDED_BLOG_SLUG_ALT in slugs), f"Seeded post missing; slugs: {slugs}"

    def test_get_seeded_post(self, session):
        # Try both possible slugs
        for slug in [SEEDED_BLOG_SLUG, SEEDED_BLOG_SLUG_ALT]:
            r = session.get(f"{BASE_URL}/api/blog/{slug}")
            if r.status_code == 200:
                data = r.json()
                assert "content" in data and len(data["content"]) > 0
                assert data["slug"] == slug
                return
        pytest.fail("Neither seeded slug returned 200")

    def test_nonexistent_slug_404(self, session):
        r = session.get(f"{BASE_URL}/api/blog/nonexistent-slug-xyz-12345")
        assert r.status_code == 404


class TestBlogAdminAuth:
    def test_admin_list_requires_auth(self, session):
        r = requests.get(f"{BASE_URL}/api/blog/admin")
        assert r.status_code == 401

    def test_create_requires_auth(self):
        r = requests.post(f"{BASE_URL}/api/blog", json={"title": "x", "content": "y"})
        assert r.status_code == 401

    def test_update_requires_auth(self):
        r = requests.put(f"{BASE_URL}/api/blog/some-id", json={"title": "x"})
        assert r.status_code == 401

    def test_delete_requires_auth(self):
        r = requests.delete(f"{BASE_URL}/api/blog/some-id")
        assert r.status_code == 401


class TestBlogCRUD:
    created_ids = []

    def test_full_crud_flow(self, session, auth):
        # CREATE
        payload = {
            "title": "TEST_ Iteration6 Blog Post",
            "excerpt": "test excerpt",
            "content": "## Heading\n\nSome body text.\n\n- item1\n- item2",
            "tags": ["test", "iter6"],
            "published": True,
        }
        r = session.post(f"{BASE_URL}/api/blog", json=payload, headers=auth)
        assert r.status_code == 200, r.text
        post = r.json()
        assert post["title"] == payload["title"]
        assert post["slug"] == "test-iteration6-blog-post"
        assert post["published"] is True
        pid, slug = post["id"], post["slug"]
        self.__class__.created_ids.append(pid)

        # Public list includes it
        r = session.get(f"{BASE_URL}/api/blog")
        assert any(p["id"] == pid for p in r.json())

        # Public detail returns full content
        r = session.get(f"{BASE_URL}/api/blog/{slug}")
        assert r.status_code == 200
        assert r.json()["content"] == payload["content"]

        # Duplicate title -> unique slug
        r2 = session.post(f"{BASE_URL}/api/blog", json=payload, headers=auth)
        assert r2.status_code == 200
        post2 = r2.json()
        assert post2["slug"] != slug
        assert post2["slug"].startswith("test-iteration6-blog-post")
        self.__class__.created_ids.append(post2["id"])

        # UPDATE title -> slug regenerates
        r = session.put(f"{BASE_URL}/api/blog/{pid}", json={"title": "TEST_ Renamed Post"}, headers=auth)
        assert r.status_code == 200
        updated = r.json()
        assert updated["slug"] == "test-renamed-post"
        new_slug = updated["slug"]

        # UNPUBLISH -> hidden from public list & 404 on detail
        r = session.put(f"{BASE_URL}/api/blog/{pid}", json={"published": False}, headers=auth)
        assert r.status_code == 200
        assert r.json()["published"] is False
        r = session.get(f"{BASE_URL}/api/blog")
        assert not any(p["id"] == pid for p in r.json())
        r = session.get(f"{BASE_URL}/api/blog/{new_slug}")
        assert r.status_code == 404

        # Admin list still includes it
        r = session.get(f"{BASE_URL}/api/blog/admin", headers=auth)
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # DELETE both
        for cid in list(self.__class__.created_ids):
            r = session.delete(f"{BASE_URL}/api/blog/{cid}", headers=auth)
            assert r.status_code == 200
            self.__class__.created_ids.remove(cid)

    def test_seeded_post_preserved(self, session):
        r = session.get(f"{BASE_URL}/api/blog")
        assert r.status_code == 200
        slugs = {p["slug"] for p in r.json()}
        assert (SEEDED_BLOG_SLUG in slugs) or (SEEDED_BLOG_SLUG_ALT in slugs), "Seeded post got deleted!"
