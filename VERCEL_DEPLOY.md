# Deploying to Vercel

This repository is configured for direct deployment on **Vercel** as a fullstack application (React SPA frontend + Python FastAPI backend serverless functions).

```
Vercel Deployment
├── Frontend (React SPA)          -> Static build via `frontend/build`
└── Backend (Python FastAPI)      -> Serverless function via `api/index.py`
```

---

## 1. Push your repository to GitHub

Ensure all files (including `vercel.json`, `package.json`, `api/index.py`, and `requirements.txt`) are committed and pushed to your GitHub repository.

---

## 2. Prepare your Database (MongoDB Atlas)

Since Vercel serverless functions are ephemeral, you need a cloud-hosted MongoDB database (such as MongoDB Atlas):

1. Go to [MongoDB Atlas](https://cloud.mongodb.com) and create a free **M0 Cluster**.
2. Under **Database Access**, create a database user and password.
3. Under **Network Access**, add IP address `0.0.0.0/0` (allows Vercel serverless function IPs to connect).
4. Click **Connect** -> **Drivers** and copy your connection string:
   `mongodb+srv://<username>:<password>@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority`

---

## 3. Import Project into Vercel

### Option A — Via Vercel Dashboard (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) -> **Add New...** -> **Project**.
2. Select your GitHub repository.
3. **Framework Preset**: Vercel will automatically detect the settings from `vercel.json`.
4. Expand **Environment Variables** and add the following variables:

| Variable | Description | Example / Default |
|---|---|---|
| `MONGO_URL` | MongoDB SRV Connection String from Step 2 | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/?retryWrites=true&w=majority` |
| `DB_NAME` | MongoDB database name | `portfolio` |
| `JWT_SECRET` | Secret key for auth tokens | Generate with `openssl rand -hex 32` |
| `ADMIN_EMAIL` | Admin login email | `admin@example.com` |
| `ADMIN_PASSWORD` | Admin login password | `YourSecurePassword123` |
| `CORS_ORIGINS` | Allowed CORS origins (optional) | `*` |
| `RESEND_API_KEY` | (Optional) Resend email API key | `re_123456789` |
| `SENDER_EMAIL` | (Optional) Contact form sender | `onboarding@resend.dev` |
| `NOTIFY_EMAIL` | (Optional) Recipient for contact notifications | `admin@example.com` |

5. Click **Deploy**.

---

### Option B — Via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```
2. Run the deployment command from the project root:
   ```bash
   vercel
   ```
3. Set your environment variables in Vercel project settings or run `vercel env add MONGO_URL`.
4. Deploy to production:
   ```bash
   vercel --prod
   ```

---

## 4. Verification & Testing

Once deployment completes:

1. Open your Vercel URL (e.g., `https://your-project.vercel.app`).
2. Test backend API health check endpoint:
   `https://your-project.vercel.app/api/health` -> should return `{"status":"ok","db":true}`.
3. Test admin panel access at `/admin` using your `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. Browse portfolio pages, video headers, and certificate gallery to ensure static assets load cleanly.

---

## Project Structure for Vercel

- `vercel.json`: Defines Vercel build command (`npm run build`), build output directory (`frontend/build`), function file includes (`backend/**`), and SPA route rewrite `/((?!api/).*)` -> `/index.html`.
- `index.py` & `api/index.py`: Automatic FastAPI serverless entrypoints importing `app` from `backend/server.py`.
- `package.json`: Top-level package manifest to execute frontend build steps.
- `requirements.txt`: Lightweight Python dependencies for Vercel serverless runtime.
