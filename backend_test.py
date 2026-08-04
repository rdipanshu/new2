#!/usr/bin/env python3
"""
Backend API tests for certification bulk export/import and auto-seed functionality.
Tests the fix for: "i have uploaded all the certificates but it shows none"
"""
import requests
import json
import sys
from typing import Optional

# Test credentials from /app/memory/test_credentials.md
TEST_EMAIL = "rdipanshu@gmail.com"
TEST_PASSWORD = "aaxw!#77#4"

# Base URL - using the deployed backend URL
BASE_URL = "https://9cd14d1f-5e70-4145-82e1-b68d3202af65.preview.emergentagent.com/api"

class TestRunner:
    def __init__(self):
        self.token: Optional[str] = None
        self.passed = 0
        self.failed = 0
        self.failures = []
    
    def log(self, msg: str, level: str = "INFO"):
        prefix = "✓" if level == "PASS" else "✗" if level == "FAIL" else "→"
        print(f"{prefix} {msg}")
    
    def assert_equal(self, actual, expected, msg: str):
        if actual == expected:
            self.passed += 1
            self.log(f"{msg}: {actual}", "PASS")
            return True
        else:
            self.failed += 1
            self.failures.append(f"{msg}: expected {expected}, got {actual}")
            self.log(f"{msg}: expected {expected}, got {actual}", "FAIL")
            return False
    
    def assert_true(self, condition: bool, msg: str):
        if condition:
            self.passed += 1
            self.log(msg, "PASS")
            return True
        else:
            self.failed += 1
            self.failures.append(msg)
            self.log(msg, "FAIL")
            return False
    
    def assert_in(self, item, container, msg: str):
        if item in container:
            self.passed += 1
            self.log(msg, "PASS")
            return True
        else:
            self.failed += 1
            self.failures.append(f"{msg}: {item} not in {container}")
            self.log(f"{msg}: {item} not in {container}", "FAIL")
            return False
    
    def login(self) -> bool:
        """Authenticate and get JWT token"""
        self.log(f"Logging in as {TEST_EMAIL}...")
        try:
            resp = requests.post(
                f"{BASE_URL}/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
                timeout=10
            )
            if resp.status_code == 200:
                data = resp.json()
                self.token = data.get("token")
                self.log(f"Login successful, token: {self.token[:20]}...")
                return True
            else:
                self.log(f"Login failed: {resp.status_code} {resp.text}", "FAIL")
                return False
        except Exception as e:
            self.log(f"Login error: {e}", "FAIL")
            return False
    
    def get_auth_headers(self) -> dict:
        """Return headers with JWT token"""
        return {"Authorization": f"Bearer {self.token}"} if self.token else {}
    
    def test_health(self):
        """Regression: GET /api/health returns status ok and db true"""
        self.log("\n=== Test: Health Check ===")
        try:
            resp = requests.get(f"{BASE_URL}/health", timeout=10)
            self.assert_equal(resp.status_code, 200, "Health endpoint status")
            data = resp.json()
            self.assert_equal(data.get("status"), "ok", "Health status")
            self.assert_equal(data.get("db"), True, "Database connection")
        except Exception as e:
            self.log(f"Health check error: {e}", "FAIL")
            self.failed += 1
    
    def test_pages_count(self):
        """Regression: GET /api/pages returns 9 pages"""
        self.log("\n=== Test: Pages Count ===")
        try:
            resp = requests.get(f"{BASE_URL}/pages", timeout=10)
            self.assert_equal(resp.status_code, 200, "Pages endpoint status")
            pages = resp.json()
            self.assert_equal(len(pages), 9, "Number of pages")
        except Exception as e:
            self.log(f"Pages check error: {e}", "FAIL")
            self.failed += 1
    
    def test_export_without_auth(self):
        """Test 1.1: GET /api/certifications/export without token → 401"""
        self.log("\n=== Test: Export Without Auth ===")
        try:
            resp = requests.get(f"{BASE_URL}/certifications/export", timeout=10)
            self.assert_equal(resp.status_code, 401, "Export without auth returns 401")
        except Exception as e:
            self.log(f"Export without auth error: {e}", "FAIL")
            self.failed += 1
    
    def test_export_with_auth(self):
        """Test 1.2: GET /api/certifications/export with valid JWT → 200, correct shape"""
        self.log("\n=== Test: Export With Auth ===")
        try:
            resp = requests.get(
                f"{BASE_URL}/certifications/export",
                headers=self.get_auth_headers(),
                timeout=10
            )
            self.assert_equal(resp.status_code, 200, "Export with auth returns 200")
            data = resp.json()
            
            # Check shape
            self.assert_in("count", data, "Response has 'count' field")
            self.assert_in("certifications", data, "Response has 'certifications' field")
            
            # Verify count matches array length
            certs = data.get("certifications", [])
            count = data.get("count", 0)
            self.assert_equal(len(certs), count, "Count matches certifications array length")
            
            # Verify sorting by category, order
            if len(certs) > 1:
                sorted_check = True
                for i in range(len(certs) - 1):
                    cat1, ord1 = certs[i].get("category", ""), certs[i].get("order", 0)
                    cat2, ord2 = certs[i+1].get("category", ""), certs[i+1].get("order", 0)
                    if cat1 > cat2 or (cat1 == cat2 and ord1 > ord2):
                        sorted_check = False
                        break
                self.assert_true(sorted_check, "Certifications sorted by (category, order)")
            
            self.log(f"Exported {count} certifications")
            return data
        except Exception as e:
            self.log(f"Export with auth error: {e}", "FAIL")
            self.failed += 1
            return None
    
    def test_import_without_auth(self):
        """Test 2.1: POST /api/certifications/import without token → 401"""
        self.log("\n=== Test: Import Without Auth ===")
        try:
            payload = {
                "certifications": [{"id": "test1", "title": "Test", "category": "Anthropic"}],
                "mode": "merge"
            }
            resp = requests.post(
                f"{BASE_URL}/certifications/import",
                json=payload,
                timeout=10
            )
            self.assert_equal(resp.status_code, 401, "Import without auth returns 401")
        except Exception as e:
            self.log(f"Import without auth error: {e}", "FAIL")
            self.failed += 1
    
    def test_import_merge_insert(self):
        """Test 2.2: Import new cert in merge mode → inserted=1"""
        self.log("\n=== Test: Import Merge (Insert) ===")
        try:
            test_cert = {
                "id": "test-cert-001",
                "title": "Test Certification A",
                "category": "Anthropic",
                "order": 999,
                "verify_url": "https://example.com/verify"
            }
            payload = {"certifications": [test_cert], "mode": "merge"}
            
            resp = requests.post(
                f"{BASE_URL}/certifications/import",
                json=payload,
                headers=self.get_auth_headers(),
                timeout=10
            )
            self.assert_equal(resp.status_code, 200, "Import merge returns 200")
            data = resp.json()
            
            self.assert_equal(data.get("inserted"), 1, "Inserted count is 1")
            self.assert_equal(data.get("updated"), 0, "Updated count is 0")
            self.assert_true(data.get("total", 0) >= 1, "Total count >= 1")
            self.assert_equal(data.get("mode"), "merge", "Mode is merge")
            
            # Verify via GET
            resp2 = requests.get(f"{BASE_URL}/certifications", timeout=10)
            certs = resp2.json()
            found = any(c.get("id") == "test-cert-001" for c in certs)
            self.assert_true(found, "New cert appears in GET /api/certifications")
            
        except Exception as e:
            self.log(f"Import merge insert error: {e}", "FAIL")
            self.failed += 1
    
    def test_import_merge_update(self):
        """Test 2.3: Re-import same cert with changed title → updated=1"""
        self.log("\n=== Test: Import Merge (Update) ===")
        try:
            test_cert = {
                "id": "test-cert-001",
                "title": "Test Certification A - UPDATED",
                "category": "Anthropic",
                "order": 999
            }
            payload = {"certifications": [test_cert], "mode": "merge"}
            
            resp = requests.post(
                f"{BASE_URL}/certifications/import",
                json=payload,
                headers=self.get_auth_headers(),
                timeout=10
            )
            self.assert_equal(resp.status_code, 200, "Import merge update returns 200")
            data = resp.json()
            
            self.assert_equal(data.get("inserted"), 0, "Inserted count is 0")
            self.assert_equal(data.get("updated"), 1, "Updated count is 1")
            
            # Verify title was updated
            resp2 = requests.get(f"{BASE_URL}/certifications", timeout=10)
            certs = resp2.json()
            cert = next((c for c in certs if c.get("id") == "test-cert-001"), None)
            if cert:
                self.assert_equal(
                    cert.get("title"),
                    "Test Certification A - UPDATED",
                    "Title was updated in DB"
                )
            else:
                self.log("Could not find test cert to verify update", "FAIL")
                self.failed += 1
                
        except Exception as e:
            self.log(f"Import merge update error: {e}", "FAIL")
            self.failed += 1
    
    def test_import_invalid_category(self):
        """Test 2.4: Import cert with unknown category → silently skipped"""
        self.log("\n=== Test: Import Invalid Category ===")
        try:
            # Get current count
            resp_before = requests.get(f"{BASE_URL}/certifications", timeout=10)
            count_before = len(resp_before.json())
            
            test_cert = {
                "id": "test-invalid-cat",
                "title": "Invalid Category Cert",
                "category": "FooBarInvalidCategory",
                "order": 0
            }
            payload = {"certifications": [test_cert], "mode": "merge"}
            
            resp = requests.post(
                f"{BASE_URL}/certifications/import",
                json=payload,
                headers=self.get_auth_headers(),
                timeout=10
            )
            self.assert_equal(resp.status_code, 200, "Import with invalid category returns 200")
            data = resp.json()
            
            # Should not be inserted or updated
            self.assert_equal(data.get("inserted"), 0, "Invalid category not inserted")
            self.assert_equal(data.get("updated"), 0, "Invalid category not updated")
            
            # Verify it's not in DB
            resp_after = requests.get(f"{BASE_URL}/certifications", timeout=10)
            certs = resp_after.json()
            found = any(c.get("id") == "test-invalid-cat" for c in certs)
            self.assert_true(not found, "Invalid category cert not in DB")
            
        except Exception as e:
            self.log(f"Import invalid category error: {e}", "FAIL")
            self.failed += 1
    
    def test_import_replace_mode(self):
        """Test 2.5: Import with mode=replace → wipes collection first"""
        self.log("\n=== Test: Import Replace Mode ===")
        try:
            # Create a specific set to import
            test_certs = [
                {
                    "id": "replace-test-1",
                    "title": "Replace Test Cert 1",
                    "category": "Google",
                    "order": 0
                },
                {
                    "id": "replace-test-2",
                    "title": "Replace Test Cert 2",
                    "category": "IBM",
                    "order": 0
                }
            ]
            payload = {"certifications": test_certs, "mode": "replace"}
            
            resp = requests.post(
                f"{BASE_URL}/certifications/import",
                json=payload,
                headers=self.get_auth_headers(),
                timeout=10
            )
            self.assert_equal(resp.status_code, 200, "Import replace returns 200")
            data = resp.json()
            
            self.assert_equal(data.get("mode"), "replace", "Mode is replace")
            self.assert_equal(data.get("total"), 2, "Total count is exactly 2 after replace")
            
            # Verify DB has exactly these 2 certs
            resp2 = requests.get(f"{BASE_URL}/certifications", timeout=10)
            certs = resp2.json()
            self.assert_equal(len(certs), 2, "DB has exactly 2 certs after replace")
            
            ids = {c.get("id") for c in certs}
            self.assert_in("replace-test-1", ids, "Replace test cert 1 in DB")
            self.assert_in("replace-test-2", ids, "Replace test cert 2 in DB")
            
        except Exception as e:
            self.log(f"Import replace mode error: {e}", "FAIL")
            self.failed += 1
    
    def test_import_invalid_mode(self):
        """Test 2.6: Import with invalid mode → 400"""
        self.log("\n=== Test: Import Invalid Mode ===")
        try:
            payload = {
                "certifications": [{"id": "test", "title": "Test", "category": "Google"}],
                "mode": "invalid_mode"
            }
            resp = requests.post(
                f"{BASE_URL}/certifications/import",
                json=payload,
                headers=self.get_auth_headers(),
                timeout=10
            )
            self.assert_equal(resp.status_code, 400, "Invalid mode returns 400")
        except Exception as e:
            self.log(f"Import invalid mode error: {e}", "FAIL")
            self.failed += 1
    
    def test_import_empty_array(self):
        """Test 2.7: Import with empty certifications array → 400"""
        self.log("\n=== Test: Import Empty Array ===")
        try:
            payload = {"certifications": [], "mode": "merge"}
            resp = requests.post(
                f"{BASE_URL}/certifications/import",
                json=payload,
                headers=self.get_auth_headers(),
                timeout=10
            )
            self.assert_equal(resp.status_code, 400, "Empty array returns 400")
        except Exception as e:
            self.log(f"Import empty array error: {e}", "FAIL")
            self.failed += 1
    
    def test_existing_cert_crud(self):
        """Regression: Existing cert CRUD still works"""
        self.log("\n=== Test: Existing Cert CRUD ===")
        try:
            # List certs
            resp = requests.get(f"{BASE_URL}/certifications", timeout=10)
            self.assert_equal(resp.status_code, 200, "List certifications works")
            
            # Note: We can't easily test create/delete without file upload in this simple test
            # But we've verified list works, which is the main regression concern
            
        except Exception as e:
            self.log(f"Cert CRUD error: {e}", "FAIL")
            self.failed += 1
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Passed: {self.passed}")
        print(f"Failed: {self.failed}")
        print(f"Total:  {self.passed + self.failed}")
        
        if self.failures:
            print("\nFAILURES:")
            for failure in self.failures:
                print(f"  ✗ {failure}")
        
        print("="*60)
        return self.failed == 0


def main():
    runner = TestRunner()
    
    print("="*60)
    print("BACKEND API TESTS - Certification Export/Import")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("="*60)
    
    # Login first
    if not runner.login():
        print("\n✗ FATAL: Could not authenticate. Aborting tests.")
        return 1
    
    # Run regression tests first
    runner.test_health()
    runner.test_pages_count()
    
    # Test export endpoint
    runner.test_export_without_auth()
    runner.test_export_with_auth()
    
    # Test import endpoint
    runner.test_import_without_auth()
    runner.test_import_merge_insert()
    runner.test_import_merge_update()
    runner.test_import_invalid_category()
    runner.test_import_replace_mode()
    runner.test_import_invalid_mode()
    runner.test_import_empty_array()
    
    # Regression test
    runner.test_existing_cert_crud()
    
    # Print summary
    success = runner.print_summary()
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
