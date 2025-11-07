from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from .db import get_db
from .models import Project
from .schemas import ProjectCreate, ProjectUpdate, ProjectPublic

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("", response_model=ProjectPublic)
def create_project(project: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project with setup information"""
    # Check if project with same name already exists
    existing_project = db.query(Project).filter(Project.name == project.name).first()
    if existing_project:
        raise HTTPException(status_code=400, detail="Project with this name already exists")
    
    db_project = Project(
        name=project.name,
        project_number=project.project_number,
        professional_engineer=project.professional_engineer,
        general_contractor=project.general_contractor,
        architect=project.architect,
        engineer=project.engineer,
        fabricator=project.fabricator,
        design_calculation=project.design_calculation,
        contract_drawings=project.contract_drawings,
        standards=project.standards,
        detailer=project.detailer,
        detailing_country=project.detailing_country,
        geolocation=project.geolocation,
        description=project.description
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


@router.get("/{project_name}", response_model=ProjectPublic)
def get_project(project_name: str, db: Session = Depends(get_db)):
    """Get project details by name"""
    project = db.query(Project).filter(Project.name == project_name).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project


@router.put("/{project_name}", response_model=ProjectPublic)
def update_project(project_name: str, project_update: ProjectUpdate, db: Session = Depends(get_db)):
    """Update project setup information"""
    project = db.query(Project).filter(Project.name == project_name).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update only provided fields
    update_data = project_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    db.commit()
    db.refresh(project)
    
    return project


@router.get("", response_model=list[ProjectPublic])
def list_projects(db: Session = Depends(get_db)):
    """List all projects"""
    projects = db.query(Project).all()
    return projects


@router.delete("/{project_name}")
def delete_project(project_name: str, db: Session = Depends(get_db)):
    """Delete a project"""
    project = db.query(Project).filter(Project.name == project_name).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    
    return {"message": "Project deleted successfully"}
