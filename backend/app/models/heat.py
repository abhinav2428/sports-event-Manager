from sqlalchemy import Column, String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Heat(Base):
    __tablename__ = "heats"

    id           = Column(String, primary_key=True)
    event_id     = Column(String, ForeignKey("sport_events.id"), nullable=False)
    heat_number  = Column(Integer, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)

    event       = relationship("SportEvent", back_populates="heats")
