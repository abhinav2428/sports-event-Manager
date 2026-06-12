import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.meet import Meet, MeetStatus
from app.models.event import SportEvent
from app.models.user import User
from app.schemas.schemas import (
    MeetCreate, MeetOut, EventCreate, EventOut,
)
from app.core.sport_config import get_sport_config

meets_router  = APIRouter(prefix="/meets", tags=["Meets"])
events_router = APIRouter(prefix="/meets", tags=["Events"])


# ── Meets ──────────────────────────────────────────────────────

@meets_router.post("", response_model=MeetOut)
def create_meet(data: MeetCreate, db: Session = Depends(get_db),
                current_admin: User = Depends(require_admin)):
    dump = data.model_dump()
    sport_config = get_sport_config(dump["sport_type"])
    
    # Apply sport-config default for venue_config if not supplied
    if not dump.get("venue_config"):
        dump["venue_config"] = sport_config["default_venue_config"]
    if not dump.get("lanes"):
        dump["lanes"] = sport_config.get("lanes_default", 8)
        
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
    meet = db.get(Meet, meet_id)
    if not meet:
        raise HTTPException(404, "Meet not found")

    sport_config = get_sport_config(meet.sport_type)
    
    # Determine if this is a field event
    is_field = data.discipline in sport_config.get("field_disciplines", [])

    # Validate distance/mark against sport config
    allowed = sport_config.get("valid_distances", {}).get(data.discipline, [])
    if data.distance not in allowed:
        raise HTTPException(400,
            f"Distance/mark {data.distance} is not valid for discipline '{data.discipline}'. "
            f"Allowed: {allowed}")

    dump = data.model_dump()
    dump["is_field"] = is_field  # auto-set from config
    event = SportEvent(id=str(uuid.uuid4()), meet_id=meet_id, **dump)
    db.add(event); db.commit(); db.refresh(event)
    return _event_out(event)


@events_router.get("/{meet_id}/events", response_model=List[EventOut])
def list_events(meet_id: str, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    events = (db.query(SportEvent)
               .filter(SportEvent.meet_id == meet_id)
               .order_by(SportEvent.event_number)
               .all())
    return [_event_out(e) for e in events]


@events_router.get("/{meet_id}/events/{event_id}", response_model=EventOut)
def get_event(meet_id: str, event_id: str,
              db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    ev = db.query(SportEvent).filter(
        SportEvent.id == event_id, SportEvent.meet_id == meet_id).first()
    if not ev: raise HTTPException(404, "Event not found")
    return _event_out(ev)


# Direct lookup by event_id alone (used by RecorderPage)
direct_events_router = APIRouter(prefix="/events", tags=["Events"])

@direct_events_router.get("/{event_id}/detail", response_model=EventOut)
def get_event_direct(event_id: str, db: Session = Depends(get_db),
                     _: User = Depends(get_current_user)):
    ev = db.get(SportEvent, event_id)
    if not ev: raise HTTPException(404, "Event not found")
    return _event_out(ev)


def _event_out(ev: SportEvent) -> EventOut:
    return EventOut(
        id=ev.id, meet_id=ev.meet_id, event_number=ev.event_number,
        name=ev.name, discipline=ev.discipline, distance=ev.distance,
        gender=ev.gender, is_relay=ev.is_relay, is_field=ev.is_field,
        relay_legs=ev.relay_legs, status=ev.status,
        total_distance=ev.total_distance,
    )
