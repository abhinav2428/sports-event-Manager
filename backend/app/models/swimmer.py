"""
Participant model — sport-agnostic.
In swimming this is a Swimmer; in Track & Field this is an Athlete.
The class is named Athlete but registered under __tablename__ = "swimmers"
so the existing DB table is reused without migration.

Common fields (identical across all sports):
  id, name, roll_number, dob, gender, email, phone, college
"""
import enum
from sqlalchemy import Column, String, Date, Enum as SAEnum, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Gender(str, enum.Enum):
    male   = "M"
    female = "F"


class MemberRole(str, enum.Enum):
    member  = "member"    # generic — replaces swimmer/captain
    captain = "captain"
    swimmer = "swimmer"   # backward-compat value


class Athlete(Base):
    """
    A participant in any sport meet.
    Table name kept as 'swimmers' for backward DB compatibility.
    Python alias 'Swimmer = Athlete' keeps all existing code working.
    """
    __tablename__ = "swimmers"

    id          = Column(String, primary_key=True)
    name        = Column(String(200), nullable=False)
    roll_number = Column(String(50), unique=True, nullable=False)
    dob         = Column(Date)
    gender      = Column(SAEnum(Gender), nullable=False)
    email       = Column(String(200))
    phone       = Column(String(20))
    college     = Column(String(300))

    memberships        = relationship("TeamMembership", back_populates="athlete")
    individual_entries = relationship("IndividualEntry", back_populates="swimmer",
                                     foreign_keys="[IndividualEntry.swimmer_id]")




# Backward-compat alias
Swimmer = Athlete


class Team(Base):
    __tablename__ = "teams"

    id      = Column(String, primary_key=True)
    name    = Column(String(200), nullable=False)
    college = Column(String(300))
    gender  = Column(SAEnum(Gender), nullable=True)

    memberships = relationship("TeamMembership", back_populates="team",
                               cascade="all, delete-orphan")


class TeamMembership(Base):
    __tablename__ = "team_memberships"

    id         = Column(String, primary_key=True)
    team_id    = Column(String, ForeignKey("teams.id"), nullable=False)
    # Column is named swimmer_id in DB for backward compat; accessed as athlete_id in Python
    swimmer_id = Column(String, ForeignKey("swimmers.id"), nullable=False)
    role       = Column(SAEnum(MemberRole), default=MemberRole.member)

    team    = relationship("Team", back_populates="memberships")
    athlete = relationship("Athlete", back_populates="memberships",
                          foreign_keys=[swimmer_id])

    @property
    def athlete_id(self) -> str:
        return self.swimmer_id
