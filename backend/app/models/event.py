"""
SwimEvent model with stroke/distance validation constants.
"""
import enum
from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class Stroke(str, enum.Enum):
    freestyle         = "freestyle"
    backstroke        = "backstroke"
    breaststroke      = "breaststroke"
    butterfly         = "butterfly"
    individual_medley = "individual_medley"
    relay_freestyle   = "relay_freestyle"
    relay_medley      = "relay_medley"


class EventGender(str, enum.Enum):
    male   = "M"
    female = "F"
    mixed  = "mixed"


class EventStatus(str, enum.Enum):
    upcoming  = "upcoming"
    seeded    = "seeded"
    ongoing   = "ongoing"
    completed = "completed"


VALID_DISTANCES: dict[Stroke, list[int]] = {
    Stroke.freestyle:         [50, 100, 200, 400, 800, 1500],
    Stroke.backstroke:        [50, 100, 200],
    Stroke.breaststroke:      [50, 100, 200],
    Stroke.butterfly:         [50, 100, 200],
    Stroke.individual_medley: [100, 200, 400],
    Stroke.relay_freestyle:   [50, 100],
    Stroke.relay_medley:      [50, 100],
}


class SwimEvent(Base):
    __tablename__ = "swim_events"

    id           = Column(String, primary_key=True)
    meet_id      = Column(String, ForeignKey("meets.id"), nullable=False)
    event_number = Column(Integer, nullable=False)
    name         = Column(String(200), nullable=False)
    stroke       = Column(SAEnum(Stroke), nullable=False)
    distance     = Column(Integer, nullable=False)
    gender       = Column(SAEnum(EventGender), nullable=False)
    is_relay     = Column(Boolean, default=False)
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
    def total_distance(self):
        return self.distance * self.relay_legs
