import secrets
from datetime import timedelta, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

import models
import schemas
from core.config import settings
from core.security import create_access_token, get_password_hash, verify_password
from database import get_db

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=schemas.UserResponse)
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email already taken")

    new_user = models.User(email=user.email, hashed_password=get_password_hash(user.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Wrong email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/forgot-password")
def forgot_password(email: str, db: Session = Depends(get_db)):
    # Check if user exists
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # For security, don't reveal that user doesn't exist
        return {"message": "If the email exists, an OTP has been sent"}

    # Generate 6-digit OTP
    otp = f"{secrets.randbelow(1000000):06d}"

    # Set expiration to 10 minutes from now
    expires_at = datetime.utcnow() + timedelta(minutes=10)

    # Hash the OTP and store in user record
    user.otp_hash = get_password_hash(otp)
    user.otp_expires = expires_at
    db.commit()

    # In a real application, you would send the OTP via email
    # For now, we'll log it (in production, remove this!)
    print(f"OTP for {email}: {otp}")  # Remove in production!

    return {"message": "If the email exists, an OTP has been sent"}


@router.post("/reset-password-otp")
def reset_password_otp(
    email: str,
    otp: str,
    new_password: str,
    db: Session = Depends(get_db)
):
    # Find the user by email
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid email or OTP"
        )

    # Check if OTP hash and expiration exist and are valid
    if not user.otp_hash or not user.otp_expires or user.otp_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    # Verify the OTP
    if not verify_password(otp, user.otp_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP"
        )

    # Update user's password
    user.hashed_password = get_password_hash(new_password)
    # Clear OTP fields
    user.otp_hash = None
    user.otp_expires = None

    db.commit()

    return {"message": "Password reset successful"}