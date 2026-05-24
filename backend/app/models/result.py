"""
TimeResult model — the official result for an entry.
operations.py references: TimeResult, ResultStatus, DQ_CODES,
  final_time_ms, splits_ms, dns, dnf, dq, dq_code, dq_description,
  rank, status, recorded_at, edited_at, finalized_at, notes,
  participant_name, format_time(), individual_entry_id, relay_entry_id
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class ResultStatus(str, enum.Enum):
    draft     = "draft"
    saved     = "saved"
    finalized = "finalized"


# Standard FINA/NCAA DQ codes
DQ_CODES: dict[str, str] = {
    "SW 4.4":  "False start",
    "SW 5.3":  "Did not finish",
    "SW 6.5":  "Freestyle — illegal kick / stroke",
    "SW 7.1":  "Backstroke — not on back at finish",
    "SW 8.2":  "Breaststroke — illegal kick",
    "SW 9.3":  "Butterfly — illegal arm recovery",
    "SW 10.2": "IM — stroke order incorrect",
    "SW 11.3": "Relay — early take-off",
}


class TimeResult(Base):
    __tablename__ = "time_results"

    id                  = Column(String, primary_key=True)
    individual_entry_id = Column(String, ForeignKey("individual_entries.id"), nullable=True)
    relay_entry_id      = Column(String, ForeignKey("relay_entries.id"), nullable=True)
    final_time_ms       = Column(Integer, nullable=True)   # milliseconds
    splits_ms           = Column(JSON, nullable=True)      # list of ints
    dns                 = Column(Boolean, default=False)   # Did Not Start
    dnf                 = Column(Boolean, default=False)   # Did Not Finish
    dq                  = Column(Boolean, default=False)
    dq_code             = Column(String(20), nullable=True)
    dq_description      = Column(String(500), nullable=True)
    rank                = Column(Integer, nullable=True)
    status              = Column(SAEnum(ResultStatus), default=ResultStatus.draft)
    recorded_at         = Column(DateTime, default=datetime.utcnow)
    edited_at           = Column(DateTime, nullable=True)
    finalized_at        = Column(DateTime, nullable=True)
    recorded_by         = Column(String, ForeignKey("users.id"), nullable=True)
    notes               = Column(String(500), nullable=True)

    individual_entry = relationship("IndividualEntry", back_populates="result")
    relay_entry      = relationship("RelayEntry", back_populates="result")
    recorder         = relationship("User", foreign_keys=[recorded_by])

    @property
    def participant_name(self) -> str:
        if self.individual_entry and self.individual_entry.swimmer:
            return self.individual_entry.swimmer.name
        if self.relay_entry and self.relay_entry.team:
            return self.relay_entry.team.name
        return "Unknown"

    def format_time(self) -> str:
        """Format final_time_ms as mm:ss.hh or ss.hh."""
        if self.dns: return "DNS"
        if self.dnf: return "DNF"
        if self.dq:  return "DQ"
        if not self.final_time_ms: return "NT"
        total_s = self.final_time_ms / 1000.0
        mins = int(total_s // 60)
        secs = total_s % 60
        return f"{mins}:{secs:05.2f}" if mins else f"{secs:.2f}"


# Keep 'Result' as alias for backward compat with simpler routers
Result = TimeResult
