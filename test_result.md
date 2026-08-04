#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "User reported: 'i have uploaded all the certificates but it shows none' — certifications visible in one environment (they called it 'production' — likely the working preview) are missing on the actual deployed site (https://dipanshu.co.in). Root cause: preview and production have separate MongoDB databases; the app only auto-seeds pages, not certifications, so a fresh deployment starts with 0 certs. Fix: (1) added bulk export endpoint to dump certs as JSON, (2) added bulk import endpoint to restore from JSON, (3) added startup auto-seed from a bundled seed_certs.json when the certifications collection is empty, (4) added admin UI Export/Import buttons."

backend:
  - task: "GET /api/certifications/export (auth) — bulk dump certs as JSON for migration"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added endpoint that requires auth and returns {count, certifications: [...]} sorted by category+order. Verified via curl locally: returns valid JSON."
        - working: true
          agent: "testing"
          comment: "PASSED all tests: (1) Without token returns 401 ✓ (2) With valid JWT returns 200 with correct shape {count, certifications} ✓ (3) Count matches array length ✓ (4) Certifications sorted by (category, order) ✓ Tested via backend_test.py."
  - task: "POST /api/certifications/import (auth) — bulk restore from JSON, merge or replace mode"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Accepts BulkImportRequest {certifications: [dict], mode: 'merge'|'replace'}. Merge upserts by id; replace wipes collection first. Skips items whose category is not in the allowed list. Returns {inserted, updated, total, mode}. Requires JWT."
        - working: true
          agent: "testing"
          comment: "PASSED all tests: (1) Without token returns 401 ✓ (2) Merge mode inserts new cert (inserted=1) ✓ (3) Merge mode updates existing cert (updated=1) ✓ (4) Invalid category silently skipped ✓ (5) Replace mode wipes collection first, total=2 after import ✓ (6) Invalid mode returns 400 ✓ (7) Empty array returns 400 ✓ All verified via GET /api/certifications. Tested via backend_test.py."
  - task: "Startup auto-seed + self-heal of certifications from bundled backend/seed_certs.json"
    implemented: true
    working: "NA"
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
        - working: "NA"
          agent: "main"
          comment: "On startup, if certifications collection has 0 rows and backend/seed_certs.json exists, seed from it. Payload may be either {certifications:[...]} or a raw list. Errors are swallowed with a warning. Test data path: currently no seed_certs.json is committed, so this is a no-op on preview (expected)."
        - working: true
          agent: "testing"
          comment: "PASSED all tests: (1) Startup without seed_certs.json does NOT crash, /api/certifications still works ✓ (2) Created seed file with 2 certs, wiped collection, restarted backend → both certs seeded correctly ✓ (3) Restarted again with non-empty collection → no duplicate seeding ✓ Backend logs confirm: 'Auto-seeded 2 certifications from seed_certs.json'. Tested via test_autoseed.py."
        - working: "NA"
          agent: "main"
          comment: "NEW self-heal branch added on top of the existing auto-seed. User reported certs show on public /certifications page but with no thumbnails and PDFs won't open (404 on /api/uploads/certs/*.pdf). Root cause: production has an ephemeral filesystem — cert files uploaded via API get lost between container restarts, leaving DB rows pointing at UUIDs that no longer exist on disk. New behaviour: on startup, for each existing cert whose file_url points at a missing file, look up seed_certs.json by (title, category) and REPLACE the broken row with the seed data. Verified locally by inserting 3 rows with fake BROKEN_ file_urls, restarting → log 'Self-healed 3 certifications with missing files (repointed to bundled URLs)' → all 3 now point to real files on disk that exist. Preview seed_certs.json currently has 37 certs; 149 cert files are committed in backend/uploads/certs/."

frontend:
  - task: "Admin CertManager: Export JSON / Import JSON buttons"
    implemented: true
    working: "NA"
    file: "frontend/src/pages/admin/CertManager.jsx"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added two buttons at the top of CertManager. Export downloads a JSON file. Import opens a file picker, sends payload to /api/certifications/import with mode=merge, then reloads the list. Not requesting frontend testing at this time."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 8
  run_ui: false

test_plan:
  current_focus:
    - "Startup auto-seed + self-heal of certifications from bundled backend/seed_certs.json"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Investigating user complaint that certifications uploaded on one env don't appear on the deployed https://dipanshu.co.in. Verified: production API returns [] for /api/certifications while /api/pages has 9. Root cause: certs were never seeded on production DB. Implemented export/import endpoints + startup auto-seed. Admin credentials: rdipanshu@gmail.com / aaxw!#77#4. Please test: (1) auth-guarded export returns JSON with count and certifications array; (2) import in merge mode inserts new certs, updates existing by id, skips invalid categories; (3) import in replace mode wipes first; (4) both endpoints reject unauthenticated calls with 401; (5) after import, GET /api/certifications reflects the changes and is sorted by (order, created_at)."
    - agent: "testing"
      message: "✅ ALL TESTS PASSED (37/37). Export endpoint: auth-guarded ✓, returns correct shape ✓, sorted by (category, order) ✓. Import endpoint: auth-guarded ✓, merge mode (insert/update) ✓, replace mode ✓, invalid category skipped ✓, validation (400 for invalid mode/empty array) ✓. Auto-seed: no crash without file ✓, seeds on empty collection ✓, no duplicates on restart ✓. Regression: health ✓, pages count=9 ✓, cert CRUD ✓. Backend logs confirm auto-seed working. All features ready for production use."
    - agent: "main"
      message: "Data update, not a code change: applied 21 verify_url updates supplied by the user (16 unique certs from their message + 5 also-applied duplicates I re-mapped by DB title). Result: all 37 certs on preview AND all 37 on production (https://dipanshu.co.in) now have verify_url set (37/37 = 100%). CCNA 200-301 Network Fundamentals verify_url REPLACED (was credly, now https://simpli-web.app.link/e/veRghNOuj5b as requested). seed_certs.json refreshed accordingly. Please verify from the backend: (1) GET https://localhost:8001/api/certifications returns 37 items; (2) every cert has a truthy verify_url; (3) the specific mappings below are exactly what the DB stores now — spot-check any 3-5 rows:\n  - AI Fluency - AI Capabilities and Limitations → https://verify.skilljar.com/c/cu6zz8muhmvy\n  - AI Fluency - Framework and Foundations → https://verify.skilljar.com/c/6e8d4cwgwvdd\n  - Claude with the Anthropic API → https://verify.skilljar.com/c/u4io6c7dhi9o\n  - Teaching the AI Fluency Framework → https://verify.skilljar.com/c/w5ue6fm8skew\n  - CCNA 200-301 Network Fundamentals → https://simpli-web.app.link/e/veRghNOuj5b\n  - AWS Foundations - Machine Learning Basics → https://simpli-web.app.link/e/LDsBQnQuj5b\n  - Foundation of cybersecurity → https://www.coursera.org/account/accomplishments/verify/STSSVFC8QE85\n  - Google Intro To AI → https://coursera.org/verify/VE4FKFVMVUMZ\n  - Design Prompts for Everyday Work Tasks → https://coursera.org/verify/W1QY3CVTKCQF (wait – actually 0M7XG7L4TIVS)\n  - AI for Brainstorming and Planning → https://coursera.org/verify/W1QY3CVTKCQF\n  - Introduction to CISSP → https://simpli-web.app.link/e/av3Blxquj5b\n  - Git Training → https://simpli-web.app.link/e/M1AFmgSuj5b\n  - Gemini for Google Workspace → https://simpli-web.app.link/e/dA5Z3h9uj5b\n\nAlso please still exercise the SELF-HEAL logic from the previous review (see task: 'Startup auto-seed + self-heal of certifications from bundled backend/seed_certs.json') using the 6 scenarios previously described — that was interrupted and never actually executed. Restore DB to seeded 37-cert state after tests. Admin creds: rdipanshu@gmail.com / aaxw!#77#4."

