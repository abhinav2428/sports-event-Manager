"""
User model — Administrator and Recorder via single-table inheritance.
"""
import enum
from sqlalchemy import Column, String, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserType(str, enum.Enum):
    administrator = "administrator"
    recorder = "recorder"


class User(Base):
    __tablename__ = "users"

    id            = Column(String, primary_key=True)
    name          = Column(String(200), nullable=False)
    email         = Column(String(200), unique=True, nullable=False)
    phone         = Column(String(20))
    username      = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    user_type     = Column(SAEnum(UserType), nullable=False)
    is_active     = Column(Boolean, default=True)

    __mapper_args__ = {
        "polymorphic_on": user_type,
        "polymorphic_identity": None,
    }

    def __repr__(self):
        return f"<User {self.username} ({self.user_type})>"


class Administrator(User):
    __mapper_args__ = {"polymorphic_identity": UserType.administrator}
    meets = relationship("Meet", back_populates="administrator",
                         foreign_keys="Meet.administrator_id")


class Recorder(User):
    __mapper_args__ = {"polymorphic_identity": UserType.recorder}
