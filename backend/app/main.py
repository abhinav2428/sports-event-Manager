from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.database import engine, Base
import app.models  # noqa — registers all tables with Base.metadata


def create_tables():
    Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="Sports Event Management System",
    description="""
Manages the full lifecycle of college sports competitions including Swimming and Track & Field.

### Result Workflow
`DRAFT` (recorder enters) → `SAVED` (admin reviews) → `FINALIZED` (locked + ranked)
    """,
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    create_tables()


app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok"}
