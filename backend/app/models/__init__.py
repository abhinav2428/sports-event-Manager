"""
Import all models here so SQLAlchemy's Base.metadata knows about all tables.
Imported by main.py and alembic/env.py via: import app.models

Sport-agnostic naming:
  Athlete  (was Swimmer) — participant in any sport
  SportEvent (was SwimEvent) — event in any sport meet
Both old names kept as aliases for backward compatibility.
"""
from app.models.user import User, Administrator, Recorder          # noqa
from app.models.swimmer import Athlete, Swimmer, Team, TeamMembership # noqa
from app.models.meet import Meet                                    # noqa
from app.models.event import SportEvent, SwimEvent                # noqa
from app.models.entry import IndividualEntry, RelayEntry, RelayLeg  # noqa
from app.models.heat import Heat                                    # noqa
from app.models.assignment import EventAssignment, PDFReport, Award # noqa
from app.models.result import TimeResult, Result                    # noqa
