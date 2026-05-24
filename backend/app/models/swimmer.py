"""
Swimmer, Team, TeamMembership models.
"""
import enum
from sqlalchemy import Column, String, Date, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Gender(str, enum.Enum):
    male   = "M"
    female = "F"


class MemberRole(str, enum.Enum):
    swimmer = "swimmer"
    captain = "captain"


class Swimmer(Base):
    __tablename__ = "swimmers"

    id          = Column(String, primary_key=True)
    name        = Column(String(200), nullable=False)
    roll_number = Column(String(50), unique=True, nullable=False)
    dob         = Column(Date)
    gender      = Column(SAEnum(Gender), nullable=False)
    email       = Column(String(200))
    phone       = Column(String(20))
    college     = Column(String(300))

    memberships        = relationship("TeamMembership", back_populates="swimmer")
    individual_entries = relationship("IndividualEntry", back_populates="swimmer")


class Team(Base):
    __tablename__ = "teams"

    id      = Column(String, primary_key=True)
    name    = Column(String(200), nullable=False)
    college = Column(String(300))
    gender  = Column(SAEnum(Gender), nullable=False)

    memberships = relationship("TeamMembership", back_populates="team",
                               cascade="all, delete-orphan")


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    id         = Column(String, primary_key=True)
    team_id    = Column(String, ForeignKey("teams.id"), nullable=False)
    swimmer_id = Column(String, ForeignKey("swimmers.id"), nullable=False)
    role       = Column(SAEnum(MemberRole), default=MemberRole.swimmer)

    team    = relationship("Team", back_populates="memberships")
    swimmer = relationship("Swimmer", back_populates="memberships")
