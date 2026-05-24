import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_recorder_or_admin, get_current_user
from app.models.assignment import EventAssignment
from app.models.result import Result
from app.models.event import SwimEvent, EventStatus
from app.models.user import User
from app.schemas.schemas import ResultCreate, ResultOut
from app.services.result_service import compute_event_rankings

router = APIRouter(prefix="/events/{event_id}/results", tags=["Results"])


@router.post("", response_model=ResultOut, status_code=201)
def submit_result(event_id: str, data: ResultCreate,
                  db: Session = Depends(get_db),
                  _: User = Depends(require_recorder_or_admin)):
    """Record the official time for a lane assignment."""
    assignment = db.get(EventAssignment, data.assignment_id)
    if not assignment or assignment.event_id != event_id:
        raise HTTPException(404, "Assignment not found in this event")

    existing = db.query(Result).filter_by(assignment_id=data.assignment_id).first()
    if existing:
        # Update existing result
        existing.official_time = data.official_time
        existing.is_dq = data.is_dq
        existing.dq_reason = data.dq_reason
        db.commit(); db.refresh(existing)
        compute_event_rankings(db, event_id)
        return existing

    result = Result(
        id=str(uuid.uuid4()),
        **data.model_dump(),
    )
    db.add(result); db.commit()
    compute_event_rankings(db, event_id)
    db.refresh(result)
    return result


@router.get("", response_model=List[ResultOut])
def list_results(event_id: str, db: Session = Depends(get_db),
                 _: User = Depends(get_current_user)):
    event = db.get(SwimEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    assignments = (db.query(EventAssignment)
                     .filter(EventAssignment.event_id == event_id)
                     .all())
    results = []
    for a in assignments:
        if a.result:
            results.append(a.result)
    return sorted(results, key=lambda r: (r.place or 9999))


@router.post("/finalize", response_model=List[ResultOut])
def finalize_event(event_id: str, db: Session = Depends(get_db),
                   _: User = Depends(require_recorder_or_admin)):
    """Mark the event as completed and lock results."""
    event = db.get(SwimEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    compute_event_rankings(db, event_id)
    event.status = EventStatus.completed
    db.commit()
    return list_results(event_id, db, _)
