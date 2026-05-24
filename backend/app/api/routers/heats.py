from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.event import SwimEvent, EventStatus
from app.models.user import User
from app.schemas.schemas import HeatOut, HeatDetailOut
from app.services.seeding import seed_event

router = APIRouter(prefix="/events/{event_id}/heats", tags=["Heats"])


@router.post("/seed", response_model=List[HeatOut])
def seed_heats(event_id: str, db: Session = Depends(get_db),
               _: User = Depends(require_admin)):
    """
    Run the NCAA circle-seeding algorithm for the event.
    Deletes any previous assignments and regenerates.
    """
    event = db.get(SwimEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    if event.status == EventStatus.completed:
        raise HTTPException(400, "Cannot re-seed a completed event")

    heats = seed_event(db, event)
    return heats


@router.get("", response_model=List[HeatDetailOut])
def list_heats(event_id: str, db: Session = Depends(get_db),
               _: User = Depends(get_current_user)):
    event = db.get(SwimEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return event.heats


@router.get("/{heat_id}", response_model=HeatDetailOut)
def get_heat(event_id: str, heat_id: str, db: Session = Depends(get_db),
             _: User = Depends(get_current_user)):
    from app.models.heat import Heat
    heat = db.get(Heat, heat_id)
    if not heat or heat.event_id != event_id:
        raise HTTPException(404, "Heat not found")
    return heat
