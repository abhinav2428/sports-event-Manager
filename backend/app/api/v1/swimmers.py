import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.swimmer import Swimmer, Team, TeamMembership
from app.models.user import User
from app.schemas.schemas import (
    SwimmerCreate, SwimmerOut,
    TeamCreate, TeamOut, TeamDetailOut, AddMemberRequest,
)

swimmers_router = APIRouter(prefix="/swimmers", tags=["Swimmers"])
teams_router    = APIRouter(prefix="/teams", tags=["Teams"])


# ── Swimmers ───────────────────────────────────────────────────

@swimmers_router.post("", response_model=SwimmerOut)
def create_swimmer(data: SwimmerCreate, db: Session = Depends(get_db),
                   _: User = Depends(require_admin)):
    if db.query(Swimmer).filter(Swimmer.roll_number == data.roll_number).first():
        raise HTTPException(400, "Roll number already exists")
    s = Swimmer(id=str(uuid.uuid4()), **data.model_dump())
    db.add(s); db.commit(); db.refresh(s)
    return s


@swimmers_router.get("", response_model=List[SwimmerOut])
def list_swimmers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Swimmer).order_by(Swimmer.name).all()


@swimmers_router.get("/{swimmer_id}", response_model=SwimmerOut)
def get_swimmer(swimmer_id: str, db: Session = Depends(get_db),
                _: User = Depends(get_current_user)):
    s = db.get(Swimmer, swimmer_id)
    if not s: raise HTTPException(404, "Swimmer not found")
    return s


@swimmers_router.delete("/{swimmer_id}", status_code=204)
def delete_swimmer(swimmer_id: str, db: Session = Depends(get_db),
                   _: User = Depends(require_admin)):
    s = db.get(Swimmer, swimmer_id)
    if not s: raise HTTPException(404, "Swimmer not found")
    db.delete(s); db.commit()


# ── Teams ──────────────────────────────────────────────────────

@teams_router.post("", response_model=TeamOut)
def create_team(data: TeamCreate, db: Session = Depends(get_db),
                _: User = Depends(require_admin)):
    t = Team(id=str(uuid.uuid4()), **data.model_dump())
    db.add(t); db.commit(); db.refresh(t)
    return t


@teams_router.get("", response_model=List[TeamOut])
def list_teams(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Team).order_by(Team.name).all()


@teams_router.get("/{team_id}", response_model=TeamDetailOut)
def get_team(team_id: str, db: Session = Depends(get_db),
             _: User = Depends(get_current_user)):
    t = db.get(Team, team_id)
    if not t: raise HTTPException(404, "Team not found")
    members = [SwimmerOut.model_validate(m.swimmer) for m in t.memberships]
    return TeamDetailOut(id=t.id, name=t.name, college=t.college,
                         gender=t.gender, members=members)


@teams_router.post("/{team_id}/members", status_code=201)
def add_member(team_id: str, data: AddMemberRequest,
               db: Session = Depends(get_db), _: User = Depends(require_admin)):
    if not db.get(Team, team_id):    raise HTTPException(404, "Team not found")
    if not db.get(Swimmer, data.swimmer_id): raise HTTPException(404, "Swimmer not found")
    existing = db.query(TeamMembership).filter_by(
        team_id=team_id, swimmer_id=data.swimmer_id).first()
    if existing: raise HTTPException(400, "Already a member")
    m = TeamMembership(id=str(uuid.uuid4()), team_id=team_id,
                       swimmer_id=data.swimmer_id, role=data.role)
    db.add(m); db.commit()
    return {"status": "added"}
