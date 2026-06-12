"""
TimeResult model — the official result for an entry.
Supports both timed events (final_time_ms) and field events (attempt_marks).
DQ codes are sourced from the active SPORT config — no sport-specific codes here.

Common fields (identical across all sports):
  final_time_ms, splits_ms, dns, dnf, dq, dq_code, dq_description,
  rank, status, recorded_at, edited_at, finalized_at, notes

New field for field events:
  attempt_marks  — list of up to 6 mark values in centimetres (JSON)
"""
import enum
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.core.sport_config import format_performance, is_field_discipline

class ResultStatus(str, enum.Enum):
    draft     = "draft"
    saved     = "saved"
    finalized = "finalized"


class TimeResult(Base):
    """
    Result record for any sport event entry.

    For timed (track) events: final_time_ms holds the result.
    For field events (jumps/throws): attempt_marks holds up to 6 attempts (cm).
    The format_performance() property returns the correct display string.
    """
    __tablename__ = "time_results"

    id                  = Column(String, primary_key=True)
    individual_entry_id = Column(String, ForeignKey("individual_entries.id"), nullable=True)
    relay_entry_id      = Column(String, ForeignKey("relay_entries.id"), nullable=True)
    final_time_ms       = Column(Integer, nullable=True)      # milliseconds (track events)
    splits_ms           = Column(JSON, nullable=True)         # list of ints (track splits)
    attempt_marks       = Column(JSON, nullable=True)         # list of ints in cm (field events)
    dns                 = Column(Boolean, default=False)      # Did Not Start
    dnf                 = Column(Boolean, default=False)      # Did Not Finish
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
        if self.individual_entry and self.individual_entry.participant:
            return self.individual_entry.participant.name
        if self.individual_entry and self.individual_entry.swimmer:
            return self.individual_entry.swimmer.name
        if self.relay_entry and self.relay_entry.team:
            return self.relay_entry.team.name
        return "Unknown"

    def _discipline(self) -> str | None:
        """Best-effort discipline lookup from the linked event."""
        try:
            if self.individual_entry and self.individual_entry.event:
                return self.individual_entry.event.discipline
            if self.relay_entry and self.relay_entry.event:
                return self.relay_entry.event.discipline
        except Exception:
            pass
        return None

    def format_time(self) -> str:
        """Alias kept for backward compatibility with existing code."""
        return self.format_perf()

    def format_perf(self, sport_type: str | None = None) -> str:
        """Universal performance formatter — delegates to sport_config helper."""
        if self.dns:
            return "DNS"
        if self.dnf:
            return "DNF"
        if self.dq:
            return "DQ"
        disc = self._discipline()
        if not sport_type:
            try:
                if self.individual_entry and self.individual_entry.event and self.individual_entry.event.meet:
                    sport_type = self.individual_entry.event.meet.sport_type
                elif self.relay_entry and self.relay_entry.event and self.relay_entry.event.meet:
                    sport_type = self.relay_entry.event.meet.sport_type
            except Exception:
                pass
        sport_type = sport_type or "swimming"
        return format_performance(self.final_time_ms, disc, self.attempt_marks, sport_type=sport_type)

    @property
    def best_mark_cm(self) -> int | None:
        """For field events: the best valid attempt in centimetres."""
        marks = self.attempt_marks
        if not marks:
            return None
        valid = [m for m in marks if m and m > 0]
        return max(valid) if valid else None


# Keep 'Result' as alias for backward compat with simpler routers
Result = TimeResult
