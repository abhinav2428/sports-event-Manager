"""
Meet model — top-level competition container.
Sport-agnostic: venue config (was pool_length/course) comes from SPORT config.
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
    """
    Top-level container for any sport meet.

    Common fields (shared across all sports):
      id, name, venue, city, start_date, end_date, lanes, status, administrator_id

    Sport-agnostic renaming:
      venue_config  (was pool_length / CourseType — now stores Surface or Course string)
    """
    __tablename__ = "meets"

    id               = Column(String, primary_key=True)
    name             = Column(String(300), nullable=False)
    venue            = Column(String(300))
    city             = Column(String(200))
    start_date       = Column(Date, nullable=False)
    end_date         = Column(Date)
    sport_type       = Column(String(50), nullable=False, default="swimming")
    # venue_config: stores "SCM"/"SCY"/"LCM" for swimming, "Synthetic"/"Grass"/"Indoor" for T&F
    venue_config     = Column(String(50))
    lanes            = Column(Integer)
    status           = Column(SAEnum(MeetStatus), default=MeetStatus.draft)
    administrator_id = Column(String, ForeignKey("users.id"), nullable=False)

    administrator = relationship("Administrator", back_populates="meets",
                                 foreign_keys=[administrator_id])
    events = relationship("SportEvent", back_populates="meet",
                          cascade="all, delete-orphan",
                          order_by="SportEvent.event_number")
