from fastapi import APIRouter, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc
from passlib.context import CryptContext
import secrets
import os
import smtplib
from email.message import EmailMessage
from dotenv import load_dotenv
from datetime import datetime, timedelta, timezone
import random

from .db import get_db, engine, Base
from .models import User, Invitation, OTP
from .schemas import SignUpRequest, SignInRequest, UserPublic, InvitationCreate, InvitationPublic, AcceptInviteRequest, SignUpResponse, VerifyOTPRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Ensure tables exist (simple for now). Importing here ensures all models are registered.
from . import models  # noqa: F401
Base.metadata.create_all(bind=engine)

# Load env for SMTP
load_dotenv()
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER or "noreply@example.com")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")

def send_invite_email(to_email: str, name: str, token: str):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print("[invite-email] SMTP not configured; skipping send")
        return
    accept_link = f"{APP_URL}/#/accept?token={token}"
    msg = EmailMessage()
    msg["Subject"] = "You're invited to Kriscon Workspace"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        f"Hello {name or 'there'},\n\n"
        f"You've been invited to join the workspace.\n"
        f"Accept: {accept_link}\n"
    )
    msg.add_alternative(f"""
      <div style='font-family:Arial,sans-serif'>
        <p>Hello {name or 'there'},</p>
        <p>You've been invited to join the workspace.</p>
        <p>
          <a href="{accept_link}" style="display:inline-block;padding:10px 16px;background:#6d28d9;color:#fff;border-radius:8px;text-decoration:none">Accept Invitation</a>
        </p>
        <p>If the button doesn't work, copy this link:<br/>{accept_link}</p>
      </div>
    """, subtype='html')
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)

def send_otp_email(to_email: str, name: str, otp_code: str):
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        print("[otp-email] SMTP not configured; skipping send")
        return
    msg = EmailMessage()
    msg["Subject"] = "Verify Your Email - Kriscon"
    msg["From"] = SMTP_FROM
    msg["To"] = to_email
    msg.set_content(
        f"Hello {name or 'there'},\n\n"
        f"Your OTP verification code is: {otp_code}\n"
        f"This code will expire in 10 minutes.\n\n"
        f"If you didn't create an account, please ignore this email.\n"
    )
    msg.add_alternative(f"""
      <div style='font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px'>
        <h2 style='color:#111827;margin-bottom:20px'>Verify Your Email</h2>
        <p>Hello {name or 'there'},</p>
        <p>Thank you for signing up! Please use the following OTP code to verify your email address:</p>
        <div style='background:#f3f4f6;padding:20px;border-radius:8px;text-align:center;margin:20px 0'>
          <h1 style='color:#6d28d9;font-size:32px;letter-spacing:4px;margin:0'>{otp_code}</h1>
        </div>
        <p style='color:#6b7280;font-size:14px'>This code will expire in 10 minutes.</p>
        <p style='color:#6b7280;font-size:14px'>If you didn't create an account, please ignore this email.</p>
      </div>
    """, subtype='html')
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
    except Exception as e:
        print(f"[otp-email] failed: {e}")

# Allowed email domains for sign up
ALLOWED_EMAIL_DOMAINS = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'protonmail.com']

@router.post("/signup", response_model=SignUpResponse)
def signup(payload: SignUpRequest, db: Session = Depends(get_db)):
    # Validate email domain
    email_domain = payload.email.split('@')[1].lower() if '@' in payload.email else ''
    if email_domain not in ALLOWED_EMAIL_DOMAINS:
        raise HTTPException(
            status_code=400, 
            detail=f"Only the following email domains are allowed: {', '.join(ALLOWED_EMAIL_DOMAINS)}"
        )
    
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    password_hash = pwd_context.hash(payload.password)
    user = User(name=payload.name, email=payload.email, password_hash=password_hash, is_verified=False)
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate 6-digit OTP
    otp_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Delete any existing OTPs for this email
    db.query(OTP).filter(OTP.email == payload.email).delete()
    
    # Create new OTP
    otp = OTP(email=payload.email, otp_code=otp_code, expires_at=expires_at)
    db.add(otp)
    db.commit()
    
    # Send OTP email
    try:
        send_otp_email(payload.email, payload.name, otp_code)
    except Exception as e:
        print(f"[otp-email] failed: {e}")
    
    return SignUpResponse(message="Account created. Please check your email for OTP verification code.", email=payload.email)

@router.post("/verify-otp", response_model=UserPublic)
def verify_otp(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    # Find the OTP
    otp = db.query(OTP).filter(
        OTP.email == payload.email,
        OTP.otp_code == payload.otp
    ).order_by(desc(OTP.created_at)).first()
    
    if not otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Check if OTP has expired
    now = datetime.now(timezone.utc)
    expires_at = otp.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if now > expires_at:
        db.delete(otp)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired")
    
    # Find and verify the user
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Mark user as verified
    user.is_verified = True
    db.delete(otp)  # Delete used OTP
    db.commit()
    db.refresh(user)
    
    return user

@router.post("/signin", response_model=UserPublic)
def signin(payload: SignInRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not pwd_context.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Please verify your email address before signing in")
    return user


@router.post("/invite", response_model=InvitationPublic)
def invite(payload: InvitationCreate, db: Session = Depends(get_db)):
    token = secrets.token_urlsafe(24)
    inv = Invitation(name=payload.name, email=payload.email, designation=payload.designation, token=token, status="pending", project_name=payload.project_name)
    db.add(inv)
    db.commit()
    db.refresh(inv)
    # Attempt to send email; do not fail the request if SMTP is not configured
    try:
        send_invite_email(inv.email, inv.name, inv.token)
    except Exception as e:
        print(f"[invite-email] failed: {e}")
    return inv

@router.post("/invite/accept", response_model=InvitationPublic)
def accept_invite(payload: AcceptInviteRequest, db: Session = Depends(get_db)):
    inv = db.query(Invitation).filter(Invitation.token == payload.token).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Invalid token")
    inv.status = "accepted"
    db.commit()
    db.refresh(inv)
    return inv

@router.get("/invite", response_model=list[InvitationPublic])
def list_invites(db: Session = Depends(get_db)):
    return db.query(Invitation).order_by(desc(Invitation.created_at)).all()


