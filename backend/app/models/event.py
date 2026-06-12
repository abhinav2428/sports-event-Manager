"""
SportEvent model — sport-agnostic event container.
Discipline and distance rules come from SPORT config, not hard-coded enums.
Supports both timed (track) and mark-based (field) events.
"""
import enum
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base

Discipline = str   # We use plain str validation via API; enum kept for docs.


class EventGender(str, enum.Enum):
    male   = "M"
    female = "F"
    mixed  = "mixed"


class EventStatus(str, enum.Enum):
    upcoming  = "upcoming"
    seeded    = "seeded"
    ongoing   = "ongoing"
    completed = "completed"




class SportEvent(Base):
    """
    Represents any competitive event within a meet — track race, field event,
    or relay — for the currently active sport.

    Common fields (identical across all sports):
      id, meet_id, event_number, name, gender, is_relay, relay_legs, status

    Sport-specific field:
      discipline  (was 'stroke' in the swim version)
      distance    (metres for track; 0 for field events where marks are used)
      is_field    (True for jump/throw events; False for timed/track events)
    """
    __tablename__ = "sport_events"

    id           = Column(String, primary_key=True)
    meet_id      = Column(String, ForeignKey("meets.id"), nullable=False)
    event_number = Column(Integer, nullable=False)
    name         = Column(String(200), nullable=False)
    discipline   = Column(String(80), nullable=False)      # was "stroke"
    distance     = Column(Integer, nullable=False)         # metres; 0 for field
    gender       = Column(SAEnum(EventGender), nullable=False)
    is_relay     = Column(Boolean, default=False)
    is_field     = Column(Boolean, default=False)          # NEW: True for jumps/throws
    relay_legs   = Column(Integer, default=1)
    status       = Column(SAEnum(EventStatus), default=EventStatus.upcoming)

    meet               = relationship("Meet", back_populates="events")
    heats              = relationship("Heat", back_populates="event",
                                     cascade="all, delete-orphan",
                                     order_by="Heat.heat_number")
    individual_entries = relationship("IndividualEntry", back_populates="event")
    relay_entries      = relationship("RelayEntry", back_populates="event")
    assignments        = relationship("EventAssignment", back_populates="event",
                                     cascade="all, delete-orphan")

    @property
    def total_distance(self) -> int:
        """For timed events: total_distance = distance × relay_legs.
           For field events (distance=0): returns 0."""
        return self.distance * self.relay_legs if not self.is_field else 0

    @property
    def performance_label(self) -> str:
        """Human-readable label for the result column in PDFs / UI."""
        return "Best Mark" if self.is_field else "Official Time"


# ── Backward-compat alias (existing routers import SwimEvent) ──────────────
SwimEvent = SportEvent
