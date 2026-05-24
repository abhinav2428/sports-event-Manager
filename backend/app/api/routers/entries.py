import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.event import SwimEvent
from app.models.entry import IndividualEntry, RelayEntry, RelayLeg, EntryStatus
from app.models.user import User
from app.schemas.schemas import (
    IndividualEntryCreate, IndividualEntryOut,
    RelayEntryCreate, RelayEntryOut,
)

router = APIRouter(prefix="/events/{event_id}/entries", tags=["Entries"])


def _get_event_or_404(event_id: str, db: Session) -> SwimEvent:
    event = db.get(SwimEvent, event_id)
    if not event:
        raise HTTPException(404, "Event not found")
    return event


# ── Individual entries ─────────────────────────────────────────

@router.post("/individual", response_model=IndividualEntryOut, status_code=201)
def add_individual_entry(event_id: str, data: IndividualEntryCreate,
                         db: Session = Depends(get_db),
                         _: User = Depends(require_admin)):
    event = _get_event_or_404(event_id, db)
    if event.is_relay:
        raise HTTPException(400, "Use relay entry endpoint for relay events")
    existing = (db.query(IndividualEntry)
                  .filter_by(event_id=event_id, swimmer_id=data.swimmer_id)
                  .first())
    if existing:
        raise HTTPException(400, "Swimmer already entered in this event")
    entry = IndividualEntry(
        id=str(uuid.uuid4()), event_id=event_id, **data.model_dump()
    )
    db.add(entry); db.commit(); db.refresh(entry)
    return entry


@router.get("/individual", response_model=List[IndividualEntryOut])
def list_individual_entries(event_id: str, db: Session = Depends(get_db),
                             _: User = Depends(get_current_user)):
    _get_event_or_404(event_id, db)
    return (db.query(IndividualEntry)
              .filter(IndividualEntry.event_id == event_id)
              .all())


@router.delete("/individual/{entry_id}", status_code=204)
def scratch_individual(event_id: str, entry_id: str,
                       db: Session = Depends(get_db),
                       _: User = Depends(require_admin)):
    entry = db.get(IndividualEntry, entry_id)
    if not entry or entry.event_id != event_id:
        raise HTTPException(404, "Entry not found")
    entry.status = EntryStatus.scratched
    db.commit()


# ── Relay entries ──────────────────────────────────────────────

@router.post("/relay", response_model=RelayEntryOut, status_code=201)
def add_relay_entry(event_id: str, data: RelayEntryCreate,
                    db: Session = Depends(get_db),
                    _: User = Depends(require_admin)):
    event = _get_event_or_404(event_id, db)
    if not event.is_relay:
        raise HTTPException(400, "Use individual entry endpoint for individual events")
    if len(data.swimmer_ids) != 4:
        raise HTTPException(400, "Relay entry must have exactly 4 swimmers")
    existing = (db.query(RelayEntry)
                  .filter_by(event_id=event_id, team_id=data.team_id)
                  .first())
    if existing:
        raise HTTPException(400, "Team already entered in this event")

    entry = RelayEntry(
        id=str(uuid.uuid4()),
        event_id=event_id,
        team_id=data.team_id,
        seed_time=data.seed_time,
    )
    db.add(entry); db.flush()

    for i, swimmer_id in enumerate(data.swimmer_ids, start=1):
        leg = RelayLeg(id=str(uuid.uuid4()), relay_entry_id=entry.id,
                       swimmer_id=swimmer_id, leg_order=i)
        db.add(leg)

    db.commit(); db.refresh(entry)
    return entry


@router.get("/relay", response_model=List[RelayEntryOut])
def list_relay_entries(event_id: str, db: Session = Depends(get_db),
                       _: User = Depends(get_current_user)):
    _get_event_or_404(event_id, db)
    return db.query(RelayEntry).filter(RelayEntry.event_id == event_id).all()
