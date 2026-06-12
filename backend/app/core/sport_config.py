"""
Sport Configuration — Multi-sport support.

Provides configuration dictionaries for supported sports (e.g., swimming, track_field).
Functions like get_sport_config() retrieve the config dynamically per-meet.
"""


SPORT_CONFIGS: dict[str, dict] = {

    # ── Swimming ──────────────────────────────────────────────────────────────
    "swimming": {
        "sport_name":            "Swimming",
        "meet_type_label":       "Swim Meet",
        "participant_label":     "Swimmer",
        "participants_label":    "Swimmers",
        "team_member_label":     "Swimmer",
        "performance_label":     "Time",
        "performance_unit":      "seconds",
        "is_field_sport":        False,   # no "metres" results; only timed
        "discipline_label":      "Stroke",
        "venue_config_label":    "Course",
        "venue_configs":         ["SCY", "SCM", "LCM"],
        "default_venue_config":  "SCM",
        "lane_label":            "Lane",
        "lanes_default":         8,
        "heat_label":            "Heat",
        "seed_performance_label":"Seed Time",
        "dq_codes": {
            "SW 4.4":  "False start",
            "SW 5.3":  "Did not finish",
            "SW 6.5":  "Freestyle — illegal kick / stroke",
            "SW 7.1":  "Backstroke — not on back at finish",
            "SW 8.2":  "Breaststroke — illegal kick",
            "SW 9.3":  "Butterfly — illegal arm recovery",
            "SW 10.2": "IM — stroke order incorrect",
            "SW 11.3": "Relay — early take-off",
        },
        "disciplines": [
            "freestyle", "backstroke", "breaststroke",
            "butterfly", "individual_medley",
            "relay_freestyle", "relay_medley",
        ],
        "relay_disciplines": ["relay_freestyle", "relay_medley"],
        "field_disciplines": [],   # no field events in swimming
        "valid_distances": {
            "freestyle":         [50, 100, 200, 400, 800, 1500],
            "backstroke":        [50, 100, 200],
            "breaststroke":      [50, 100, 200],
            "butterfly":         [50, 100, 200],
            "individual_medley": [100, 200, 400],
            "relay_freestyle":   [50, 100],
            "relay_medley":      [50, 100],
        },
        "result_format":    "time",    # "time" | "distance" | "both"
        "pdf_header_color": "#003366",  # deep swim blue
    },

    # ── Track & Field ─────────────────────────────────────────────────────────
    "track_field": {
        "sport_name":            "Track & Field",
        "meet_type_label":       "Track Meet",
        "participant_label":     "Athlete",
        "participants_label":    "Athletes",
        "team_member_label":     "Athlete",
        "performance_label":     "Performance",
        "performance_unit":      "seconds or metres",
        "is_field_sport":        True,   # some events produce metres results
        "discipline_label":      "Discipline",
        "venue_config_label":    "Surface",
        "venue_configs":         ["Synthetic", "Grass", "Indoor"],
        "default_venue_config":  "Synthetic",
        "lane_label":            "Lane",
        "lanes_default":         8,
        "heat_label":            "Heat / Round",
        "seed_performance_label":"Seed Mark",
        "dq_codes": {
            "TR 1.1": "False start",
            "TR 2.3": "Lane violation / run outside lane",
            "TR 3.1": "Obstruction / impeding another athlete",
            "TR 4.2": "Failure to complete all attempts (field)",
            "TR 5.1": "Implement lands outside sector (field)",
            "TR 6.3": "Relay — baton exchange outside zone",
            "TR 7.1": "Relay — baton dropped and not recovered",
            "TR 8.2": "Did not attempt / DNS",
            "TR 9.1": "Foot fault (field events)",
        },
        "disciplines": [
            # Running — track events
            "sprint_60m",
            "sprint_100m",
            "sprint_200m",
            "sprint_400m",
            "middle_800m",
            "middle_1500m",
            "long_3000m",
            "long_5000m",
            "long_10000m",
            "hurdles_100m",
            "hurdles_110m",
            "hurdles_400m",
            "steeplechase_3000m",
            "relay_4x100m",
            "relay_4x400m",
            # Field events — jumps
            "long_jump",
            "triple_jump",
            "high_jump",
            "pole_vault",
            # Field events — throws
            "shot_put",
            "discus",
            "javelin",
            "hammer",
        ],
        "relay_disciplines": ["relay_4x100m", "relay_4x400m"],
        "field_disciplines": [
            "long_jump", "triple_jump", "high_jump", "pole_vault",
            "shot_put", "discus", "javelin", "hammer",
        ],
        # For track: distance in metres; for field: use distance=0 (mark in cm stored in attempt_marks)
        "valid_distances": {
            "sprint_60m":         [60],
            "sprint_100m":        [100],
            "sprint_200m":        [200],
            "sprint_400m":        [400],
            "middle_800m":        [800],
            "middle_1500m":       [1500],
            "long_3000m":         [3000],
            "long_5000m":         [5000],
            "long_10000m":        [10000],
            "hurdles_100m":       [100],
            "hurdles_110m":       [110],
            "hurdles_400m":       [400],
            "steeplechase_3000m": [3000],
            "relay_4x100m":       [100],   # per-leg distance
            "relay_4x400m":       [400],
            # Field events: distance=0 means "mark-based"
            "long_jump":          [0],
            "triple_jump":        [0],
            "high_jump":          [0],
            "pole_vault":         [0],
            "shot_put":           [0],
            "discus":             [0],
            "javelin":            [0],
            "hammer":             [0],
        },
        "result_format":    "both",    # "time" for track, "distance" for field
        "pdf_header_color": "#7c2d12",  # deep amber/track red
        "max_attempts":     6,         # field events: up to 6 attempts
    },
}

def get_sport_config(sport_type: str) -> dict:
    """Retrieve the configuration dictionary for the given sport type."""
    return SPORT_CONFIGS.get(sport_type, SPORT_CONFIGS["swimming"])


def is_field_discipline(discipline: str, sport_type: str) -> bool:
    """Return True if this discipline is a field event (mark in metres, not time)."""
    sport_config = get_sport_config(sport_type)
    return discipline in sport_config.get("field_disciplines", [])


def is_relay_discipline(discipline: str, sport_type: str) -> bool:
    """Return True if this discipline is a relay event."""
    sport_config = get_sport_config(sport_type)
    return discipline in sport_config.get("relay_disciplines", [])


def format_performance(value_ms: int | None, discipline: str | None = None,
                        attempt_marks: list | None = None, sport_type: str = "swimming") -> str:
    """
    Universal performance formatter.
    - Timed events: format ms as mm:ss.hh
    - Field events:  format best attempt_mark (cm) as X.XX m
    """
    if discipline and is_field_discipline(discipline, sport_type):
        # Field: show best mark from attempt_marks list (values in cm)
        if attempt_marks:
            best = max((m for m in attempt_marks if m and m > 0), default=None)
            if best:
                return f"{best / 100:.2f} m"
        return "NM"   # No Mark

    # Timed event
    if not value_ms:
        return "NT"
    total_s = value_ms / 1000.0
    mins = int(total_s // 60)
    secs = total_s % 60
    return f"{mins}:{secs:05.2f}" if mins else f"{secs:.2f}"
