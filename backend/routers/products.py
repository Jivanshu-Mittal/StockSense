from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/products", tags=["products"])


def _calc_total_stock(db: Session, product_id: int) -> float:
    """Calculate total stock across all locations for a product."""
    total = db.query(models.StockQuant).filter(
        models.StockQuant.product_id == product_id
    ).with_entities(models.StockQuant.quantity).all()
    return sum(q.quantity for q in total) if total else 0.0


def _get_stock_by_location(db: Session, product_id: int) -> List[dict]:
    """Get stock breakdown by location for a product."""
    quants = db.query(models.StockQuant, models.WarehouseLocation)\
        .join(models.WarehouseLocation, models.StockQuant.location_id == models.WarehouseLocation.id)\
        .filter(models.StockQuant.product_id == product_id)\
        .all()

    breakdown = []
    for quant, location in quants:
        breakdown.append({
            "location_id": location.id,
            "location_name": location.name,
            "quantity": quant.quantity
        })
    return breakdown


@router.get("/", response_model=List[schemas.ProductListResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    search: Optional[str] = Query(None, description="Search by SKU"),
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """List products with optional search and stock breakdown by location."""
    query = db.query(models.Product)

    if search:
        query = query.filter(models.Product.sku.ilike(f"%{search}%"))
    if category:
        query = query.filter(models.Product.category == category)

    products = query.offset(skip).limit(limit).all()

    result = []
    for product in products:
        total_stock = _calc_total_stock(db, product.id)
        stock_breakdown = _get_stock_by_location(db, product.id)

        product_dict = {
            "id": product.id,
            "name": product.name,
            "sku": product.sku,
            "category": product.category,
            "unit_of_measure": product.unit_of_measure,
            "current_stock": total_stock,
            "stock_by_location": stock_breakdown
        }
        result.append(product_dict)

    return result


@router.post("/", response_model=schemas.ProductResponse)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
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
        # Find the first physical location for the initial stock
        location = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.is_virtual == False).first()
        if not location:
            raise HTTPException(status_code=404, detail="No physical location found for initial stock")

        # Generate a reference for the initial stock receipt (WH/IN/####)
        last_move = db.query(models.StockMovement)\
            .filter(models.StockMovement.reference.like(f"WH/IN/%"))\
            .order_by(models.StockMovement.id.desc())\
            .first()
        if last_move:
            try:
                last_num = int(last_move.reference.split('/')[-1])
            except (ValueError, IndexError):
                last_num = 0
            new_num = last_num + 1
        else:
            new_num = 1
        ref = f"WH/IN/{new_num:04d}"

        # Create the receipt movement
        move = models.StockMovement(
            document_type=models.DocType.RECEIPT,
            status=models.MoveStatus.DONE,
            reference=ref,
            product_id=p.id,
            quantity=payload.initial_stock,
            dest_location_id=location.id,
            # source_location_id is left as NULL (virtual vendor)
        )
        db.add(move)
        db.commit()
        db.refresh(move)

    data = p.__dict__.copy()
    data["current_stock"] = payload.initial_stock
    return data


@router.get("/categories", response_model=List[str])
def get_categories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get distinct product categories."""
    categories = db.query(models.Product.category).distinct().all()
    return [cat[0] for cat in categories if cat[0] is not None]