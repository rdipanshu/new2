# PRD — Dipanshu Rana Portfolio + Admin CMS

## Original Problem Statement
Full-stack, dark-mode, cybersecurity-themed personal portfolio for Dipanshu Rana (Cybersecurity Specialist & Network Security Engineer) with 8 pages, per-page video backgrounds, and a secure Admin Console (/admin) CMS to edit text, background videos, and manage 39 certifications across 7 vendor categories. User provided Data.rar with CV + 4 background videos (Skills, Certifications, Activity, Contact); other 4 pages' docs were AI video-generation prompts, so fitting stock cyber videos were self-hosted for Home/Summary/Experience/Education (editable in admin).

## User Choices
- Admin auth: Simple username/password (JWT)
- Contact form: DB storage + email notifications (email PENDING — needs Resend API key)
- Videos: self-hosted from server (/api/uploads/videos/*)
- Design accent: designer's choice (cyan/emerald on zinc-950, glassmorphism)

## Architecture
- FastAPI + MongoDB (motor), React 19 + Tailwind + shadcn + framer-motion
- Collections: users, pages (page_id, video_url, data), certifications, contact_messages, login_attempts
- Static uploads mounted at /api/uploads (videos/, certs/, misc/) — served through backend
- JWT auth (PyJWT + bcrypt), Bearer header (localStorage `admin_token`) + httpOnly cookie; brute force lockout 5 fails/15min
- Admin credentials in /app/memory/test_credentials.md (rdipanshu@gmail.com / CyberAdmin@2026)

## Implemented (June 2026 — MVP)
- 8 public pages with video backgrounds, glassmorphism, navbar, framer-motion reveals
- Home hero + CTAs + stat cards; Summary with CV download (/api/uploads/CV_Dipanshu_Rana.pdf); Skills bento grid (9 categories); Experience glowing timeline (3 roles); Certifications tabbed gallery (All + 7 vendors, grid, image/PDF cards); Education (3 entries); Activity & Honors; Contact form + details
- Admin Console /admin: JWT login, sidebar (8 page editors + Manage Certificates + Inbox), per-page structured editors (text, textarea, list editors), video URL edit + video file upload, certification CRUD with image/PDF upload + category assignment, contact message inbox with delete
- Seeded all page content from CV/problem statement; idempotent startup seed
- Tested: iteration_1 — 100% backend (20 pytest) and 100% frontend pass

## Implemented (June 2026 — Iteration 2)
- Resend email notifications on contact form submission (RESEND_API_KEY + SENDER_EMAIL + NOTIFY_EMAIL in backend/.env, async fire-and-forget, notify rdipanshu@gmail.com). Note: Resend test mode delivers only to account owner's email until a domain is verified at resend.com/domains.
- Bulk-imported 35 certifications from Certications.rar (Anthropic 12, Google 7, Simplilearn 7, IBM 4, Cisco 3, UoH 1, Amazon 1; one Google entry "Introduction To Generative AI" was a corrupt 0-byte txt → added as file-less card). Import script: /app/scripts/import_certs.py
- PDF thumbnails via pdftoppm (poppler-utils) — generated for 31 PDFs; new PDF uploads auto-generate thumbs (make_pdf_thumb in server.py); certs store thumb_url
- Inbox read/unread: PATCH /api/contact/messages/{id}/read, New badge + unread count + mark-as-read in admin
- SEO: meta description + OG/Twitter tags in public/index.html, per-route document.title (PAGE_TITLES in App.js)
- Tested: iteration_2 — 100% backend (23 pytest) and 100% frontend

## Implemented (June 2026 — Iteration 3)
- Verify credential buttons on certs (verify_url field): 12 Anthropic per-cert skilljar links mapped from verify.txt; IBM/Cisco/UoH credly/mooc.fi links applied category-wide (editable per cert in admin). Migration: /app/scripts/migrate_verify_order.py
- Cert lightbox: click any cert → full-screen Dialog (image or PDF iframe)
- Custom 404: terminal-style "ACCESS DENIED" page at route *
- Admin drag-and-drop cert ordering (HTML5 dnd) → POST /api/certifications/reorder; GET sorts by order
- Bug fixed: clearing verify_url via PUT (FastAPI drops empty form values → frontend sends "__CLEAR__" sentinel, backend default "__KEEP__"). Verified via curl.
- Tested: iteration_3 — frontend 100%, backend bug found+fixed+verified

## Implemented (June 2026 — Iteration 4)
- CCNA 200-301 verify link removed per user request
- Cert search box on /certifications (live filtering, tab counts update, clear button, no-match state)
- Print-friendly resume at /resume (built from CMS page data, print/save-PDF button, linked from Summary page)
- Visitor analytics: POST /api/analytics/visit (deduped 15s/session via sessionStorage), POST /api/analytics/cert-view (increments cert.views on lightbox open), GET /api/analytics/summary (auth) → admin Analytics section (total/7-day visits, per-page bars, most-viewed certs, unread count)
- Scroll progress bar (thin cyan, top of all public pages via PageShell)
- Tested: iteration_4 — 100% backend (33 pytest) and 100% frontend

## Implemented (June 2026 — Iteration 5)
- 13 verify links applied per user: 12 simpli-web.app.link (Simplilearn/Google/Cisco/Amazon certs incl. re-adding CCNA) + skills.google badge for "Introduction To Generative AI"
- File-less "Introduction To Generative AI" card: blank preview replaced with "Click to Show" hyperlink to badge URL
- Social links: LinkedIn + GitHub icons in navbar + Contact page detail cards; URLs stored in contact page data (admin editable). NOTE: defaults are PLACEHOLDER guesses (linkedin.com/in/dipanshu-rana, github.com/dipanshu-rana) — user must set real URLs in Admin → Contact
- Cert share: Share button per card copies /certifications?cert={id}; visiting that URL auto-opens the lightbox
- Terminal boot splash on first load (once per session, sessionStorage boot_done)
- Tested: iteration_5 — 100% backend (37 tests) and 100% frontend (8/8)

## Backlog / Next
- P1: Verify custom domain in Resend so notifications deliver anywhere (currently test mode → owner email only)
- P1: User to set real LinkedIn/GitHub URLs in Admin → Contact
- P2: TTL/cap on page_visits collection, daily visits chart
