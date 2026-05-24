"""
Entry models — IndividualEntry and RelayEntry.
operations.py references: seed_time_ms, withdrawn, heat_id, lane, heat (relationship)
"""
import enum
from sqlalchemy import Column, String, Float, Boolean, ForeignKey, Enum as SAEnum, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base


class EntryStatus(str, enum.Enum):
    registered = "registered"
    scratched  = "scratched"
    seeded     = "seeded"


class IndividualEntry(Base):
    __tablename__ = "individual_entries"

    id          = Column(String, primary_key=True)
    event_id    = Column(String, ForeignKey("swim_events.id"), nullable=False)
    swimmer_id  = Column(String, ForeignKey("swimmers.id"), nullable=False)
    seed_time_ms= Column(Integer)      # milliseconds (operations.py uses _ms)
    heat_id     = Column(String, ForeignKey("heats.id"), nullable=True)
    lane        = Column(Integer, nullable=True)
    withdrawn   = Column(Boolean, default=False)
    status      = Column(SAEnum(EntryStatus), default=EntryStatus.registered)

    event   = relationship("SwimEvent", back_populates="individual_entries")
    swimmer = relationship("Swimmer", back_populates="individual_entries")
    heat    = relationship("Heat", foreign_keys=[heat_id])
    result  = relationship("TimeResult", back_populates="individual_entry", uselist=False)

    @property
    def seed_time(self):
        """Seconds float for compatibility."""
        return self.seed_time_ms / 1000.0 if self.seed_time_ms else None


class RelayEntry(Base):
    __tablename__ = "relay_entries"

    id          = Column(String, primary_key=True)
    event_id    = Column(String, ForeignKey("swim_events.id"), nullable=False)
    team_id     = Column(String, ForeignKey("teams.id"), nullable=False)
    seed_time_ms= Column(Integer)
    heat_id     = Column(String, ForeignKey("heats.id"), nullable=True)
    lane        = Column(Integer, nullable=True)
    withdrawn   = Column(Boolean, default=False)
    status      = Column(SAEnum(EntryStatus), default=EntryStatus.registered)

    event  = relationship("SwimEvent", back_populates="relay_entries")
    team   = relationship("Team")
    heat   = relationship("Heat", foreign_keys=[heat_id])
    legs   = relationship("RelayLeg", back_populates="relay_entry",
                          cascade="all, delete-orphan",
                          order_by="RelayLeg.leg_number")
    result = relationship("TimeResult", back_populates="relay_entry", uselist=False)

    @property
    def seed_time(self):
        return self.seed_time_ms / 1000.0 if self.seed_time_ms else None


class RelayLeg(Base):
    __tablename__ = "relay_legs"

    id             = Column(String, primary_key=True)
    relay_entry_id = Column(String, ForeignKey("relay_entries.id"), nullable=False)
    swimmer_id     = Column(String, ForeignKey("swimmers.id"), nullable=True)
    leg_number     = Column(Integer, nullable=False)   # 1,2,3,4
    split_time_ms  = Column(Integer, nullable=True)

    relay_entry = relationship("RelayEntry", back_populates="legs")
    swimmer     = relationship("Swimmer")
