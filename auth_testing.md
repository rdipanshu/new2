# Auth Testing Playbook

Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
```
Verify: bcrypt hash starts with `$2b$`, unique index on users.email, index on login_attempts.identifier.

Step 2: API Testing
```
curl -c cookies.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"rdipanshu@gmail.com","password":"CyberAdmin@2026"}'
curl -b cookies.txt http://localhost:8001/api/auth/me
```
Login returns {token, user} and sets access_token cookie. /me works via cookie or Bearer token.

Brute force: 5 failed attempts on same email locks for 15 minutes (HTTP 429).
