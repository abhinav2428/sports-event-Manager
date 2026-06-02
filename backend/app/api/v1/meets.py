import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.meet import Meet, MeetStatus
from app.models.event import SwimEvent, VALID_DISTANCES
from app.models.user import User
from app.schemas.schemas import (
    MeetCreate, MeetOut, EventCreate, EventOut,
)

meets_router  = APIRouter(prefix="/meets", tags=["Meets"])
events_router = APIRouter(prefix="/meets", tags=["Events"])


# ── Meets ──────────────────────────────────────────────────────

@meets_router.post("", response_model=MeetOut)
def create_meet(data: MeetCreate, db: Session = Depends(get_db),
                current_admin: User = Depends(require_admin)):
    dump = data.model_dump()
    # The frontend might send extra fields like course and pool_lanes, but Pydantic handles them if we just use the validated model_dump.
    meet = Meet(id=str(uuid.uuid4()), administrator_id=current_admin.id, **dump)
    db.add(meet); db.commit(); db.refresh(meet)
    return meet


@meets_router.get("", response_model=List[MeetOut])
def list_meets(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Meet).order_by(Meet.start_date.desc()).all()


@meets_router.get("/{meet_id}", response_model=MeetOut)
def get_meet(meet_id: str, db: Session = Depends(get_db),
             _: User = Depends(get_current_user)):
    meet = db.get(Meet, meet_id)
    if not meet: raise HTTPException(404, "Meet not found")
    return meet


@meets_router.patch("/{meet_id}/status", response_model=MeetOut)
def update_status(meet_id: str, new_status: MeetStatus,
                  db: Session = Depends(get_db), _: User = Depends(require_admin)):
    meet = db.get(Meet, meet_id)
    if not meet: raise HTTPException(404, "Meet not found")
    meet.status = new_status
    db.commit(); db.refresh(meet)
    return meet


# ── Events ─────────────────────────────────────────────────────

@events_router.post("/{meet_id}/events", response_model=EventOut)
def create_event(meet_id: str, data: EventCreate,
                 db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if not db.get(Meet, meet_id):
        raise HTTPException(404, "Meet not found")

    # Validate distance is legal for the stroke
    allowed = VALID_DISTANCES.get(data.stroke, [])
    if data.distance not in allowed:
        raise HTTPException(400,
            f"Distance {data.distance}m is not valid for {data.stroke.value}. "
            f"Allowed: {allowed}")

    event = SwimEvent(id=str(uuid.uuid4()), meet_id=meet_id, **data.model_dump())
    db.add(event); db.commit(); db.refresh(event)
    return _event_out(event)


@events_router.get("/{meet_id}/events", response_model=List[EventOut])
def list_events(meet_id: str, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    events = (db.query(SwimEvent)
               .filter(SwimEvent.meet_id == meet_id)
               .order_by(SwimEvent.event_number)
               .all())
    return [_event_out(e) for e in events]


@events_router.get("/{meet_id}/events/{event_id}", response_model=EventOut)
def get_event(meet_id: str, event_id: str,
              db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ev = db.query(SwimEvent).filter(
        SwimEvent.id == event_id, SwimEvent.meet_id == meet_id).first()
    if not ev: raise HTTPException(404, "Event not found")
    return _event_out(ev)


# Direct lookup by event_id alone (used by RecorderPage)
direct_events_router = APIRouter(prefix="/events", tags=["Events"])

@direct_events_router.get("/{event_id}/detail", response_model=EventOut)
def get_event_direct(event_id: str, db: Session = Depends(get_db),
                     _: User = Depends(get_current_user)):
    ev = db.get(SwimEvent, event_id)
    if not ev: raise HTTPException(404, "Event not found")
    return _event_out(ev)


def _event_out(ev: SwimEvent) -> EventOut:
    return EventOut(
        id=ev.id, meet_id=ev.meet_id, event_number=ev.event_number,
        name=ev.name, stroke=ev.stroke, distance=ev.distance,
        gender=ev.gender, is_relay=ev.is_relay, relay_legs=ev.relay_legs,
        status=ev.status, total_distance=ev.total_distance,
    )
