import enum
import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy import event
from sqlalchemy.orm import Session

from database import Base


class DocType(str, enum.Enum):
    RECEIPT = "receipt"
    DELIVERY = "delivery"
    INTERNAL = "internal"
    ADJUSTMENT = "adjustment"


class MoveStatus(str, enum.Enum):
    DRAFT = "draft"
    WAITING = "waiting"
    READY = "ready"
    DONE = "done"
    CANCELED = "canceled"


class UserRole(str, enum.Enum):
    INVENTORY_MANAGER = "inventory_manager"
    WAREHOUSE_STAFF = "warehouse_staff"




class StockQuant(Base):
    __tablename__ = "stock_quants"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    quantity = Column(Float, nullable=False, default=0.0)

    # Ensure there's only one stock quant per product per location
    __table_args__ = (
        UniqueConstraint('product_id', 'location_id', name='_product_location_uc'),
    )

    product = relationship("Product", back_populates="stock_quants")
    location = relationship("WarehouseLocation", back_populates="stock_quants")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    otp_hash = Column(String, nullable=True)
    otp_expires = Column(DateTime, nullable=True)
    role = Column(Enum(UserRole), default=UserRole.WAREHOUSE_STAFF)
    is_active = Column(Boolean, default=True)


# locations can be physical (shelf, warehouse) or virtual (vendor, customer)
class WarehouseLocation(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    is_virtual = Column(Boolean, default=False)
    stock_quants = relationship("StockQuant", back_populates="location")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, index=True)
    unit_of_measure = Column(String, default="Units")
    per_unit_cost = Column(Float, default=0.0)
    min_stock_level = Column(Float, default=0.0)
    reorder_quantity = Column(Float, default=0.0)

    movements = relationship("StockMovement", back_populates="product")
    stock_quants = relationship("StockQuant", back_populates="product")

    @property
    def available_stock(self):
        total = 0.0
        for sq in self.stock_quants:
            if not sq.location.is_virtual:
                total += sq.quantity
        return total

    @property
    def is_low_stock(self):
        return self.available_stock <= self.min_stock_level


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    reference = Column(String, unique=True, index=True) # e.g., WH/IN/0001
    document_type = Column(Enum(DocType), nullable=False)
    status = Column(Enum(MoveStatus), default=MoveStatus.DRAFT)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    responsible_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    # Partner metadata for receipts and deliveries
    partner_name = Column(String, nullable=True)
    contact_email = Column(String, nullable=True)
    reference_code = Column(String, nullable=True)

    quantity = Column(Float, nullable=False)
    schedule_date = Column(DateTime, nullable=True)
    contact = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    # Flag to indicate if stock quant update has been applied
    stock_updated = Column(Boolean, default=False)

    product = relationship("Product", back_populates="movements")
    source_location = relationship("WarehouseLocation", foreign_keys=[source_location_id])
    dest_location = relationship("WarehouseLocation", foreign_keys=[dest_location_id])
    created_by = relationship("User", foreign_keys=[created_by_user_id])


@event.listens_for(StockMovement, 'after_insert')
@event.listens_for(StockMovement, 'after_update')
def update_stock_quant(mapper, connection, target):
    session = Session.object_session(target)
    if session is None:
        session = Session(bind=connection)

    # Only process if movement is done and stock has not been updated yet
    if target.status != MoveStatus.DONE or target.stock_updated:
        return

    # Determine the location changes based on document_type
    changes = []  # list of (location_id, delta)
    if target.document_type == DocType.RECEIPT:
        # Receipt: increase stock at dest_location_id (physical)
        if not target.dest_location_id:
            return
        dest_location = session.get(WarehouseLocation, target.dest_location_id)
        if dest_location and not dest_location.is_virtual:
            changes.append((target.dest_location_id, target.quantity))
    elif target.document_type == DocType.DELIVERY:
        # Delivery: decrease stock from source_location_id (physical)
        if not target.source_location_id:
            return
        source_location = session.get(WarehouseLocation, target.source_location_id)
        if source_location and not source_location.is_virtual:
            changes.append((target.source_location_id, -target.quantity))
    elif target.document_type == DocType.INTERNAL:
        # Internal transfer: decrease from source, increase to dest (both physical)
        if target.source_location_id:
            source_location = session.get(WarehouseLocation, target.source_location_id)
            if source_location and not source_location.is_virtual:
                changes.append((target.source_location_id, -target.quantity))
        if target.dest_location_id:
            dest_location = session.get(WarehouseLocation, target.dest_location_id)
            if dest_location and not dest_location.is_virtual:
                changes.append((target.dest_location_id, target.quantity))
    elif target.document_type == DocType.ADJUSTMENT:
        # Adjustment: adjust stock at source_location_id (physical) by quantity (can be positive or negative)
        # Note: In the adjustment endpoint, we set:
        #   source_location_id if quantity_difference < 0 (we are decreasing stock)
        #   dest_location_id if quantity_difference > 0 (we are increasing stock)
        # And the quantity in the movement is the absolute difference.
        if target.source_location_id:
            # Decreasing stock at source_location_id
            source_location = session.get(WarehouseLocation, target.source_location_id)
            if source_location and not source_location.is_virtual:
                changes.append((target.source_location_id, -target.quantity))
        if target.dest_location_id:
            # Increasing stock at dest_location_id
            dest_location = session.get(WarehouseLocation, target.dest_location_id)
            if dest_location and not dest_location.is_virtual:
                changes.append((target.dest_location_id, target.quantity))

    # Apply changes to StockQuant with row-level locking and check for sufficient stock
    for location_id, delta in changes:
        # Lock the StockQuant row for update
        stock_quant = session.query(StockQuant).filter_by(
            product_id=target.product_id,
            location_id=location_id
        ).with_for_update().first()

        if stock_quant is None:
            # Create new StockQuant if not exists
            stock_quant = StockQuant(
                product_id=target.product_id,
                location_id=location_id,
                quantity=0.0
            )
            session.add(stock_quant)

        # Check for sufficient stock if delta is negative (outgoing movement)
        if delta < 0 and stock_quant.quantity + delta < 0:
            raise ValueError(f"Insufficient stock at location {location_id} for product {target.product_id}")

        stock_quant.quantity += delta

    # Mark the movement as having its stock updated
    target.stock_updated = True
    session.add(target)