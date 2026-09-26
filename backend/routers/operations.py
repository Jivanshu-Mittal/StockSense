from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from dependencies import get_current_user, get_inventory_manager_user, get_warehouse_staff_user

router = APIRouter(prefix="/operations", tags=["operations"])


def generate_reference(db: Session, doc_type: models.DocType) -> str:
    """Generate a unique reference string for a document type."""
    prefix_map = {
        models.DocType.RECEIPT: "WH/IN",
        models.DocType.DELIVERY: "WH/OUT",
        models.DocType.INTERNAL: "WH/INT",
        models.DocType.ADJUSTMENT: "WH/ADJ",
    }
    prefix = prefix_map[doc_type]
    # Find the last reference with this prefix
    last_move = db.query(models.StockMovement)\
        .filter(models.StockMovement.reference.like(f"{prefix}/%"))\
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
    return f"{prefix}/{new_num:04d}"


@router.get("/movements", response_model=List[schemas.StockMovementResponse])
def list_movements(
    skip: int = 0,
    limit: int = 100,
    document_type: Optional[models.DocType] = Query(None),
    status: Optional[models.MoveStatus] = Query(None),
    location_id: Optional[int] = Query(None, description="Filter by source or destination location"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    product_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None, description="Filter by product category"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Ledger move history with dynamic filtering."""
    query = db.query(models.StockMovement)

    if document_type:
        query = query.filter(models.StockMovement.document_type == document_type)
    if status:
        query = query.filter(models.StockMovement.status == status)
    if location_id:
        query = query.filter(
            (models.StockMovement.source_location_id == location_id) |
            (models.StockMovement.dest_location_id == location_id)
        )
    if start_date:
        query = query.filter(models.StockMovement.created_at >= start_date)
    if end_date:
        query = query.filter(models.StockMovement.created_at <= end_date)
    if product_id:
        query = query.filter(models.StockMovement.product_id == product_id)
    if category:
        query = query.join(models.Product).filter(models.Product.category == category)

    return query.offset(skip).limit(limit).all()


@router.post("/movements", response_model=schemas.StockMovementResponse)
def record_movement(
    payload: schemas.StockMovementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generic movement recording (kept for backward compatibility)."""
    if not db.query(models.Product).filter(models.Product.id == payload.product_id).first():
        raise HTTPException(status_code=404, detail="Product not found")

    move = models.StockMovement(
        document_type=payload.document_type,
        status=models.MoveStatus.DONE,  # Immediate completion for generic endpoint
        product_id=payload.product_id,
        quantity=payload.quantity,
        source_location_id=payload.source_location_id,
        dest_location_id=payload.dest_location_id,
        partner_name=payload.partner_name,
        contact_email=payload.contact_email,
        reference_code=payload.reference_code,
        schedule_date=payload.schedule_date,
        contact=payload.contact,
        responsible_id=current_user.id,
        reference=generate_reference(db, payload.document_type)
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return move


@router.post("/receipts", response_model=schemas.StockMovementResponse)
def create_receipt(
    payload: schemas.ReceiptCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_inventory_manager_user)
):
    """Create incoming stock from vendor with validation."""
    # Validate product exists
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate destination location exists and is physical
    dest_location = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == payload.dest_location_id).first()
    if not dest_location:
        raise HTTPException(status_code=404, detail="Destination location not found")
    if dest_location.is_virtual:
        raise HTTPException(status_code=400, detail="Destination location must be physical for receipts")

    # Generate reference
    ref = generate_reference(db, models.DocType.RECEIPT)

    # Create movement
    move = models.StockMovement(
        document_type=models.DocType.RECEIPT,
        status=models.MoveStatus.DONE,  # Receipts are completed immediately
        reference=ref,
        product_id=payload.product_id,
        quantity=payload.quantity,
        partner_name=payload.partner_name,
        contact_email=payload.contact_email,
        reference_code=payload.reference_code,
        schedule_date=payload.schedule_date,
        dest_location_id=payload.dest_location_id,
        responsible_id=current_user.id
        # source_location_id is left as NULL (virtual vendor)
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return move


@router.post("/receipts/{receipt_id}/validate", response_model=schemas.StockMovementResponse)
def validate_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_inventory_manager_user)
):
    """Validate a receipt: ensure it is ready and destination location is physical."""
    # Get the receipt movement
    receipt = db.query(models.StockMovement).filter(models.StockMovement.id == receipt_id).first()
    if not receipt:
        raise HTTPException(status_code=404, detail="Receipt not found")
    if receipt.document_type != models.DocType.RECEIPT:
        raise HTTPException(status_code=400, detail="Not a receipt document")
    if receipt.status != models.MoveStatus.DONE:
        raise HTTPException(status_code=400, detail=f"Receipt must be in DONE status to validate, got {receipt.status}")

    # Validate destination location exists and is physical
    dest_location = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == receipt.dest_location_id).first()
    if not dest_location:
        raise HTTPException(status_code=404, detail="Destination location not found")
    if dest_location.is_virtual:
        raise HTTPException(status_code=400, detail="Destination location must be physical for receipts")

    # Note: Stock quant update is handled by the event listener after the movement is created.
    # We do not need to update stock here.

    db.commit()
    db.refresh(receipt)
    return receipt


@router.post("/deliveries", response_model=schemas.StockMovementResponse)
def create_delivery(
    payload: schemas.DeliveryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_warehouse_staff_user)
):
    """Create a delivery in DRAFT status to start the multi-step flow."""
    # Validate product exists
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate source location exists and is physical
    source_location = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == payload.source_location_id).first()
    if not source_location:
        raise HTTPException(status_code=404, detail="Source location not found")
    if source_location.is_virtual:
        raise HTTPException(status_code=400, detail="Source location must be physical for deliveries")

    # Generate reference
    ref = generate_reference(db, models.DocType.DELIVERY)

    # Create movement in DRAFT status
    move = models.StockMovement(
        document_type=models.DocType.DELIVERY,
        status=models.MoveStatus.DRAFT,
        reference=ref,
        product_id=payload.product_id,
        quantity=payload.quantity,
        partner_name=payload.partner_name,
        contact_email=payload.contact_email,
        reference_code=payload.reference_code,
        schedule_date=payload.schedule_date,
        source_location_id=payload.source_location_id,
        responsible_id=current_user.id
        # dest_location_id is left as NULL (virtual customer)
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return move


# Status transition endpoints for deliveries
@router.post("/deliveries/{delivery_id}/waiting", response_model=schemas.StockMovementResponse)
def delivery_to_waiting(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_warehouse_staff_user)
):
    """Transition delivery from DRAFT to WAITING."""
    move = db.query(models.StockMovement).filter(models.StockMovement.id == delivery_id).first()
    if not move:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if move.document_type != models.DocType.DELIVERY:
        raise HTTPException(status_code=400, detail="Not a delivery document")
    if move.status != models.MoveStatus.DRAFT:
        raise HTTPException(status_code=400, detail=f"Cannot transition from {move.status} to waiting")

    # TODO: Add picking validation here
    # For now, we allow the transition

    move.status = models.MoveStatus.WAITING
    db.commit()
    db.refresh(move)
    return move


@router.post("/deliveries/{delivery_id}/ready", response_model=schemas.StockMovementResponse)
def delivery_to_ready(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_warehouse_staff_user)
):
    """Transition delivery from WAITING to READY."""
    move = db.query(models.StockMovement).filter(models.StockMovement.id == delivery_id).first()
    if not move:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if move.document_type != models.DocType.DELIVERY:
        raise HTTPException(status_code=400, detail="Not a delivery document")
    if move.status != models.MoveStatus.WAITING:
        raise HTTPException(status_code=400, detail=f"Cannot transition from {move.status} to ready")

    # TODO: Add packing validation here
    # For now, we allow the transition

    move.status = models.MoveStatus.READY
    db.commit()
    db.refresh(move)
    return move


@router.post("/deliveries/{delivery_id}/done", response_model=schemas.StockMovementResponse)
def delivery_to_done(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_warehouse_staff_user)
):
    """Transition delivery from READY to DONE."""
    move = db.query(models.StockMovement).filter(models.StockMovement.id == delivery_id).first()
    if not move:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if move.document_type != models.DocType.DELIVERY:
        raise HTTPException(status_code=400, detail="Not a delivery document")
    if move.status != models.MoveStatus.READY:
        raise HTTPException(status_code=400, detail=f"Cannot transition from {move.status} to done")

    # Check sufficient stock at source location (with lock to prevent race condition)
    source_location_id = move.source_location_id
    if not source_location_id:
        raise HTTPException(status_code=400, detail="Delivery has no source location")

    source_location = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == source_location_id).first()
    if not source_location:
        raise HTTPException(status_code=404, detail="Source location not found")
    if source_location.is_virtual:
        raise HTTPException(status_code=400, detail="Source location must be physical for deliveries")

    # Lock and check stock
    stock_quant = db.query(models.StockQuant).filter(
        models.StockQuant.product_id == move.product_id,
        models.StockQuant.location_id == source_location_id
    ).with_for_update().first()

    if not stock_quant:
        raise HTTPException(status_code=400, detail="Insufficient stock: no stock record found")
    if stock_quant.quantity < move.quantity:
        raise HTTPException(status_code=400, detail=f"Insufficient stock: available {stock_quant.quantity}, needed {move.quantity}")

    # Note: Stock quant update will be handled by the event listener after status update.
    # We do not update stock here.

    move.status = models.MoveStatus.DONE
    db.commit()
    db.refresh(move)
    return move


@router.post("/deliveries/{delivery_id}/canceled", response_model=schemas.StockMovementResponse)
def delivery_to_canceled(
    delivery_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_warehouse_staff_user)
):
    """Cancel a delivery (can be done from DRAFT, WAITING, or READY)."""
    move = db.query(models.StockMovement).filter(models.StockMovement.id == delivery_id).first()
    if not move:
        raise HTTPException(status_code=404, detail="Delivery not found")
    if move.document_type != models.DocType.DELIVERY:
        raise HTTPException(status_code=400, detail="Not a delivery document")
    if move.status == models.MoveStatus.DONE:
        raise HTTPException(status_code=400, detail="Cannot cancel a completed delivery")
    if move.status == models.MoveStatus.CANCELED:
        raise HTTPException(status_code=400, detail="Delivery already canceled")

    move.status = models.MoveStatus.CANCELED
    db.commit()
    db.refresh(move)
    return move


@router.post("/transfers", response_model=schemas.StockMovementResponse)
def create_transfer(
    payload: schemas.TransferCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_inventory_manager_user)
):
    """Internal movement logging across warehouse locations."""
    # Validate product exists
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Validate source and destination locations exist
    source_loc = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == payload.source_location_id).first()
    dest_loc = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == payload.dest_location_id).first()
    if not source_loc:
        raise HTTPException(status_code=404, detail="Source location not found")
    if not dest_loc:
        raise HTTPException(status_code=404, detail="Destination location not found")
    if payload.source_location_id == payload.dest_location_id:
        raise HTTPException(status_code=400, detail="Source and destination locations must be different")
    # Ensure both locations are physical
    if source_loc.is_virtual:
        raise HTTPException(status_code=400, detail="Source location must be physical for transfers")
    if dest_loc.is_virtual:
        raise HTTPException(status_code=400, detail="Destination location must be physical for transfers")

    # Generate reference
    ref = generate_reference(db, models.DocType.INTERNAL)

    # Create movement
    move = models.StockMovement(
        document_type=models.DocType.INTERNAL,
        status=models.MoveStatus.DONE,  # Transfers are completed immediately
        reference=ref,
        product_id=payload.product_id,
        quantity=payload.quantity,
        source_location_id=payload.source_location_id,
        dest_location_id=payload.dest_location_id,
        schedule_date=payload.schedule_date,
        responsible_id=current_user.id
    )
    db.add(move)
    db.commit()
    db.refresh(move)
    return move


@router.post("/adjustments", response_model=schemas.StockMovementResponse)
def create_adjustment_reconciliation(
    payload: schemas.AdjustmentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_inventory_manager_user)
):
    """
    Compare physical count with recorded StockQuant, apply difference, and create a ledger record.
    For reconciliation, exactly one of source_location_id or dest_location_id should be set.
    """
    # Validate product exists
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # For reconciliation, we need exactly one location specified
    if not payload.source_location_id and not payload.dest_location_id:
        raise HTTPException(status_code=400, detail="Either source_location_id or dest_location_id must be set for reconciliation")
    if payload.source_location_id and payload.dest_location_id:
        raise HTTPException(status_code=400, detail="Only one of source_location_id or dest_location_id should be set for reconciliation")

    # Determine which location we're adjusting
    location_id = payload.source_location_id if payload.source_location_id else payload.dest_location_id

    # Validate location exists and is physical
    location = db.query(models.WarehouseLocation).filter(models.WarehouseLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    if location.is_virtual:
        raise HTTPException(status_code=400, detail="Location must be physical for adjustments")

    # Get current stock for the product at this location
    stock_quant = db.query(models.StockQuant).filter(
        models.StockQuant.product_id == payload.product_id,
        models.StockQuant.location_id == location_id
    ).first()
    current_stock = stock_quant.quantity if stock_quant else 0.0

    # Calculate the difference: physical count - recorded stock
    quantity_difference = payload.quantity - current_stock

    # If no difference, still create a movement record for audit trail with zero quantity
    if quantity_difference == 0:
        move = models.StockMovement(
            document_type=models.DocType.ADJUSTMENT,
            status=models.MoveStatus.DONE,
            reference=generate_reference(db, models.DocType.ADJUSTMENT),
            product_id=payload.product_id,
            quantity=0.0,
            source_location_id=None,
            dest_location_id=None,
            responsible_id=current_user.id
        )
        db.add(move)
        try:
            db.commit()
            db.refresh(move)
        except ValueError as e:
            db.rollback()
            raise HTTPException(status_code=400, detail=str(e))
        return move

    # Check for sufficient stock if we are decreasing stock
    if quantity_difference < 0:
        if current_stock < abs(quantity_difference):
            raise HTTPException(status_code=400, detail="Insufficient stock for adjustment")

    # Generate reference
    ref = generate_reference(db, models.DocType.ADJUSTMENT)

    # Create movement record
    move = models.StockMovement(
        document_type=models.DocType.ADJUSTMENT,
        status=models.MoveStatus.DONE,  # Adjustments are completed immediately
        reference=ref,
        product_id=payload.product_id,
        quantity=abs(quantity_difference),  # Store positive quantity
        source_location_id=location_id if quantity_difference < 0 else None,
        dest_location_id=location_id if quantity_difference > 0 else None,
        responsible_id=current_user.id
    )
    db.add(move)
    try:
        db.commit()
        db.refresh(move)
    except ValueError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return move


# Note: The validation endpoints for transfers and adjustments are not required as they are completed immediately.