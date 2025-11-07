from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timezone
from .db import get_db
from .models import TimeEntry
from .schemas import TimeEntryCreate, TimeEntryUpdate, TimeEntryPublic, TimeTrackingSummary

router = APIRouter(prefix="/api/time-tracking", tags=["time-tracking"])


@router.post("", response_model=TimeEntryPublic)
def start_time_tracking(entry: TimeEntryCreate, db: Session = Depends(get_db)):
    """Start time tracking for a project"""
    # Stop any active sessions for this user
    active_entries = db.query(TimeEntry).filter(
        and_(
            TimeEntry.user_email == entry.user_email,
            TimeEntry.is_active == True
        )
    ).all()
    
    for active_entry in active_entries:
        active_entry.end_time = datetime.now(timezone.utc)
        active_entry.duration_seconds = int((active_entry.end_time - active_entry.start_time).total_seconds())
        active_entry.is_active = False
    
    # Create new time entry
    db_entry = TimeEntry(
        project_name=entry.project_name,
        user_email=entry.user_email,
        start_time=datetime.now(timezone.utc),
        is_active=True
    )
    
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    
    return db_entry


@router.put("/{entry_id}", response_model=TimeEntryPublic)
def stop_time_tracking(entry_id: int, db: Session = Depends(get_db)):
    """Stop time tracking for a specific entry"""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    if not entry.is_active:
        raise HTTPException(status_code=400, detail="Time entry is not active")
    
    entry.end_time = datetime.now(timezone.utc)
    entry.duration_seconds = int((entry.end_time - entry.start_time).total_seconds())
    entry.is_active = False
    
    db.commit()
    db.refresh(entry)
    
    return entry


@router.get("/active/{user_email}", response_model=TimeEntryPublic | None)
def get_active_time_entry(user_email: str, db: Session = Depends(get_db)):
    """Get the currently active time entry for a user"""
    active_entry = db.query(TimeEntry).filter(
        and_(
            TimeEntry.user_email == user_email,
            TimeEntry.is_active == True
        )
    ).first()
    
    return active_entry


@router.get("/project/{project_name}", response_model=list[TimeEntryPublic])
def get_project_time_entries(
    project_name: str, 
    user_email: str = Query(...),
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db)
):
    """Get time entries for a specific project and user"""
    entries = db.query(TimeEntry).filter(
        and_(
            TimeEntry.project_name == project_name,
            TimeEntry.user_email == user_email
        )
    ).order_by(TimeEntry.start_time.desc()).limit(limit).all()
    
    return entries


@router.get("/summary/{project_name}", response_model=TimeTrackingSummary)
def get_time_tracking_summary(
    project_name: str,
    user_email: str = Query(...),
    db: Session = Depends(get_db)
):
    """Get time tracking summary for a project"""
    # Get active session
    active_entry = db.query(TimeEntry).filter(
        and_(
            TimeEntry.project_name == project_name,
            TimeEntry.user_email == user_email,
            TimeEntry.is_active == True
        )
    ).first()
    
    # Get recent entries
    recent_entries = db.query(TimeEntry).filter(
        and_(
            TimeEntry.project_name == project_name,
            TimeEntry.user_email == user_email
        )
    ).order_by(TimeEntry.start_time.desc()).limit(10).all()
    
    # Calculate total hours
    total_seconds = db.query(func.sum(TimeEntry.duration_seconds)).filter(
        and_(
            TimeEntry.project_name == project_name,
            TimeEntry.user_email == user_email,
            TimeEntry.duration_seconds.isnot(None)
        )
    ).scalar() or 0
    
    total_hours = total_seconds / 3600
    
    return TimeTrackingSummary(
        project_name=project_name,
        total_hours=round(total_hours, 2),
        active_session=active_entry,
        recent_entries=recent_entries
    )


@router.delete("/{entry_id}")
def delete_time_entry(entry_id: int, db: Session = Depends(get_db)):
    """Delete a time entry"""
    entry = db.query(TimeEntry).filter(TimeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Time entry not found")
    
    db.delete(entry)
    db.commit()
    
    return {"message": "Time entry deleted successfully"}
