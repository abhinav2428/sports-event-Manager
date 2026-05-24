"""
Meet model — top-level competition container.
"""
import enum
from sqlalchemy import Column, String, Date, Enum as SAEnum, ForeignKey, Integer
from sqlalchemy.orm import relationship
from app.core.database import Base


class MeetStatus(str, enum.Enum):
    draft       = "draft"
    published   = "published"
    in_progress = "in_progress"
    completed   = "completed"


class Meet(Base):
    __tablename__ = "meets"

    id               = Column(String, primary_key=True)
    name             = Column(String(300), nullable=False)
    venue            = Column(String(300))
    city             = Column(String(200))
    start_date       = Column(Date, nullable=False)
    end_date         = Column(Date)
    pool_length      = Column(Integer, default=25)
    lanes            = Column(Integer, default=8)
    status           = Column(SAEnum(MeetStatus), default=MeetStatus.draft)
    administrator_id = Column(String, ForeignKey("users.id"), nullable=False)

    administrator = relationship("Administrator", back_populates="meets",
                                 foreign_keys=[administrator_id])
    events = relationship("SwimEvent", back_populates="meet",
                          cascade="all, delete-orphan",
                          order_by="SwimEvent.event_number")
