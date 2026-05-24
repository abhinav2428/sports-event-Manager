"""
PDF Service — generates heat sheets and results PDFs using WeasyPrint + Jinja2.
operations.py calls: generate_heat_sheet(db, meet_id), generate_results(db, meet_id)

NOTE: WeasyPrint requires GTK/Pango system libraries on Windows.
Install GTK3 runtime from: https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer
PDF endpoints will raise a RuntimeError if GTK is not installed.
"""
from pathlib import Path
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from sqlalchemy.orm import Session
from app.models.meet import Meet
from app.services.seeding import format_ms

# Lazy-load WeasyPrint so the server starts even without GTK on Windows
def _get_weasyprint_html():
    try:
        from weasyprint import HTML
        return HTML
    except OSError as e:
        raise RuntimeError(
            "WeasyPrint requires GTK/Pango system libraries.\n"
            "Windows: install GTK3 runtime from https://github.com/tschoonj/GTK-for-Windows-Runtime-Environment-Installer\n"
            f"Original error: {e}"
        )

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

    context = {"meet": meet, "events": events_data,
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M")}
    html = _env.get_template("heat_sheet.html").render(**context)
    path = str(OUTPUT_DIR / f"heat_sheet_{meet_id}.pdf")
    _get_weasyprint_html()(string=html).write_pdf(path)
    return path


def generate_results(db: Session, meet_id: str) -> str:
    meet = _get_meet(db, meet_id)
    events_data = []
    for event in meet.events:
        results_data = []
        for entry in event.individual_entries:
            if entry.result:
                r = entry.result
                results_data.append({
                    "rank": r.rank or "—",
                    "name": entry.swimmer.name if entry.swimmer else "?",
                    "time": r.format_time(),
                    "status": r.status,
                    "dq": r.dq, "dns": r.dns, "dnf": r.dnf,
                    "dq_code": r.dq_code or "",
                })
        for entry in event.relay_entries:
            if entry.result:
                r = entry.result
                results_data.append({
                    "rank": r.rank or "—",
                    "name": entry.team.name if entry.team else "?",
                    "time": r.format_time(),
                    "status": r.status,
                    "dq": r.dq, "dns": r.dns, "dnf": r.dnf,
                    "dq_code": r.dq_code or "",
                })
        results_data.sort(key=lambda x: (not isinstance(x["rank"], int), x["rank"] if isinstance(x["rank"], int) else 9999))
        events_data.append({"event_number": event.event_number, "name": event.name,
                             "results": results_data})

    context = {"meet": meet, "events": events_data,
                "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M")}
    html = _env.get_template("results.html").render(**context)
    path = str(OUTPUT_DIR / f"results_{meet_id}.pdf")
    _get_weasyprint_html()(string=html).write_pdf(path)
    return path
