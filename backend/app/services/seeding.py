"""
NCAA Circle Seeding — assigns entries to heats and lanes.
Updates IndividualEntry.heat_id and .lane directly (no separate assignment table).
"""
import uuid, math
from typing import List
from sqlalchemy.orm import Session
from app.models.event import SwimEvent, EventStatus
from app.models.entry import IndividualEntry, RelayEntry, EntryStatus
from app.models.heat import Heat


CIRCLE_LANES: dict[int, list[int]] = {
    6:  [3, 4, 2, 5, 1, 6],
    8:  [4, 5, 3, 6, 2, 7, 1, 8],
    10: [5, 6, 4, 7, 3, 8, 2, 9, 1, 10],
}


def _circle_pattern(lanes: int) -> list[int]:
    if lanes in CIRCLE_LANES:
        return CIRCLE_LANES[lanes]
    mid = (lanes + 1) // 2
    pattern, left, right = [mid], mid - 1, mid + 1
    while left >= 1 or right <= lanes:
        if right <= lanes:
            pattern.append(right); right += 1
        if left >= 1:
            pattern.append(left); left -= 1
    return pattern


def format_ms(ms: int | None) -> str:
    """Format milliseconds to mm:ss.hh display string."""
    if ms is None:
        return "NT"
    total_s = ms / 1000.0
    mins = int(total_s // 60)
    secs = total_s % 60
    return f"{mins}:{secs:05.2f}" if mins else f"{secs:.2f}"


def seed_event(db: Session, event: SwimEvent, pool_lanes: int = 8) -> List[Heat]:
    """
    Run circle seeding for an event.
    Updates entry.heat_id and entry.lane directly.
    Returns created Heat list.
    """
    if event.is_relay:
        entries = (db.query(RelayEntry)
                     .filter(RelayEntry.event_id == event.id,
                             RelayEntry.withdrawn == False)
                     .all())
        def get_seed_ms(e): return e.seed_time_ms if e.seed_time_ms else float("inf")
    else:
        entries = (db.query(IndividualEntry)
                     .filter(IndividualEntry.event_id == event.id,
                             IndividualEntry.withdrawn == False)
                     .all())
        def get_seed_ms(e): return e.seed_time_ms if e.seed_time_ms else float("inf")

    if not entries:
        return []

    timed   = sorted([e for e in entries if get_seed_ms(e) != float("inf")], key=get_seed_ms)
    no_time = [e for e in entries if get_seed_ms(e) == float("inf")]
    sorted_entries = timed + no_time

    # Clear existing heat assignments before deleting heats
    for entry in entries:
        entry.heat_id = None
        entry.lane = None
    db.flush()

    # Delete previous heats
    for heat in event.heats:
        db.delete(heat)
    db.flush()

    num_heats = math.ceil(len(sorted_entries) / pool_lanes)
    heat_buckets: list[list] = [[] for _ in range(num_heats)]

    for i, entry in enumerate(reversed(sorted_entries)):
        heat_index = num_heats - 1 - (i // pool_lanes)
        heat_buckets[heat_index].append(entry)

    for bucket in heat_buckets:
        bucket.reverse()

    pattern = _circle_pattern(pool_lanes)
    created: List[Heat] = []

    for heat_num, bucket in enumerate(heat_buckets, start=1):
        heat = Heat(id=str(uuid.uuid4()), event_id=event.id, heat_number=heat_num)
        db.add(heat); db.flush()

        for rank, entry in enumerate(bucket):
            entry.heat_id = heat.id
            entry.lane    = pattern[rank] if rank < len(pattern) else rank + 1
            entry.status  = EntryStatus.seeded if hasattr(entry, "status") else None
            
            # Auto-generate draft result if not exists
            if not getattr(entry, "result", None):
                from app.models.result import TimeResult, ResultStatus
                result = TimeResult(
                    id=str(uuid.uuid4()),
                    individual_entry_id=entry.id if not event.is_relay else None,
                    relay_entry_id=entry.id if event.is_relay else None,
                    status=ResultStatus.draft
                )
                db.add(result)

        created.append(heat)

    event.status = EventStatus.seeded
    db.commit()
    for h in created:
        db.refresh(h)
    return created
