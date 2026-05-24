"""
All Pydantic v2 schemas — used by all routers.
Includes fields that operations.py expects (seed_time_ms, withdrawn, etc.)
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr


# ── Auth / User ────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_type: str
    user_id: str
    name: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    username: str
    password: str
    user_type: str


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    username: str
    user_type: str
    is_active: bool
    model_config = {"from_attributes": True}


# ── Swimmer ────────────────────────────────────────────────────

class SwimmerCreate(BaseModel):
    name: str
    roll_number: str
    dob: Optional[date] = None
    gender: str
    email: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None


class SwimmerOut(BaseModel):
    id: str
    name: str
    roll_number: str
    dob: Optional[date] = None
    gender: str
    email: Optional[str] = None
    phone: Optional[str] = None
    college: Optional[str] = None
    model_config = {"from_attributes": True}


# ── Team ───────────────────────────────────────────────────────

class TeamCreate(BaseModel):
    name: str
    college: Optional[str] = None
    gender: str


class TeamOut(BaseModel):
    id: str
    name: str
    college: Optional[str] = None
    gender: str
    model_config = {"from_attributes": True}


class TeamDetailOut(TeamOut):
    members: List[SwimmerOut] = []


class AddMemberRequest(BaseModel):
    swimmer_id: str
    role: str = "swimmer"


# ── Meet ───────────────────────────────────────────────────────

class MeetCreate(BaseModel):
    name: str
    venue: Optional[str] = None
    city: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    pool_length: int = 25
    lanes: int = 8


class MeetOut(BaseModel):
    id: str
    name: str
    venue: Optional[str] = None
    city: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    pool_length: int
    lanes: int
    status: str
    administrator_id: str
    model_config = {"from_attributes": True}


# ── Event ──────────────────────────────────────────────────────

class EventCreate(BaseModel):
    event_number: int
    name: str
    stroke: str
    distance: int
    gender: str
    is_relay: bool = False
    relay_legs: int = 1


class EventOut(BaseModel):
    id: str
    meet_id: str
    event_number: int
    name: str
    stroke: str
    distance: int
    gender: str
    is_relay: bool
    relay_legs: int
    status: str
    total_distance: Optional[int] = None
    model_config = {"from_attributes": True}


# ── Entries ────────────────────────────────────────────────────

class IndividualEntryCreate(BaseModel):
    swimmer_id: str
    seed_time_ms: Optional[int] = None   # milliseconds


class IndividualEntryOut(BaseModel):
    id: str
    event_id: str
    swimmer_id: str
    swimmer_name: Optional[str] = None
    college: Optional[str] = None
    gender: Optional[str] = None
    heat_id: Optional[str] = None
    heat_number: Optional[int] = None
    lane: Optional[int] = None
    seed_time_ms: Optional[int] = None
    seed_time_display: Optional[str] = None
    withdrawn: bool = False
    model_config = {"from_attributes": True}


class RelayEntryCreate(BaseModel):
    team_id: str
    seed_time_ms: Optional[int] = None


class RelayLegUpdate(BaseModel):
    leg_number: int
    swimmer_id: Optional[str] = None
    split_time_ms: Optional[int] = None


class RelayEntryOut(BaseModel):
    id: str
    event_id: str
    team_id: str
    team_name: Optional[str] = None
    heat_id: Optional[str] = None
    heat_number: Optional[int] = None
    lane: Optional[int] = None
    seed_time_ms: Optional[int] = None
    seed_time_display: Optional[str] = None
    withdrawn: bool = False
    legs: List[Any] = []
    model_config = {"from_attributes": True}


# ── Heats ──────────────────────────────────────────────────────

class HeatOut(BaseModel):
    id: str
    event_id: str
    heat_number: int
    scheduled_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Results ────────────────────────────────────────────────────

class ResultCreate(BaseModel):
    individual_entry_id: Optional[str] = None
    relay_entry_id: Optional[str] = None
    final_time_ms: Optional[int] = None
    splits_ms: Optional[List[int]] = None
    dns: bool = False
    dnf: bool = False
    dq: bool = False
    dq_code: Optional[str] = None
    dq_description: Optional[str] = None
    notes: Optional[str] = None


class ResultUpdate(BaseModel):
    final_time_ms: Optional[int] = None
    splits_ms: Optional[List[int]] = None
    dns: Optional[bool] = None
    dnf: Optional[bool] = None
    dq: Optional[bool] = None
    dq_code: Optional[str] = None
    dq_description: Optional[str] = None
    notes: Optional[str] = None


class ResultOut(BaseModel):
    id: str
    individual_entry_id: Optional[str] = None
    relay_entry_id: Optional[str] = None
    final_time_ms: Optional[int] = None
    time_display: Optional[str] = None
    splits_ms: Optional[List[int]] = None
    dns: bool = False
    dnf: bool = False
    dq: bool = False
    dq_code: Optional[str] = None
    dq_description: Optional[str] = None
    rank: Optional[int] = None
    status: str = "draft"
    recorded_at: Optional[datetime] = None
    edited_at: Optional[datetime] = None
    finalized_at: Optional[datetime] = None
    notes: Optional[str] = None
    participant_name: Optional[str] = None
    heat_number: Optional[int] = None
    lane: Optional[int] = None
    model_config = {"from_attributes": True}


# ── Assignments ────────────────────────────────────────────────

class AssignmentCreate(BaseModel):
    event_id: str
    recorder_id: str


class AssignmentOut(BaseModel):
    id: str
    event_id: str
    event_name: Optional[str] = None
    recorder_id: str
    recorder_name: Optional[str] = None
    admin_id: str
    assigned_at: Optional[datetime] = None
    model_config = {"from_attributes": True}


# ── Awards ─────────────────────────────────────────────────────

class AwardCreate(BaseModel):
    swimmer_id: Optional[str] = None
    title: str
    description: Optional[str] = None


class AwardOut(BaseModel):
    id: str
    meet_id: str
    swimmer_id: Optional[str] = None
    swimmer_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    model_config = {"from_attributes": True}
