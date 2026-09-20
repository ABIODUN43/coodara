# Deploying Coodara on Render (Free Tier Compatible)

This repository includes a turnkey **Render Blueprint** (`render.yaml`) that configures:
1. **Managed PostgreSQL Database** (`coodara-db`, Free)
2. **FastAPI Web Service + Embedded Celery Worker** (`coodara-backend`, Free)
3. **Vite React Frontend** (`coodara-frontend`, Free Static Site)

> [!NOTE]
> On Render Free, background workers are embedded directly inside the backend Web Service process manager (`start_server.py`), eliminating the need for a paid Render Background Worker plan ($7/mo).

---

## Quick Deploy (Blueprint Method)

1. Push your repository to GitHub (or GitLab).
2. Go to the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** and select **Blueprint**.
4. Connect your Coodara GitHub repository.
5. Render will automatically parse `render.yaml` and display the resources to be created:
   - `coodara-db` (PostgreSQL)
   - `coodara-backend` (Web Service with embedded Celery worker)
   - `coodara-frontend` (Static Site)
6. Provide the required secrets in the Render dashboard:
   - `REDIS_URL`: URL of your Redis instance (e.g. from [Upstash](https://upstash.com) or Render Key-Value).
   - `OPENAI_API_KEY` (or `GEMINI_API_KEY`): Your LLM API key.
   - `GITHUB_CLIENT_ID` & `GITHUB_CLIENT_SECRET`: GitHub OAuth App credentials.
7. Click **Apply**.
8. Render will automatically provision the database, run Alembic database migrations (`alembic upgrade head`), launch the background Celery worker, start Uvicorn, build the frontend, and start all services!

---

## Manual Service Setup (Alternative)

If you prefer to configure services manually on Render:

### 1. PostgreSQL Database
- **Type**: PostgreSQL
- **Name**: `coodara-db`
- **Database**: `coodara`
- **User**: `coodara`
- **Plan**: Free

### 2. Backend Web Service (with Embedded Celery Worker)
- **Environment**: Python 3
- **Root Directory**: `.` (leave blank or set to repo root)
- **Build Command**: `pip install -r apps/backend/requirements.txt`
- **Start Command**: `cd apps/backend && python start_server.py`
  *(This automatically applies migrations, starts Celery worker with concurrency=1, and launches Uvicorn on `$PORT`)*
- **Health Check Path**: `/healthz`

### 3. Frontend (Static Site)
- **Type**: Static Site
- **Root Directory**: `apps/frontend`
- **Build Command**: `pnpm install && pnpm build`
- **Publish Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_URL`: `https://coodara-backend.onrender.com/api/v1`
- **Crucial Step for React Router (Fixes 404 Not Found on /auth/callback):**
  In the Render Dashboard for your **coodara-frontend** Static Site:
  1. Go to **Redirects/Rewrites** in the left menu.
  2. Click **Add Rule**.
  3. Set **Type**: `Rewrite` *(do NOT use Redirect)*.
  4. Set **Source**: `/*`
  5. Set **Destination**: `/index.html`
  6. Click **Save Changes**.
