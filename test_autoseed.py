#!/usr/bin/env python3
"""
Test startup auto-seed functionality for certifications.
Tests that backend/seed_certs.json is loaded on startup when collection is empty.
"""
import json
import subprocess
import time
import requests
from pymongo import MongoClient

# MongoDB connection
MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "portfolio"

# Backend URL
BASE_URL = "https://9cd14d1f-5e70-4145-82e1-b68d3202af65.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "rdipanshu@gmail.com"
TEST_PASSWORD = "aaxw!#77#4"

def get_mongo_client():
    """Get MongoDB client"""
    return MongoClient(MONGO_URL)

def get_auth_token():
    """Get JWT token"""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        timeout=10
    )
    if resp.status_code == 200:
        return resp.json().get("token")
    return None

def restart_backend():
    """Restart backend service"""
    print("→ Restarting backend service...")
    result = subprocess.run(
        ["sudo", "supervisorctl", "restart", "backend"],
        capture_output=True,
        text=True
    )
    print(f"  {result.stdout.strip()}")
    time.sleep(5)  # Wait for service to start
    return result.returncode == 0

def wait_for_backend(max_attempts=10):
    """Wait for backend to be ready"""
    for i in range(max_attempts):
        try:
            resp = requests.get(f"{BASE_URL}/health", timeout=5)
            if resp.status_code == 200:
                print("✓ Backend is ready")
                return True
        except Exception:
            pass
        time.sleep(2)
    return False

def test_no_seed_file():
    """Test 3.1: No seed_certs.json → startup doesn't crash"""
    print("\n=== Test 3.1: Startup Without seed_certs.json ===")
    
    # Backup existing file if any
    try:
        with open("/app/backend/seed_certs.json", "r") as f:
            backup = f.read()
    except FileNotFoundError:
        backup = None
    
    # Remove seed file
    subprocess.run(["rm", "-f", "/app/backend/seed_certs.json"], check=True)
    print("✓ Removed seed_certs.json")
    
    # Restart backend
    if not restart_backend():
        print("✗ FAIL: Backend restart failed")
        return False
    
    if not wait_for_backend():
        print("✗ FAIL: Backend did not start")
        return False
    
    # Check health
    try:
        resp = requests.get(f"{BASE_URL}/health", timeout=10)
        if resp.status_code == 200 and resp.json().get("status") == "ok":
            print("✓ PASS: Backend started successfully without seed file")
            
            # Check certifications endpoint still works
            resp2 = requests.get(f"{BASE_URL}/certifications", timeout=10)
            if resp2.status_code == 200:
                print("✓ PASS: GET /api/certifications still works")
                result = True
            else:
                print(f"✗ FAIL: GET /api/certifications returned {resp2.status_code}")
                result = False
        else:
            print("✗ FAIL: Health check failed")
            result = False
    except Exception as e:
        print(f"✗ FAIL: {e}")
        result = False
    
    # Restore backup if existed
    if backup:
        with open("/app/backend/seed_certs.json", "w") as f:
            f.write(backup)
    
    return result

def test_seed_on_empty_collection():
    """Test 3.2: Create seed file, wipe collection, restart → certs are seeded"""
    print("\n=== Test 3.2: Auto-seed From seed_certs.json ===")
    
    # Create seed file with 2 test certs
    seed_data = {
        "certifications": [
            {
                "id": "seed-test-1",
                "title": "Seeded Certification 1",
                "category": "Google",
                "order": 0,
                "verify_url": "https://example.com/verify1",
                "created_at": "2024-01-01T00:00:00Z"
            },
            {
                "id": "seed-test-2",
                "title": "Seeded Certification 2",
                "category": "IBM",
                "order": 0,
                "verify_url": "https://example.com/verify2",
                "created_at": "2024-01-01T00:00:00Z"
            }
        ]
    }
    
    with open("/app/backend/seed_certs.json", "w") as f:
        json.dump(seed_data, f, indent=2)
    print("✓ Created seed_certs.json with 2 test certs")
    
    # Wipe certifications collection
    client = get_mongo_client()
    db = client[DB_NAME]
    result = db.certifications.delete_many({})
    print(f"✓ Wiped certifications collection ({result.deleted_count} docs)")
    client.close()
    
    # Restart backend
    if not restart_backend():
        print("✗ FAIL: Backend restart failed")
        return False
    
    if not wait_for_backend():
        print("✗ FAIL: Backend did not start")
        return False
    
    # Check if certs were seeded
    try:
        resp = requests.get(f"{BASE_URL}/certifications", timeout=10)
        if resp.status_code != 200:
            print(f"✗ FAIL: GET /api/certifications returned {resp.status_code}")
            return False
        
        certs = resp.json()
        print(f"→ Found {len(certs)} certifications in DB")
        
        if len(certs) != 2:
            print(f"✗ FAIL: Expected 2 certs, got {len(certs)}")
            return False
        
        # Check if our seeded certs are present
        ids = {c.get("id") for c in certs}
        if "seed-test-1" not in ids or "seed-test-2" not in ids:
            print(f"✗ FAIL: Seeded certs not found. IDs: {ids}")
            return False
        
        print("✓ PASS: Both seeded certifications found in DB")
        return True
        
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False

def test_no_duplicate_seed():
    """Test 3.3: Restart with non-empty collection → no duplicate seeding"""
    print("\n=== Test 3.3: No Duplicate Seeding ===")
    
    # Get current count
    try:
        resp = requests.get(f"{BASE_URL}/certifications", timeout=10)
        count_before = len(resp.json())
        print(f"→ Current cert count: {count_before}")
    except Exception as e:
        print(f"✗ FAIL: Could not get current count: {e}")
        return False
    
    # Restart backend (seed file still exists, collection is NOT empty)
    if not restart_backend():
        print("✗ FAIL: Backend restart failed")
        return False
    
    if not wait_for_backend():
        print("✗ FAIL: Backend did not start")
        return False
    
    # Check count again
    try:
        resp = requests.get(f"{BASE_URL}/certifications", timeout=10)
        count_after = len(resp.json())
        print(f"→ Cert count after restart: {count_after}")
        
        if count_after == count_before:
            print("✓ PASS: No duplicate seeding occurred")
            return True
        else:
            print(f"✗ FAIL: Count changed from {count_before} to {count_after}")
            return False
            
    except Exception as e:
        print(f"✗ FAIL: {e}")
        return False

def cleanup():
    """Clean up: delete seed file and wipe collection"""
    print("\n=== Cleanup ===")
    
    # Delete seed file
    subprocess.run(["rm", "-f", "/app/backend/seed_certs.json"], check=True)
    print("✓ Deleted seed_certs.json")
    
    # Wipe certifications collection
    client = get_mongo_client()
    db = client[DB_NAME]
    result = db.certifications.delete_many({})
    print(f"✓ Wiped certifications collection ({result.deleted_count} docs)")
    client.close()
    
    # Restart backend to ensure clean state
    restart_backend()
    wait_for_backend()
    print("✓ Backend restarted")

def main():
    print("="*60)
    print("AUTO-SEED TESTS - Certification Startup Seeding")
    print("="*60)
    
    results = []
    
    # Test 3.1: No seed file
    results.append(("No seed file", test_no_seed_file()))
    
    # Test 3.2: Seed on empty collection
    results.append(("Seed on empty collection", test_seed_on_empty_collection()))
    
    # Test 3.3: No duplicate seed
    results.append(("No duplicate seed", test_no_duplicate_seed()))
    
    # Cleanup
    cleanup()
    
    # Summary
    print("\n" + "="*60)
    print("AUTO-SEED TEST SUMMARY")
    print("="*60)
    passed = sum(1 for _, result in results if result)
    failed = sum(1 for _, result in results if not result)
    
    for name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nPassed: {passed}/{len(results)}")
    print(f"Failed: {failed}/{len(results)}")
    print("="*60)
    
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
