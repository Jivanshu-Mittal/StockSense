from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/locations", tags=["locations"])


@router.get("/", response_model=List[dict])
def list_locations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List all warehouse locations."""
    locations = db.query(models.WarehouseLocation).offset(skip).limit(limit).all()
    return [
        {
            "id": loc.id,
            "name": loc.name,
            "is_virtual": loc.is_virtual
        }
        for loc in locations
    ]


@router.get("/{location_id}", response_model=dict)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get a specific location by ID."""
    location = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return {
        "id": location.id,
        "name": location.name,
        "is_virtual": location.is_virtual
    }