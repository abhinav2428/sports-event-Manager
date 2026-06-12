"""
Result service — create, edit, save, finalize results + ranking.
operations.py calls: create_result, edit_result, save_result, finalize_result
"""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.result import TimeResult, ResultStatus
from app.models.entry import IndividualEntry, RelayEntry
from app.schemas.schemas import ResultCreate, ResultUpdate
from app.core.sport_config import is_field_discipline


def create_result(db: Session, data: ResultCreate, recorder_id: str) -> TimeResult:
    # Validate: exactly one entry referenced
    if not data.individual_entry_id and not data.relay_entry_id:
        raise ValueError("Must provide either individual_entry_id or relay_entry_id")
    if data.individual_entry_id and data.relay_entry_id:
        raise ValueError("Cannot provide both individual_entry_id and relay_entry_id")

    result = TimeResult(
        id=str(uuid.uuid4()),
        individual_entry_id=data.individual_entry_id,
        relay_entry_id=data.relay_entry_id,
        final_time_ms=data.final_time_ms,
        splits_ms=data.splits_ms,
        attempt_marks=data.attempt_marks,  # field events
        dns=data.dns, dnf=data.dnf, dq=data.dq,
        dq_code=data.dq_code,
        dq_description=data.dq_description,
        notes=data.notes,
        recorded_by=recorder_id,
        status=ResultStatus.draft,
    )
    db.add(result); db.commit(); db.refresh(result)
    return result


def edit_result(db: Session, result: TimeResult,
                data: ResultUpdate, editor_id: str) -> TimeResult:
    if result.status == ResultStatus.finalized:
        raise ValueError("Cannot edit a finalized result")
    for field, val in data.model_dump(exclude_none=True).items():
        setattr(result, field, val)
    result.edited_at = datetime.utcnow()
    db.commit(); db.refresh(result)
    return result


def save_result(db: Session, result: TimeResult) -> TimeResult:
    if result.status != ResultStatus.draft:
        raise ValueError("Only draft results can be saved")
    result.status = ResultStatus.saved
    db.commit(); db.refresh(result)
    return result


def finalize_result(db: Session, result: TimeResult, admin_id: str) -> TimeResult:
    if result.status == ResultStatus.finalized:
        raise ValueError("Already finalized")
    result.status = ResultStatus.finalized
    result.finalized_at = datetime.utcnow()
    db.commit()
    # Recompute rankings for the event
    _recompute_rankings(db, result)
    db.refresh(result)
    return result


def _recompute_rankings(db: Session, result: TimeResult):
    """After finalizing, re-rank all finalized results in the same event."""
    event_id = None
    if result.individual_entry_id:
        entry = db.get(IndividualEntry, result.individual_entry_id)
        event_id = entry.event_id if entry else None
    elif result.relay_entry_id:
        entry = db.get(RelayEntry, result.relay_entry_id)
        event_id = entry.event_id if entry else None

    if not event_id:
        return

    # Gather all finalized results for this event
    ind_entries = db.query(IndividualEntry).filter_by(event_id=event_id).all()
    rel_entries = db.query(RelayEntry).filter_by(event_id=event_id).all()

    all_finalized = []
    for e in ind_entries:
        if e.result and e.result.status == ResultStatus.finalized:
            all_finalized.append(e.result)
    for e in rel_entries:
        if e.result and e.result.status == ResultStatus.finalized:
            all_finalized.append(e.result)

    # Only rank results with a valid performance (no DQ/DNS/DNF)
    rankable = [r for r in all_finalized if not r.dns and not r.dnf and not r.dq]
    non_rankable = [r for r in all_finalized if r.dns or r.dnf or r.dq]

    # Determine if this is a field event (rank by best mark descending)
    is_field = False
    try:
        from app.models.event import SportEvent
        entry_0 = all_finalized[0] if all_finalized else None
        if entry_0:
            ev_id = None
            if entry_0.individual_entry_id:
                e = db.get(IndividualEntry, entry_0.individual_entry_id)
                ev_id = e.event_id if e else None
            elif entry_0.relay_entry_id:
                e = db.get(RelayEntry, entry_0.relay_entry_id)
                ev_id = e.event_id if e else None
            if ev_id:
                ev = db.get(SportEvent, ev_id)
                is_field = ev.is_field if ev else False
    except Exception:
        pass

    if is_field:
        # Field events: best mark = highest value in attempt_marks (cm); higher = better
        def field_key(r):
            marks = r.attempt_marks or []
            valid = [m for m in marks if m and m > 0]
            return -(max(valid) if valid else 0)   # negate for ascending sort = best first
        rankable_with_mark = [r for r in rankable if r.attempt_marks and any(m and m > 0 for m in r.attempt_marks)]
        rankable_no_mark   = [r for r in rankable if not (r.attempt_marks and any(m and m > 0 for m in r.attempt_marks))]
        rankable_with_mark.sort(key=field_key)
        for rank, r in enumerate(rankable_with_mark, start=1):
            r.rank = rank
        for r in rankable_no_mark:
            r.rank = None
    else:
        # Timed events: fastest time wins
        rankable_timed     = [r for r in rankable if r.final_time_ms]
        rankable_no_time   = [r for r in rankable if not r.final_time_ms]
        rankable_timed.sort(key=lambda r: r.final_time_ms)
        for rank, r in enumerate(rankable_timed, start=1):
            r.rank = rank
        for r in rankable_no_time:
            r.rank = None

    # Clear stale ranks from DQ/DNS/DNF results
    for r in non_rankable:
        r.rank = None
    db.commit()

