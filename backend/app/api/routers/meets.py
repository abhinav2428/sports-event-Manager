import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.api.deps import require_admin, get_current_user
from app.models.meet import Meet, MeetStatus
from app.models.user import User, UserType
from app.schemas.schemas import MeetCreate, MeetOut, MeetDetailOut

router = APIRouter(prefix="/meets", tags=["Meets"])


@router.post("", response_model=MeetOut)
def create_meet(data: MeetCreate, db: Session = Depends(get_db),
                current_user: User = Depends(require_admin)):
    meet = Meet(
        id=str(uuid.uuid4()),
        administrator_id=current_user.id,
        **data.model_dump(),
    )
    db.add(meet); db.commit(); db.refresh(meet)
    return meet


@router.get("", response_model=List[MeetOut])
def list_meets(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Meet).order_by(Meet.start_date.desc()).all()


@router.get("/{meet_id}", response_model=MeetDetailOut)
def get_meet(meet_id: str, db: Session = Depends(get_db),
             _: User = Depends(get_current_user)):
    meet = db.get(Meet, meet_id)
    if not meet: raise HTTPException(404, "Meet not found")
    return meet


@router.patch("/{meet_id}/status", response_model=MeetOut)
def update_status(meet_id: str, status: MeetStatus,
                  db: Session = Depends(get_db), _: User = Depends(require_admin)):
    meet = db.get(Meet, meet_id)
    if not meet: raise HTTPException(404, "Meet not found")
    meet.status = status
    db.commit(); db.refresh(meet)
    return meet


@router.delete("/{meet_id}", status_code=204)
def delete_meet(meet_id: str, db: Session = Depends(get_db),
                _: User = Depends(require_admin)):
    meet = db.get(Meet, meet_id)
    if not meet: raise HTTPException(404, "Meet not found")
    db.delete(meet); db.commit()
