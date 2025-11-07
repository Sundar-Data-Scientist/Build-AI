import os
import shutil
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from .db import get_db
from .models import UploadedFile


router = APIRouter(prefix="/api/uploads", tags=["uploads"])


def _ensure_upload_dir() -> str:
    base_dir = os.path.dirname(__file__)
    upload_dir = os.path.join(base_dir, "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir


def _safe_filename(original_name: str) -> str:
    name, ext = os.path.splitext(original_name)
    safe_name = "".join(c for c in name if c.isalnum() or c in ("-", "_"))[:80]
    timestamp = datetime.utcnow().strftime("%Y%m%dT%H%M%S%f")
    return f"{safe_name or 'file'}_{timestamp}{ext}"


@router.post("")
async def upload_files(
    files: List[UploadFile] = File(...),
    stage: int = Query(..., ge=1, le=11),
    dpId: Optional[int] = Query(None),
    projectName: Optional[str] = Query(None),
    userEmail: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    upload_dir = _ensure_upload_dir()
    saved_files = []

    for file in files:
        safe_name = _safe_filename(file.filename or "file")
        destination_path = os.path.join(upload_dir, safe_name)
        with open(destination_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        size = os.path.getsize(destination_path)
        record = UploadedFile(
            original_name=file.filename or safe_name,
            stored_name=safe_name,
            size=size,
            stage=stage,
            dp_id=dpId,
            project_name=projectName,
            user_email=userEmail,
        )
        db.add(record)
        saved_files.append({
            "originalName": record.original_name,
            "storedName": record.stored_name,
            "size": record.size,
        })
    db.commit()

    return {"count": len(saved_files), "files": saved_files}


@router.get("")
def list_files(stage: int = Query(..., ge=1, le=11), dpId: Optional[int] = Query(None), projectName: Optional[str] = Query(None), db: Session = Depends(get_db)):
    q = db.query(UploadedFile).filter(UploadedFile.stage == stage)
    if dpId is not None:
        q = q.filter(UploadedFile.dp_id == dpId)
    if projectName:
        q = q.filter(UploadedFile.project_name == projectName)
    items = q.order_by(UploadedFile.created_at.desc()).all()
    return [
        {
            "id": it.id,
            "originalName": it.original_name,
            "storedName": it.stored_name,
            "size": it.size,
            "dpId": getattr(it, "dp_id", None),
            "createdAt": it.created_at.isoformat() if hasattr(it.created_at, 'isoformat') else str(it.created_at),
        }
        for it in items
    ]


@router.get("/{file_id}/download")
def download_file(file_id: int, db: Session = Depends(get_db)):
    record = db.query(UploadedFile).filter(UploadedFile.id == file_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="File not found")
    upload_dir = _ensure_upload_dir()
    path = os.path.join(upload_dir, record.stored_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Stored file missing")
    return FileResponse(path, filename=record.original_name)


