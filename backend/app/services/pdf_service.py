"""
PDF Service — generates heat sheets and results PDFs using WeasyPrint + Jinja2.
operations.py calls: generate_heat_sheet(db, meet_id), generate_results(db, meet_id)

NOTE: WeasyPrint requires GTK/Pango system libraries on Windows.
Install GTK3 runtime from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
PDF endpoints will raise a RuntimeError if GTK is not installed.
"""
import os
from pathlib import Path
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from xhtml2pdf import pisa
from app.models.meet import Meet
from app.services.seeding import format_ms
from app.core.sport_config import get_sport_config, format_performance

TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
OUTPUT_DIR = Path("pdfs")
OUTPUT_DIR.mkdir(exist_ok=True)

_env = Environment(loader=FileSystemLoader(str(TEMPLATES_DIR)))


def _get_meet(db: Session, meet_id: str) -> Meet:
    meet = db.get(Meet, meet_id)
    if not meet:
        raise ValueError(f"Meet {meet_id} not found")
    return meet


def generate_heat_sheet(db: Session, meet_id: str) -> str:
    meet = _get_meet(db, meet_id)
    events_data = []
    for event in meet.events:
        heats_data = []
        # Group entries by heat
        heat_map: dict[str, list[dict]] = {}
        for entry in event.individual_entries:
            if not entry.heat_id or entry.withdrawn:
                continue
            hid = entry.heat_id
            heat_map.setdefault(hid, [])
            heat_map[hid].append({
                "lane": entry.lane,
                "name": entry.swimmer.name if entry.swimmer else "?",
                "college": entry.swimmer.college if entry.swimmer else "",
                "seed_time": format_ms(entry.seed_time_ms),
            })
        for entry in event.relay_entries:
            if not entry.heat_id or entry.withdrawn:
                continue
            hid = entry.heat_id
            heat_map.setdefault(hid, [])
            heat_map[hid].append({
                "lane": entry.lane,
                "name": entry.team.name if entry.team else "?",
                "college": "",
                "seed_time": format_ms(entry.seed_time_ms),
            })

        for heat in sorted(event.heats, key=lambda h: h.heat_number):
            lanes = sorted(heat_map.get(heat.id, []), key=lambda x: x["lane"])
            heats_data.append({"heat_number": heat.heat_number, "lanes": lanes})

        events_data.append({
            "event_number": event.event_number,
            "name": event.name,
            "heats": heats_data,
        })

    sport_config = get_sport_config(meet.sport_type)
    context = {"meet": meet, "events": events_data,
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "sport_name": sport_config["sport_name"],
                "discipline_label": sport_config["discipline_label"],
                "venue_config_label": sport_config["venue_config_label"],
                "participant_label": sport_config["participant_label"],
                "seed_performance_label": sport_config["seed_performance_label"],}
    html = _env.get_template("heat_sheet.html").render(**context)
    path = str(OUTPUT_DIR / f"heat_sheet_{meet_id}.pdf")
    # Delete any stale cached PDF before regenerating
    if os.path.exists(path):
        os.remove(path)
    with open(path, "wb") as f:
        pisa.CreatePDF(html, dest=f)
    return path


def generate_results(db: Session, meet_id: str) -> str:
    from sqlalchemy.orm import joinedload
    from app.models.entry import IndividualEntry, RelayEntry
    from app.models.result import TimeResult

    meet = _get_meet(db, meet_id)
    sport_type = meet.sport_type  # capture early before any lazy load

    events_data = []
    for event in meet.events:
        discipline = event.discipline  # read directly from the event row
        is_field = event.is_field

        results_data = []

        # Eagerly load individual entries + results in one query
        ind_entries = (
            db.query(IndividualEntry)
            .options(
                joinedload(IndividualEntry.result),
                joinedload(IndividualEntry.swimmer),
            )
            .filter(IndividualEntry.event_id == event.id)
            .all()
        )
        for entry in ind_entries:
            if not entry.result:
                continue
            r = entry.result
            # Read attempt_marks directly from the result row
            marks = db.query(TimeResult.attempt_marks).filter(TimeResult.id == r.id).scalar()
            time_ms = db.query(TimeResult.final_time_ms).filter(TimeResult.id == r.id).scalar()
            raw_status = db.query(TimeResult.status).filter(TimeResult.id == r.id).scalar()
            status_str = raw_status.value if hasattr(raw_status, 'value') else str(raw_status)
            perf = format_performance(time_ms, discipline, marks, sport_type)
            results_data.append({
                "rank": r.rank or "—",
                "name": entry.swimmer.name if entry.swimmer else "?",
                "time": perf,
                "status": status_str,
                "dq": r.dq, "dns": r.dns, "dnf": r.dnf,
                "dq_code": r.dq_code or "",
            })

        # Eagerly load relay entries + results
        rel_entries = (
            db.query(RelayEntry)
            .options(
                joinedload(RelayEntry.result),
                joinedload(RelayEntry.team),
            )
            .filter(RelayEntry.event_id == event.id)
            .all()
        )
        for entry in rel_entries:
            if not entry.result:
                continue
            r = entry.result
            marks = db.query(TimeResult.attempt_marks).filter(TimeResult.id == r.id).scalar()
            time_ms = db.query(TimeResult.final_time_ms).filter(TimeResult.id == r.id).scalar()
            raw_status = db.query(TimeResult.status).filter(TimeResult.id == r.id).scalar()
            status_str = raw_status.value if hasattr(raw_status, 'value') else str(raw_status)
            perf = format_performance(time_ms, discipline, marks, sport_type)
            results_data.append({
                "rank": r.rank or "—",
                "name": entry.team.name if entry.team else "?",
                "time": perf,
                "status": status_str,
                "dq": r.dq, "dns": r.dns, "dnf": r.dnf,
                "dq_code": r.dq_code or "",
            })

        results_data.sort(key=lambda x: (not isinstance(x["rank"], int), x["rank"] if isinstance(x["rank"], int) else 9999))
        events_data.append({"event_number": event.event_number, "name": event.name,
                             "results": results_data})

    sport_config = get_sport_config(meet.sport_type)
    context = {"meet": meet, "events": events_data,
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
                "sport_name": sport_config["sport_name"],
                "discipline_label": sport_config["discipline_label"],
                "venue_config_label": sport_config["venue_config_label"],
                "participant_label": sport_config["participant_label"],
                "pdf_header_color": sport_config["pdf_header_color"],}
    html = _env.get_template("results.html").render(**context)
    path = str(OUTPUT_DIR / f"results_{meet_id}.pdf")
    # Delete any stale cached PDF before regenerating
    if os.path.exists(path):
        os.remove(path)
    with open(path, "wb") as f:
        pisa.CreatePDF(html, dest=f)
    return path
