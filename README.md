# Sports Event Manager — College Multi-Sport Competition System

A full-stack, production-ready web application designed for running and managing college sports competitions. It currently supports **Swimming** and **Track & Field** meets out of the box and can be extended to new sports with minimal configuration. It handles everything from registering participants and generating heat sheets to timing entries, ranking athletes, generating official result PDFs, and printing **participation certificates**.

---

## 🏗 Architecture & Tech Stack

This project uses a modern decoupled architecture: a React SPA frontend that communicates with a RESTful FastAPI backend.

### Backend (Python / FastAPI)

| Layer | Technology |
|---|---|
| **Framework** | FastAPI 0.111 (Python 3.12) — async routing + auto OpenAPI/Swagger docs |
| **Database** | **SQLite** (default, zero-setup) *or* **PostgreSQL 16** via Docker |
| **ORM** | SQLAlchemy 2.0 with Alembic migrations |
| **Authentication** | JWT (python-jose + bcrypt) — stateless, role-based (Admin / Recorder) |
| **PDF Generation** | **xhtml2pdf** + Jinja2 HTML templates |
| **Excel Export** | openpyxl — exports heat sheets and results to `.xlsx` |

> **PDF Note:** The project switched from WeasyPrint to **xhtml2pdf** (v0.2.16). xhtml2pdf works on all platforms without needing GTK/Pango system libraries, making local development on Windows/macOS much easier.

### Frontend (React / TypeScript)

| Layer | Technology |
|---|---|
| **Framework** | React 18 + TypeScript, bundled by Vite 5 |
| **Styling** | Tailwind CSS 3 + custom `index.css` (glassmorphism, gradients, dark tones) |
| **Icons** | Lucide React |
| **State** | Zustand (auth store) + React Hooks |
| **HTTP** | Axios with automatic JWT header injection |
| **Routing** | React Router v6 |

---

## 🌐 Multi-Sport Support

The application is **sport-agnostic at runtime**. Each Meet is created with a `sport_type` (either `swimming` or `track_field`). The UI and API adapt automatically: labels, disciplines, DQ codes, performance units, and PDF colours all change per sport.

| Feature | Swimming | Track & Field |
|---|---|---|
| Performance unit | Time (mm:ss.hh) | Time *or* Distance (m) for field events |
| Disciplines | Freestyle, Backstroke, Butterfly, IM, Relays, … | 60m–10 000m sprints/middle/long, Hurdles, Jumps, Throws, Relays |
| Venue config | Course (SCY / SCM / LCM) | Surface (Synthetic / Grass / Indoor) |
| Field events | ❌ | ✅ up to 6 attempt marks per athlete |
| Relay types | Freestyle relay, Medley relay | 4×100 m, 4×400 m |

To switch sport, just select the sport type when creating a new Meet — no code changes needed.

---

## ⚙️ Core Application Workflow

1. **Meet Creation (Admin):** Create a new Meet, choose sport type, venue, dates, and lane count.
2. **Participant / Team Registration:** Add Athletes/Swimmers to the system and register them as Entries to specific events with a Seed Time or Seed Mark.
3. **Seeding Heats:** The system runs a **Center-Out Seeding Algorithm** to group participants into heats and assign lanes (fastest to center lanes of the final heat). Draft `TimeResult` placeholders are auto-created for every entry.
4. **Recording Results (Recorder/Admin):** Recorders enter final times (or distance marks for field events). Results start in `DRAFT` status.
5. **Admin Review → Save:** The Admin reviews times, clicks **Save** → status becomes `SAVED`, ranks are computed.
6. **Finalize:** Admin finalizes the event → status becomes `FINALIZED` (locked). Rankings are permanent.
7. **PDF & Certificates:** Generate an official **Heat Sheet PDF** or **Results PDF** for the meet. For each finalized result a printable **Certificate of Merit** is available at `/certificate?resultId=<id>`.

---

## 🚀 Quick Start

There are **two ways** to run this project: using **Docker** (recommended, production-like) or running the frontend and backend **locally** with SQLite (quickest for development).

---

### Option A — Docker (Recommended)

Docker handles all dependencies, including PostgreSQL and system libraries. No manual installation required beyond Docker itself.

#### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running
- Git

> [!IMPORTANT]
> Always use `docker-compose up --build` the **first time** you clone this repo, or after any `git pull` that changed `requirements.txt` or `Dockerfile`. Skipping `--build` reuses the old cached image and the backend will be missing new dependencies.

#### Steps

```bash
# 1. Clone the repository
git clone <repository-url>
cd Sports-Event-Manager

# 2. Stop any old containers and force a clean rebuild
docker-compose down
docker-compose up --build
```

Wait until you see a line like `Application startup complete` in the terminal before opening the browser. The first build takes 2–5 minutes because it downloads and installs all Python packages inside the container.

#### Services started by Docker

| Service | URL | Description |
|---|---|---|
| **Frontend UI** | http://localhost:5173 | React application |
| **Backend API** | http://localhost:8000 | FastAPI server |
| **Swagger Docs** | http://localhost:8000/docs | Interactive API explorer |
| **pgAdmin** | http://localhost:5050 | Database GUI (email: `admin@swim.com`, password: `admin`) |

#### Create your first Admin account

Open a **new terminal** (keep Docker running) and run:

**Windows (PowerShell):**
```powershell
curl -Method POST http://localhost:8000/api/v1/auth/register-admin `
  -ContentType "application/json" `
  -Body '{"username":"admin","email":"admin@sport.edu","password":"admin123","name":"Meet Director"}'
```

**macOS / Linux / Git Bash:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@sport.edu","password":"admin123","name":"Meet Director"}'
```

Then log in at http://localhost:5173 with:
- **Username:** `admin`
- **Password:** `admin123`

---

### Option B — Local Development (SQLite, No Docker)

This is the fastest way to get started if you just want to run and explore the app. It uses **SQLite** as the database — no Postgres needed.

#### Prerequisites
- **Python 3.12** (https://www.python.org/downloads/)
- **Node.js 18+** (https://nodejs.org/)
- Git

#### Step 1 — Backend

```bash
cd Sports-Event-Manager/backend

# Copy the example env file
copy .env.example .env
# (macOS/Linux: cp .env.example .env)
```

Open the newly created `.env` file and confirm it reads:
```
DATABASE_URL=sqlite:///./track_meet.db
```

Now install Python dependencies. Since you are using SQLite (not PostgreSQL), comment out the `psycopg2-binary` line in `requirements.txt` first to avoid a compilation error:

```text
# In requirements.txt — add a # at the start of this line:
# psycopg2-binary==2.9.10
```

Then install:
```bash
pip install -r requirements.txt

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The backend auto-creates the SQLite database file (`track_meet.db` by default) on first run. No migrations needed for SQLite — tables are created automatically.

> **Switching sport databases:**
> - The `.env` file controls which database file is used.
> - `DATABASE_URL=sqlite:///./track_meet.db` → Track & Field database
> - `DATABASE_URL=sqlite:///./swim_meet.db` → Swimming database
> - Change `DATABASE_URL` in `.env` to switch between them.

#### Step 2 — Frontend

Open a **second terminal**:

```bash
cd Sports-Event-Manager/frontend

# Install Node dependencies (first time only)
npm install

# Start the dev server
npm run dev
```

The frontend will be available at **http://localhost:5173**.

#### Step 3 — Create your first Admin

With the backend running, open a browser or terminal and call:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@sport.edu","password":"admin123","name":"Meet Director"}'
```

Log in at http://localhost:5173 with the credentials above.

---

## 🗂 Directory Structure

```text
Sports-Event-Manager/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── auth.py          # Login, register-admin, register-recorder
│   │   │   ├── meets.py         # Meet CRUD + PDF/Excel generation endpoints
│   │   │   ├── operations.py    # Entries, heats, seeding, results, finalization
│   │   │   ├── swimmers.py      # Participant (Athlete/Swimmer) CRUD
│   │   │   └── excel.py         # Excel export logic
│   │   ├── core/
│   │   │   ├── sport_config.py  # ★ Sport configuration (disciplines, DQ codes, labels)
│   │   │   ├── database.py      # SQLAlchemy engine setup (SQLite or PostgreSQL)
│   │   │   └── security.py      # JWT creation & verification
│   │   ├── models/              # SQLAlchemy ORM models (Meet, Event, Heat, Entry, Result, …)
│   │   ├── schemas/
│   │   │   └── schemas.py       # Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   ├── seeding.py       # Center-out seeding algorithm
│   │   │   └── pdf_service.py   # Heat sheet & results PDF generation (xhtml2pdf)
│   │   └── templates/           # Jinja2 HTML templates rendered to PDF
│   ├── .env                     # Local environment variables (not committed)
│   ├── .env.example             # Template — copy to .env before first run
│   ├── requirements.txt         # Pinned Python dependencies
│   ├── Dockerfile               # Backend container image
│   └── alembic/                 # Database migration scripts (used with PostgreSQL)
├── frontend/
│   └── src/
│       ├── App.tsx              # Route definitions
│       ├── sportConfig.ts       # ★ Frontend sport config (mirrors backend sport_config.py)
│       ├── api.ts               # Axios API client
│       ├── authStore.ts         # Zustand auth state
│       ├── types.ts             # TypeScript type definitions
│       ├── DashboardPage.tsx    # Home stats overview
│       ├── MeetsPage.tsx        # List / create meets
│       ├── MeetDetailPage.tsx   # Meet overview, events list, PDF buttons
│       ├── EventDetailPage.tsx  # Heat sheet, entries, seeding, results
│       ├── SwimmersPage.tsx     # Participant (Swimmer/Athlete) management
│       ├── TeamsPage.tsx        # Relay team management
│       ├── RecorderPage.tsx     # Recorder-specific result entry view
│       ├── CertificatePage.tsx  # ★ Printable certificate (opens in new tab)
│       └── LoginPage.tsx        # Login form
├── docker-compose.yml           # Orchestrates frontend, backend, PostgreSQL, pgAdmin
└── swim_meet.db / track_meet.db # SQLite databases (local dev only, not committed)
```

---

## 🔑 User Roles

| Role | Can Do |
|---|---|
| **Admin** | Create meets/events, seed heats, review results, save, finalize, generate PDFs |
| **Recorder** | Enter result times for events assigned to them |

---

## 📄 PDF & Certificate Generation

- **Heat Sheet PDF** — lists all heats and lane assignments for a meet. Generated via the Meet Detail page → *"Generate Heat Sheet"* button.
- **Results PDF** — lists final ranked results per event. Generated via the Meet Detail page → *"Generate Results PDF"* button after events are finalized.
- **Certificate of Merit** — a printable A5 certificate for individual results. Accessed by clicking the certificate icon next to a finalized result. Opens at `/certificate?resultId=<id>` in a new tab. Use the browser's **Print → Save as PDF** function.

PDF files are saved server-side in `backend/pdfs/`.

---

## 🛠 Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./track_meet.db` | Database connection string |
| `SECRET_KEY` | *(change this!)* | Secret used to sign JWT tokens |
| `ALGORITHM` | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Token lifetime (8 hours) |
| `DEBUG` | `true` | Enables verbose FastAPI debug output |

For Docker, these are set directly in `docker-compose.yml` and point to the PostgreSQL container.

---

## 🐛 Troubleshooting

### ❌ `docker-compose up --build` fails — `pg_config executable not found`

**Full error:** `failed to solve: process "/bin/sh -c pip install --no-cache-dir -r requirements.txt" did not complete successfully: exit code: 1`  
Followed by: `Error: pg_config executable not found` or `psycopg2 build failed`

**Cause:** On some platforms (ARM Linux, certain CI environments), `psycopg2-binary` does not have a pre-built wheel and tries to compile from source. The compilation requires `libpq-dev` and `gcc` which were missing from the old Dockerfile.

**Fix (already applied in this repo):** The `backend/Dockerfile` now installs `libpq-dev` and `gcc` before running `pip install`. If you pulled the latest code, simply run:

```bash
docker-compose down
docker-compose up --build
```

The `--build` is critical here — it forces Docker to rebuild the image with the updated Dockerfile. If you previously ran `docker-compose up` without `--build`, Docker was using the old broken cached image.

---

### ❌ Frontend loads but backend is not reachable / creating a Meet hangs

**Cause:** The API container failed to start (usually due to the pip install error above, or the database migration failing).

**Steps to diagnose:**
```bash
# Check which containers are running
docker-compose ps

# Check the API container logs
docker-compose logs api
```

If you see `Application startup complete` in the `api` logs, the backend is healthy. If not, look for the error above it.

---

### ❌ `pip install -r requirements.txt` fails locally with `pg_config not found`

**Cause:** You are running the backend locally (outside Docker) and `psycopg2-binary` is trying to compile from source without PostgreSQL development headers installed.

**Fix:** Since local development uses SQLite (not PostgreSQL), simply comment out the psycopg2-binary line in `requirements.txt`:

```text
# psycopg2-binary==2.9.10    ← add # to skip this line
```

Then re-run `pip install -r requirements.txt`.

---

### ❌ Login works but admin cannot create a Meet after `git pull`

**Cause:** The frontend container is using an old cached image. The backend might also have changed schema.

**Fix:**
```bash
docker-compose down          # stop all containers
docker-compose up --build    # rebuild everything fresh
```

If you have existing data you want to keep (in the PostgreSQL volume), use:
```bash
docker-compose up --build    # rebuilds images but keeps the postgres_data volume
```

To completely wipe and start fresh (loses all data):
```bash
docker-compose down -v       # -v removes volumes too
docker-compose up --build
```

---

## 📝 Developer Notes

- **SQLite vs PostgreSQL:** SQLite requires no migration step — `Base.metadata.create_all()` runs on startup. PostgreSQL requires running `alembic upgrade head` (done automatically by Docker Compose).
- **PDF on Windows (local):** xhtml2pdf works natively on Windows with no extra system libraries. If you see import errors, ensure `xhtml2pdf==0.2.16` is installed.
- **Seeding Algorithm:** `seeding.py` clears existing Heat associations before re-seeding to avoid foreign key violations. Always call `db.flush()` after clearing dependencies if modifying this service.
- **Draft Results:** `TimeResult` rows are auto-created in `draft` status when heats are seeded. The Results tab requires these rows to exist in order to render.
- **Sport Config:** Both the backend (`app/core/sport_config.py`) and frontend (`src/sportConfig.ts`) maintain parallel sport configuration dictionaries. If you add a new sport, update both files.
- **Dependency Pinning:** Python dependencies in `requirements.txt` are version-pinned. Be cautious when upgrading PDF-related packages as version mismatches can cause runtime errors.
