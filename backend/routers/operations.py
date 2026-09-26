from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/operations", tags=["operations"])


@router.get("/movements", response_model=List[schemas.StockMovementResponse])
def list_movements(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.StockMovement).offset(skip).limit(limit).all()


@router.post("/movements", response_model=schemas.StockMovementResponse)
def record_movement(payload: schemas.StockMovementCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not db.query(models.Product).filter(models.Product.id == payload.product_id).first():
        raise HTTPException(status_code=404, detail="Product not found")

    # auto-validate for now, we can add a confirm step later if needed
    move = models.StockMovement(
        document_type=payload.document_type,
        product_id=payload.product_id,
        quantity=payload.quantity,
        source_location_id=payload.source_location_id,
        dest_location_id=payload.dest_location_id,
        status=models.MoveStatus.DONE
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return move
