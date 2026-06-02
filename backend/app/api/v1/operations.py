import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, require_recorder_or_admin, get_current_user
from app.models.event import SwimEvent
from app.models.heat import Heat
from app.models.entry import IndividualEntry, RelayEntry, RelayLeg
from app.models.result import TimeResult, ResultStatus, DQ_CODES
from app.models.assignment import EventAssignment, PDFReport, Award
from app.models.user import User, UserType
from app.schemas.schemas import (
    IndividualEntryCreate, IndividualEntryOut,
    RelayEntryCreate, RelayLegUpdate, RelayEntryOut,
    HeatOut, ResultCreate, ResultUpdate, ResultOut,
    AssignmentCreate, AssignmentOut, AwardCreate, AwardOut,
)
from app.services import seeding as seeding_svc
from app.services import result_service
from app.services import pdf_service
from app.services.seeding import format_ms

# ── Routers ────────────────────────────────────────────────────
entries_router     = APIRouter(prefix="/events",      tags=["Entries"])
heats_router       = APIRouter(prefix="/events",      tags=["Heats & Seeding"])
results_router     = APIRouter(prefix="/results",     tags=["Results"])
assignments_router = APIRouter(prefix="/assignments", tags=["Assignments"])
awards_router      = APIRouter(prefix="/meets",       tags=["Awards"])
reports_router     = APIRouter(prefix="/meets",       tags=["Reports"])


# ── Individual Entries ─────────────────────────────────────────

@entries_router.post("/{event_id}/individual-entries", response_model=IndividualEntryOut)
def add_individual_entry(event_id: str, data: IndividualEntryCreate,
                          db: Session = Depends(get_db), _: User = Depends(require_admin)):
    ev = db.get(SwimEvent, event_id)
    if not ev or ev.is_relay:
        raise HTTPException(400, "Individual event required")
    existing = db.query(IndividualEntry).filter_by(
        event_id=event_id, swimmer_id=data.swimmer_id).first()
    if existing:
        raise HTTPException(400, "Swimmer already entered in this event")

    entry = IndividualEntry(id=str(uuid.uuid4()), event_id=event_id, **data.model_dump())
    db.add(entry); db.commit(); db.refresh(entry)
    return _ind_entry_out(entry)


@entries_router.get("/{event_id}/individual-entries", response_model=List[IndividualEntryOut])
def list_individual_entries(event_id: str, db: Session = Depends(get_db),
                             _: User = Depends(get_current_user)):
    entries = db.query(IndividualEntry).filter(
        IndividualEntry.event_id == event_id).all()
    return [_ind_entry_out(e) for e in entries]


def _ind_entry_out(e: IndividualEntry) -> IndividualEntryOut:
    heat_number = e.heat.heat_number if e.heat else None
    return IndividualEntryOut(
        id=e.id, event_id=e.event_id, swimmer_id=e.swimmer_id,
        swimmer_name=e.swimmer.name if e.swimmer else None,
        college=e.swimmer.college if e.swimmer else None,
        gender=e.swimmer.gender if e.swimmer else None,
        heat_id=e.heat_id, heat_number=heat_number, lane=e.lane,
        seed_time_ms=e.seed_time_ms,
        seed_time_display=format_ms(e.seed_time_ms),
        withdrawn=e.withdrawn,
    )


# ── Relay Entries ──────────────────────────────────────────────

@entries_router.post("/{event_id}/relay-entries", response_model=RelayEntryOut)
def add_relay_entry(event_id: str, data: RelayEntryCreate,
                    db: Session = Depends(get_db), _: User = Depends(require_admin)):
    ev = db.get(SwimEvent, event_id)
    if not ev or not ev.is_relay:
        raise HTTPException(400, "Relay event required")
    existing = db.query(RelayEntry).filter_by(
        event_id=event_id, team_id=data.team_id).first()
    if existing:
        raise HTTPException(400, "Team already entered in this relay")

    entry = RelayEntry(id=str(uuid.uuid4()), event_id=event_id, **data.model_dump())
    db.add(entry)
    # Create 4 blank relay legs
    for leg_num in range(1, 5):
        db.add(RelayLeg(id=str(uuid.uuid4()), relay_entry_id=entry.id,
                         leg_number=leg_num))
    db.commit(); db.refresh(entry)
    return _relay_entry_out(entry)


@entries_router.get("/{event_id}/relay-entries", response_model=List[RelayEntryOut])
def list_relay_entries(event_id: str, db: Session = Depends(get_db),
                       _: User = Depends(get_current_user)):
    entries = db.query(RelayEntry).filter(RelayEntry.event_id == event_id).all()
    return [_relay_entry_out(e) for e in entries]


@entries_router.patch("/relay-entries/{entry_id}/legs")
def update_relay_leg(entry_id: str, data: RelayLegUpdate,
                     db: Session = Depends(get_db), _: User = Depends(require_admin)):
    leg = db.query(RelayLeg).filter_by(
        relay_entry_id=entry_id, leg_number=data.leg_number).first()
    if not leg: raise HTTPException(404, "Leg not found")
    if data.swimmer_id is not None:  leg.swimmer_id   = data.swimmer_id
    if data.split_time_ms is not None: leg.split_time_ms = data.split_time_ms
    db.commit()
    return {"status": "updated"}


def _relay_entry_out(e: RelayEntry) -> RelayEntryOut:
    heat_number = e.heat.heat_number if e.heat else None
    legs = [{"leg_number": l.leg_number,
             "swimmer_name": l.swimmer.name if l.swimmer else None,
             "split_time_display": format_ms(l.split_time_ms)}
            for l in sorted(e.legs, key=lambda x: x.leg_number)]
    return RelayEntryOut(
        id=e.id, event_id=e.event_id, team_id=e.team_id,
        team_name=e.team.name if e.team else None,
        heat_id=e.heat_id, heat_number=heat_number, lane=e.lane,
        seed_time_ms=e.seed_time_ms,
        seed_time_display=format_ms(e.seed_time_ms),
        withdrawn=e.withdrawn, legs=legs,
    )


# ── Seeding ────────────────────────────────────────────────────

@heats_router.post("/{event_id}/seed", response_model=List[HeatOut])
def seed_event(event_id: str, pool_lanes: int = 8,
               db: Session = Depends(get_db), _: User = Depends(require_admin)):
    """Run the center-out seeding algorithm for the event."""
    ev = db.get(SwimEvent, event_id)
    if not ev: raise HTTPException(404, "Event not found")
    heats = seeding_svc.seed_event(db, ev, pool_lanes)
    return heats


@heats_router.get("/{event_id}/heats", response_model=List[HeatOut])
def list_heats(event_id: str, db: Session = Depends(get_db),
               _: User = Depends(get_current_user)):
    return db.query(Heat).filter(Heat.event_id == event_id).order_by(
        Heat.heat_number).all()


# ── Results ────────────────────────────────────────────────────

@results_router.post("", response_model=ResultOut)
def record_result(data: ResultCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(require_recorder_or_admin)):
    """Recorder or admin submits a result. Starts as DRAFT."""
    # Check recorder is assigned to this event
    if current_user.user_type == UserType.recorder:
        event_id = None
        if data.individual_entry_id:
            e = db.get(IndividualEntry, data.individual_entry_id)
            event_id = e.event_id if e else None
        elif data.relay_entry_id:
            e = db.get(RelayEntry, data.relay_entry_id)
            event_id = e.event_id if e else None

        if event_id:
            assignment = db.query(EventAssignment).filter_by(
                event_id=event_id, recorder_id=current_user.id).first()
            if not assignment:
                raise HTTPException(403, "You are not assigned to this event")

    try:
        result = result_service.create_result(db, data, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return _result_out(result)


@results_router.get("/event/{event_id}", response_model=List[ResultOut])
def get_event_results(event_id: str, db: Session = Depends(get_db),
                      _: User = Depends(get_current_user)):
    """All results for an event (all statuses)."""
    results = []

    ind = db.query(IndividualEntry).filter(IndividualEntry.event_id == event_id).all()
    for e in ind:
        if e.result: results.append(_result_out(e.result))

    rel = db.query(RelayEntry).filter(RelayEntry.event_id == event_id).all()
    for e in rel:
        if e.result: results.append(_result_out(e.result))

    return sorted(results, key=lambda r: (r.rank or 999, r.final_time_ms or 999999))


@results_router.patch("/{result_id}/edit", response_model=ResultOut)
def edit_result(result_id: str, data: ResultUpdate,
                db: Session = Depends(get_db),
                current_user: User = Depends(require_recorder_or_admin)):
    result = db.get(TimeResult, result_id)
    if not result: raise HTTPException(404, "Result not found")

    # Recorders may only edit DRAFT results on their assigned events
    if current_user.user_type == UserType.recorder:
        event_id = _event_id_for_result(db, result)
        assignment = db.query(EventAssignment).filter_by(
            event_id=event_id, recorder_id=current_user.id).first() if event_id else None
        if not assignment:
            raise HTTPException(403, "Not assigned to this event")
        if result.status != "draft":
            raise HTTPException(403, "Recorders may only edit draft results")

    try:
        result = result_service.edit_result(db, result, data, current_user.id)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return _result_out(result)


@results_router.patch("/{result_id}/save", response_model=ResultOut)
def save_result(result_id: str, db: Session = Depends(get_db),
                current_user: User = Depends(require_recorder_or_admin)):
    """Recorder or Admin: DRAFT → SAVED (recorder submits for review)."""
    result = db.get(TimeResult, result_id)
    if not result: raise HTTPException(404, "Result not found")

    # Recorders may only save DRAFT results on their assigned events
    if current_user.user_type == UserType.recorder:
        event_id = _event_id_for_result(db, result)
        assignment = db.query(EventAssignment).filter_by(
            event_id=event_id, recorder_id=current_user.id).first() if event_id else None
        if not assignment:
            raise HTTPException(403, "Not assigned to this event")

    try:
        result = result_service.save_result(db, result)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return _result_out(result)


@results_router.patch("/{result_id}/finalize", response_model=ResultOut)
def finalize_result(result_id: str, db: Session = Depends(get_db),
                    current_user: User = Depends(require_admin)):
    """Admin: SAVED → FINALIZED. Triggers rank recomputation."""
    result = db.get(TimeResult, result_id)
    if not result: raise HTTPException(404, "Result not found")
    result = result_service.finalize_result(db, result, current_user.id)
    return _result_out(result)


@results_router.get("/dq-codes")
def get_dq_codes():
    return DQ_CODES


def _result_out(r: TimeResult) -> ResultOut:
    heat_number, lane = None, None
    if r.individual_entry:
        heat_number = r.individual_entry.heat.heat_number if r.individual_entry.heat else None
        lane = r.individual_entry.lane
    elif r.relay_entry:
        heat_number = r.relay_entry.heat.heat_number if r.relay_entry.heat else None
        lane = r.relay_entry.lane

    return ResultOut(
        id=r.id,
        individual_entry_id=r.individual_entry_id,
        relay_entry_id=r.relay_entry_id,
        final_time_ms=r.final_time_ms,
        time_display=r.format_time(),
        splits_ms=r.splits_ms,
        dns=r.dns, dnf=r.dnf, dq=r.dq,
        dq_code=r.dq_code, dq_description=r.dq_description,
        rank=r.rank, status=r.status,
        recorded_at=r.recorded_at, edited_at=r.edited_at,
        finalized_at=r.finalized_at, notes=r.notes,
        participant_name=r.participant_name,
        heat_number=heat_number, lane=lane,
    )


# ── Helpers ────────────────────────────────────────────────────

def _event_id_for_result(db: Session, result: TimeResult):
    """Return the event_id for a result (individual or relay)."""
    if result.individual_entry_id:
        e = db.get(IndividualEntry, result.individual_entry_id)
        return e.event_id if e else None
    if result.relay_entry_id:
        e = db.get(RelayEntry, result.relay_entry_id)
        return e.event_id if e else None
    return None


# ── Assignments ────────────────────────────────────────────────

@assignments_router.post("", response_model=AssignmentOut)
def assign_recorder(data: AssignmentCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(require_admin)):
    recorder = db.query(User).filter(
        User.id == data.recorder_id, User.user_type == UserType.recorder).first()
    if not recorder: raise HTTPException(404, "Recorder not found")
    event = db.get(SwimEvent, data.event_id)
    if not event: raise HTTPException(404, "Event not found")

    existing = db.query(EventAssignment).filter_by(
        event_id=data.event_id, recorder_id=data.recorder_id).first()
    if existing: raise HTTPException(400, "Already assigned")

    a = EventAssignment(id=str(uuid.uuid4()), event_id=data.event_id,
                        recorder_id=data.recorder_id, admin_id=current_user.id)
    db.add(a); db.commit(); db.refresh(a)
    return AssignmentOut(id=a.id, event_id=a.event_id, event_name=event.name,
                         recorder_id=a.recorder_id, recorder_name=recorder.name,
                         admin_id=a.admin_id, assigned_at=a.assigned_at)


@assignments_router.delete("/{assignment_id}", status_code=204)
def remove_assignment(assignment_id: str, db: Session = Depends(get_db),
                      _: User = Depends(require_admin)):
    a = db.get(EventAssignment, assignment_id)
    if not a: raise HTTPException(404, "Assignment not found")
    db.delete(a); db.commit()


@assignments_router.get("/my", response_model=List[AssignmentOut])
def my_assignments(db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    """Recorder: all events assigned to me."""
    items = db.query(EventAssignment).filter(
        EventAssignment.recorder_id == current_user.id).all()
    return [AssignmentOut(
        id=a.id, event_id=a.event_id,
        event_name=a.event.name if a.event else None,
        recorder_id=a.recorder_id,
        recorder_name=a.recorder.name if a.recorder else None,
        admin_id=a.admin_id, assigned_at=a.assigned_at,
    ) for a in items]


@assignments_router.get("/event/{event_id}", response_model=List[AssignmentOut])
def get_assignments(event_id: str, db: Session = Depends(get_db),
                    _: User = Depends(require_admin)):
    items = db.query(EventAssignment).filter(
        EventAssignment.event_id == event_id).all()
    return [AssignmentOut(
        id=a.id, event_id=a.event_id,
        event_name=a.event.name if a.event else None,
        recorder_id=a.recorder_id,
        recorder_name=a.recorder.name if a.recorder else None,
        admin_id=a.admin_id, assigned_at=a.assigned_at,
    ) for a in items]


# ── Awards ─────────────────────────────────────────────────────

@awards_router.post("/{meet_id}/awards", response_model=AwardOut)
def create_award(meet_id: str, data: AwardCreate,
                 db: Session = Depends(get_db), _: User = Depends(require_admin)):
    award = Award(id=str(uuid.uuid4()), meet_id=meet_id, **data.model_dump())
    db.add(award); db.commit(); db.refresh(award)
    return AwardOut(**award.__dict__,
                    swimmer_name=award.swimmer.name if award.swimmer else None)


@awards_router.get("/{meet_id}/awards", response_model=List[AwardOut])
def list_awards(meet_id: str, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    awards = db.query(Award).filter(Award.meet_id == meet_id).all()
    return [AwardOut(**a.__dict__,
                     swimmer_name=a.swimmer.name if a.swimmer else None)
            for a in awards]


# ── PDF Reports ────────────────────────────────────────────────

@reports_router.post("/{meet_id}/reports/heat-sheet")
def download_heat_sheet(meet_id: str, db: Session = Depends(get_db),
                         _: User = Depends(require_admin)):
    try:
        path = pdf_service.generate_heat_sheet(db, meet_id)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(500, str(e))
    _save_report(db, meet_id, path, "heat_sheet")
    return FileResponse(path, media_type="application/pdf",
                        filename=f"heat_sheet_{meet_id[:8]}.pdf")


@reports_router.post("/{meet_id}/reports/results")
def download_results(meet_id: str, db: Session = Depends(get_db),
                     _: User = Depends(require_admin)):
    try:
        path = pdf_service.generate_results(db, meet_id)
    except (ValueError, RuntimeError) as e:
        raise HTTPException(500, str(e))
    _save_report(db, meet_id, path, "results")
    return FileResponse(path, media_type="application/pdf",
                        filename=f"results_{meet_id[:8]}.pdf")


def _save_report(db, meet_id, path, report_type):
    r = PDFReport(id=str(uuid.uuid4()), meet_id=meet_id,
                  file_path=path, report_type=report_type)
    db.add(r); db.commit()
