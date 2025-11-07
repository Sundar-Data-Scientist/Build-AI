from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class SignUpRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=6)

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class SignUpResponse(BaseModel):
    message: str
    email: str

class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)

class UserPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    is_verified: bool

    class Config:
        from_attributes = True


class InvitationCreate(BaseModel):
    name: str
    email: EmailStr
    designation: str
    project_name: str | None = None

class InvitationPublic(BaseModel):
    id: int
    name: str
    email: EmailStr
    designation: str
    status: str
    project_name: str | None = None

    class Config:
        from_attributes = True

class AcceptInviteRequest(BaseModel):
    token: str


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    project_number: str | None = Field(None, max_length=100)
    professional_engineer: str | None = Field(None, max_length=255)
    general_contractor: str | None = Field(None, max_length=255)
    architect: str | None = Field(None, max_length=255)
    engineer: str | None = Field(None, max_length=255)
    fabricator: str | None = Field(None, max_length=255)
    design_calculation: str | None = Field(None, max_length=1000)
    contract_drawings: str | None = Field(None, max_length=1000)
    standards: str | None = Field(None, max_length=1000)
    detailer: str | None = Field(None, max_length=255)
    detailing_country: str | None = Field(None, max_length=255)
    geolocation: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=1000)


class ProjectUpdate(BaseModel):
    project_number: str | None = Field(None, max_length=100)
    professional_engineer: str | None = Field(None, max_length=255)
    general_contractor: str | None = Field(None, max_length=255)
    architect: str | None = Field(None, max_length=255)
    engineer: str | None = Field(None, max_length=255)
    fabricator: str | None = Field(None, max_length=255)
    design_calculation: str | None = Field(None, max_length=1000)
    contract_drawings: str | None = Field(None, max_length=1000)
    standards: str | None = Field(None, max_length=1000)
    detailer: str | None = Field(None, max_length=255)
    detailing_country: str | None = Field(None, max_length=255)
    geolocation: str | None = Field(None, max_length=255)
    description: str | None = Field(None, max_length=1000)


class ProjectPublic(BaseModel):
    id: int
    name: str
    project_number: str | None
    professional_engineer: str | None
    general_contractor: str | None
    architect: str | None
    engineer: str | None
    fabricator: str | None
    design_calculation: str | None
    contract_drawings: str | None
    standards: str | None
    detailer: str | None
    detailing_country: str | None
    geolocation: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimeEntryCreate(BaseModel):
    project_name: str
    user_email: str


class TimeEntryUpdate(BaseModel):
    end_time: datetime | None = None
    is_active: bool | None = None


class TimeEntryPublic(BaseModel):
    id: int
    project_name: str
    user_email: str
    start_time: datetime
    end_time: datetime | None
    duration_seconds: int | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TimeTrackingSummary(BaseModel):
    project_name: str
    total_hours: float
    active_session: TimeEntryPublic | None = None
    recent_entries: list[TimeEntryPublic] = []


class PDFExtractionResponse(BaseModel):
    job_name: str | None = None
    job_no: str | None = None
    professional_engineer_name: str | None = None
    general_contractor_name: str | None = None
    architect_name: str | None = None
    engineer_name: str | None = None
    fabricator_name: str | None = None
    design_calculation: str | None = None
    contract_drawings: str | None = None
    standards: str | None = None
    detailer: str | None = None
    detailing_country: str | None = None