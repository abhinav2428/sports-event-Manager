"""
EventAssignment — assigns a recorder to an event.
PDFReport — tracks generated PDF files.
Award — custom awards given at a meet.
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class EventAssignment(Base):
    """Assigns a recorder to an event (admin can assign recorders to events)."""
    __tablename__ = "event_assignments"

    id          = Column(String, primary_key=True)
    event_id    = Column(String, ForeignKey("swim_events.id"), nullable=False)
    recorder_id = Column(String, ForeignKey("users.id"), nullable=False)
    admin_id    = Column(String, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime, default=datetime.utcnow)

    event    = relationship("SwimEvent", back_populates="assignments")
    recorder = relationship("User", foreign_keys=[recorder_id])
    admin    = relationship("User", foreign_keys=[admin_id])


class PDFReport(Base):
    """Tracks generated PDF files."""
    __tablename__ = "pdf_reports"

    id          = Column(String, primary_key=True)
    meet_id     = Column(String, ForeignKey("meets.id"), nullable=False)
    file_path   = Column(String, nullable=False)
    report_type = Column(String(50))   # "heat_sheet" or "results"
    created_at  = Column(DateTime, default=datetime.utcnow)


class Award(Base):
    """Custom award given to a swimmer at a meet."""
    __tablename__ = "awards"

    id         = Column(String, primary_key=True)
    meet_id    = Column(String, ForeignKey("meets.id"), nullable=False)
    swimmer_id = Column(String, ForeignKey("swimmers.id"), nullable=True)
    title      = Column(String(200), nullable=False)
    description= Column(String(500))

    swimmer = relationship("Swimmer")
