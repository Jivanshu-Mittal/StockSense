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

    # Subquery for total stock per product in physical locations
    stock_subq = db.query(
        models.StockQuant.product_id.label('product_id'),
        func.sum(models.StockQuant.quantity).label('total_stock')
    ).join(
        models.WarehouseLocation,
        models.StockQuant.location_id == models.WarehouseLocation.id
    ).filter(
        models.WarehouseLocation.is_virtual == False
    ).group_by(models.StockQuant.product_id).subquery()

    # Low stock or out of stock count:
    # - Out of stock: total_stock is NULL (no stock in physical locations) or 0
    # - Low stock: 0 < total_stock <= min_stock_level
    low_stock_out_of_stock_count = db.query(models.Product)\
        .outerjoin(stock_subq, models.Product.id == stock_subq.c.product_id)\
        .filter(
            or_(
                # Out of stock: total_stock is NULL or 0
                or_(
                    stock_subq.c.total_stock.is_(None),
                    stock_subq.c.total_stock == 0
                ),
                # Low stock: total_stock > 0 and total_stock <= min_stock_level
                and_(
                    stock_subq.c.total_stock.isnot(None),
                    stock_subq.c.total_stock > 0,
                    stock_subq.c.total_stock <= models.Product.min_stock_level
                )
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
    scheduled_internal_transfers_count = db.query(models.StockMovement)\
        .filter(
            models.StockMovement.document_type == models.DocType.INTERNAL,
            models.StockMovement.status != models.MoveStatus.DONE,
            models.StockMovement.status != models.MoveStatus.CANCELED
        )\
        .count()

    return {
        "total_products_in_stock": int(total_products_in_stock),
        "low_stock_out_of_stock_count": low_stock_out_of_stock_count,
        "pending_receipts_count": pending_receipts,
        "pending_deliveries_count": pending_deliveries,
        "scheduled_internal_transfers_count": scheduled_internal_transfers_count
    }
