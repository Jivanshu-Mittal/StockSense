from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func
from datetime import datetime
import models
from database import get_db
from dependencies import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/kpis")
def get_dashboard_kpis(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Return key performance indicators for the dashboard."""
    # Total products in stock: Sum of quantities in physical warehouse locations
    total_products_in_stock = db.query(
        func.sum(models.StockQuant.quantity)
    ).join(
        models.WarehouseLocation,
        models.StockQuant.location_id == models.WarehouseLocation.id
    ).filter(
        models.WarehouseLocation.is_virtual == False
    ).scalar() or 0

    # Low stock count: Count of products where total stock <= min_stock_level
    # We'll compute total stock per product and then compare with min_stock_level
    # We'll do a subquery for total stock per product (only physical locations)
    stock_subq = db.query(
        models.StockQuant.product_id.label('product_id'),
        func.sum(models.StockQuant.quantity).label('total_stock')
    ).join(
        models.WarehouseLocation,
        models.StockQuant.location_id == models.WarehouseLocation.id
    ).filter(
        models.WarehouseLocation.is_virtual == False
    ).group_by(models.StockQuant.product_id).subquery()

    # Products with low stock (total stock <= min_stock_level and total stock > 0)
    # Note: We only count as low stock if there is some stock but it's at or below min level
    # Out-of-stock (total stock == 0) is not counted in low_stock_count per Excalidraw spec
    low_stock_count = db.query(models.Product)\
        .outerjoin(stock_subq, models.Product.id == stock_subq.c.product_id)\
        .filter(
            # Low stock: total_stock > 0 and total_stock <= min_stock_level
            and_(
                stock_subq.c.total_stock.isnot(None),
                stock_subq.c.total_stock > 0,
                stock_subq.c.total_stock <= models.Product.min_stock_level
            )
        )\
        .count()

    # Pending receipts: receipt movements not done or canceled
    pending_receipts = db.query(models.StockMovement)\
        .filter(
            models.StockMovement.document_type == models.DocType.RECEIPT,
            models.StockMovement.status.in_([
                models.MoveStatus.DRAFT,
                models.MoveStatus.WAITING,
                models.MoveStatus.READY
            ])
        )\
        .count()

    # Pending deliveries: delivery movements not done or canceled
    pending_deliveries = db.query(models.StockMovement)\
        .filter(
            models.StockMovement.document_type == models.DocType.DELIVERY,
            models.StockMovement.status.in_([
                models.MoveStatus.DRAFT,
                models.MoveStatus.WAITING,
                models.MoveStatus.READY
            ])
        )\
        .count()

    # Internal transfers scheduled: count of internal transfers not yet marked `done`
    internal_transfers_scheduled = db.query(models.StockMovement)\
        .filter(
            models.StockMovement.document_type == models.DocType.INTERNAL,
            models.StockMovement.status != models.MoveStatus.DONE,
            models.StockMovement.status != models.MoveStatus.CANCELED
        )\
        .count()

    return {
        "total_products_in_stock": int(total_products_in_stock),
        "low_stock_count": low_stock_count,
        "pending_receipts_count": pending_receipts,
        "pending_deliveries_count": pending_deliveries,
        "internal_transfers_scheduled": internal_transfers_scheduled
    }
