# Sports Event Manager — College Swimming Competition System

A full-stack, production-ready web application designed for running and managing college swimming competitions. It handles everything from adding swimmers and generating heat sheets to timing entries, ranking athletes, and generating official result PDFs.

---

## 🏗 Architecture & Tech Stack

This project is built using a modern decoupled architecture. The frontend is a Single Page Application (SPA) that communicates with a RESTful backend API. 

### Backend (Python / FastAPI)
- **Framework:** **FastAPI** (Python 3.12) for high-performance async routing and auto-generated OpenAPI/Swagger documentation.
- **Database:** **PostgreSQL 16** (configured via SQLAlchemy 2.0). Data persistence and safety are guaranteed via Docker Volumes (`postgres_data`), ensuring records survive container restarts. Alembic handles automated schema migrations.
- **ORM & Models:** **SQLAlchemy 2.0** uses a class hierarchy mapping (`Person` → `Swimmer` / `User` → `Admin` / `Recorder`) and relational mappings for Meets, Events, Heats, and Results.
- **Authentication:** **JWT (JSON Web Tokens)** via `python-jose` and `bcrypt` for stateless authentication and role-based access control (Admin vs Recorder).
- **PDF Generation:** **WeasyPrint** (v61.2) + **pydyf** (v0.9.0) + **Jinja2** templates used to dynamically generate well-formatted Heat Sheets and Official Result PDFs on the fly.

### Frontend (React / TypeScript)
- **Framework:** **React 18** with **TypeScript**, bundled by **Vite** for incredibly fast Hot Module Replacement (HMR).
- **Styling:** **Tailwind CSS** combined with custom rich CSS (`index.css`) for modern, responsive, and highly aesthetic UI elements (glassmorphism, gradients, hover states).
- **Icons:** **Lucide React** for crisp, customizable vector icons.
- **State Management:** React Hooks and local component state, designed for quick interactions when recording time drafts.
- **HTTP Client:** **Axios** configured with interceptors to automatically attach JWT authorization headers to every request.

---

## ⚙️ Core Application Workflow

The platform's primary workflow revolves around the lifecycle of a swimming meet:

1. **Meet Creation (Admin):** An Administrator creates a new Meet (e.g., "Spring Invitational"), sets the dates, venue, and creates specific swimming events (e.g., "Men's 100m Freestyle").
2. **Participant Registration:** Swimmers are added to the system and subsequently added as "Entries" to specific events along with their historically recorded "Seed Time".
3. **Seeding Heats:** The system runs a **Center-Out Seeding Algorithm** to group swimmers into heats and assign lanes based on their Seed Time (fastest swimmers get center lanes in the final heat). 
   - *Note:* During this phase, "Draft" placeholder scorecards are automatically generated for every swimmer.
4. **Recording Results (Recorder/Admin):** As the physical races conclude, Recorders navigate to the "Results" tab to input the final times for each swimmer.
5. **Finalization & PDF:** The Administrator reviews the recorded times, clicks "Save", and then generates an Official PDF containing the final times, ranks, and DQs.

---

## 🚀 Quick Start / Setup Guide

The easiest way to run the application is using Docker. This ensures you have the exact same environment as production, including the required system-level dependencies for WeasyPrint (GTK/Pango).

### Prerequisites
- Docker & Docker Compose
- Node.js (if you want to run the frontend locally outside of Docker for development)
- Git

### 1. Clone & Start Services

```bash
git clone <repository-url>
cd Sports-Event-Manager
docker-compose up --build
```
*The `--build` flag ensures that any dependency updates in `requirements.txt` or `package.json` are installed.*

### 2. Access the Application

| Service | Local URL |
|---------|-----------|
| **Frontend UI** | [http://localhost:5173](http://localhost:5173) |
| **Backend API** | [http://localhost:8000](http://localhost:8000) |
| **Swagger API Docs** | [http://localhost:8000/docs](http://localhost:8000/docs) |

### 3. Create your First Admin User

To log into the frontend, you need an Admin account. Run this command in a new terminal window to seed your first user:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register-admin \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","email":"admin@swim.edu","password":"admin123","name":"Meet Director"}'
```

You can now log into the frontend UI at `http://localhost:5173` using:
- **Username:** `admin`
- **Password:** `admin123`

---

## 🛠 Directory Structure & Navigation

```text
Sports-Event-Manager/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI route controllers (endpoints)
│   │   ├── models/       # SQLAlchemy database models
│   │   ├── schemas/      # Pydantic models for request/response validation
│   │   ├── services/     # Core business logic (Seeding algorithms, PDF engine)
│   │   └── templates/    # Jinja2 HTML templates for WeasyPrint PDFs
│   ├── requirements.txt  # Python dependencies (Pinned specifically for WeasyPrint compatibility)
│   └── main.py           # FastAPI application entrypoint
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components (Sidebar, Layouts)
│   │   ├── pages/        # Main route views (Dashboard, EventDetail, Login)
│   │   └── index.css     # Global CSS and Tailwind directives
│   ├── package.json      # Node dependencies
│   └── vite.config.ts    # Vite bundler configuration
└── docker-compose.yml    # Orchestrates the backend API and database volumes
```

---

## 📝 Important Developer Notes

- **PDF Generation Bug:** If you upgrade Python libraries, be highly cautious with `WeasyPrint` and `pydyf`. Version mismatches between these two libraries cause `AttributeError` crashes on PDF generation. This project explicitly pins `weasyprint==61.2` and `pydyf==0.9.0` to guarantee stability.
- **Seeding Foreign Keys:** The `seeding.py` service clears existing Heat associations before attempting to re-seed an event to prevent SQLAlchemy `ForeignKeyViolation` errors. If modifying this algorithm, remember to call `db.flush()` after clearing dependencies.
- **Draft Results:** The system relies on `TimeResult` rows existing in the DB to render the UI on the Results tab. These are automatically generated with a status of `draft` when heats are seeded.
