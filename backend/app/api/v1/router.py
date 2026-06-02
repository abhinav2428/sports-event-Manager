from fastapi import APIRouter
from app.api.v1.auth      import router as auth_router
from app.api.v1.swimmers  import swimmers_router, teams_router
from app.api.v1.meets     import meets_router, events_router, direct_events_router
from app.api.v1.operations import (
    entries_router, heats_router, results_router,
    assignments_router, awards_router, reports_router,
)
from app.api.v1.excel import excel_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(swimmers_router)
api_router.include_router(teams_router)
api_router.include_router(meets_router)
api_router.include_router(events_router)
api_router.include_router(direct_events_router)
api_router.include_router(entries_router)
api_router.include_router(heats_router)
api_router.include_router(results_router)
api_router.include_router(assignments_router)
api_router.include_router(awards_router)
api_router.include_router(reports_router)
api_router.include_router(excel_router)
