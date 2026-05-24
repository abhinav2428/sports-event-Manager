import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.meet import Meet
from app.models.event import SwimEvent, VALID_DISTANCES, EventStatus
from app.models.user import User
from app.schemas.schemas import EventCreate, EventOut

router = APIRouter(prefix="/meets/{meet_id}/events", tags=["Events"])


def _get_meet_or_404(meet_id: str, db: Session) -> Meet:
    meet = db.get(Meet, meet_id)
    if not meet:
        raise HTTPException(404, "Meet not found")
    return meet


@router.post("", response_model=EventOut)
def create_event(meet_id: str, data: EventCreate,
                 db: Session = Depends(get_db), _: User = Depends(require_admin)):
    _get_meet_or_404(meet_id, db)

    # Validate distance vs stroke
    from app.models.event import Stroke
    try:
        stroke = Stroke(data.stroke)
    except ValueError:
        raise HTTPException(400, f"Unknown stroke: {data.stroke}")
    if data.distance not in VALID_DISTANCES.get(stroke, []):
        raise HTTPException(400,
            f"Distance {data.distance}m is not valid for stroke '{data.stroke}'. "
            f"Valid: {VALID_DISTANCES[stroke]}")

    event = SwimEvent(
        id=str(uuid.uuid4()),
        meet_id=meet_id,
        **data.model_dump(),
    )
    db.add(event); db.commit(); db.refresh(event)
    return event


@router.get("", response_model=List[EventOut])
def list_events(meet_id: str, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    _get_meet_or_404(meet_id, db)
    return (db.query(SwimEvent)
              .filter(SwimEvent.meet_id == meet_id)
              .order_by(SwimEvent.event_number)
              .all())


@router.get("/{event_id}", response_model=EventOut)
def get_event(meet_id: str, event_id: str, db: Session = Depends(get_db),
              _: User = Depends(get_current_user)):
    event = db.get(SwimEvent, event_id)
    if not event or event.meet_id != meet_id:
        raise HTTPException(404, "Event not found")
    return event


@router.delete("/{event_id}", status_code=204)
def delete_event(meet_id: str, event_id: str, db: Session = Depends(get_db),
                 _: User = Depends(require_admin)):
    event = db.get(SwimEvent, event_id)
    if not event or event.meet_id != meet_id:
        raise HTTPException(404, "Event not found")
    db.delete(event); db.commit()
