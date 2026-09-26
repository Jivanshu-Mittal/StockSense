from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/products", tags=["products"])


def _calc_stock(db: Session, product_id: int) -> float:
    """add up all completed movements to get current qty"""
    moves = db.query(models.StockMovement).filter(
        models.StockMovement.product_id == product_id,
        models.StockMovement.status == models.MoveStatus.DONE
    ).all()

    qty = 0.0
    for m in moves:
        if m.document_type == models.DocType.RECEIPT:
            qty += m.quantity
        elif m.document_type == models.DocType.DELIVERY:
            qty -= m.quantity
        elif m.document_type == models.DocType.ADJUSTMENT:
            qty += m.quantity
        # internal transfers don't affect total qty
    return qty


@router.get("/", response_model=List[schemas.ProductResponse])
def list_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    result = []
    for p in products:
        data = p.__dict__.copy()
        data["current_stock"] = _calc_stock(db, p.id)
        result.append(data)
    return result


@router.post("/", response_model=schemas.ProductResponse)
def create_product(payload: schemas.ProductCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if db.query(models.Product).filter(models.Product.sku == payload.sku).first():
        raise HTTPException(status_code=400, detail="SKU already exists")

    p = models.Product(
        name=payload.name,
        sku=payload.sku,
        category=payload.category,
        unit_of_measure=payload.unit_of_measure
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    # kick off the opening stock as a receipt movement
    if payload.initial_stock > 0:
        db.add(models.StockMovement(
            document_type=models.DocType.RECEIPT,
            status=models.MoveStatus.DONE,
            product_id=p.id,
            quantity=payload.initial_stock
        ))
        db.commit()

    data = p.__dict__.copy()
    data["current_stock"] = payload.initial_stock
    return data
