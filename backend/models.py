import enum
import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

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


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)


# locations can be physical (shelf, warehouse) or virtual (vendor, customer)
class WarehouseLocation(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    is_virtual = Column(Boolean, default=False)


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, index=True)
    unit_of_measure = Column(String, default="Units")

    movements = relationship("StockMovement", back_populates="product")


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True)
    document_type = Column(Enum(DocType), nullable=False)
    status = Column(Enum(MoveStatus), default=MoveStatus.DRAFT)

    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    source_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    dest_location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)

    quantity = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    product = relationship("Product", back_populates="movements")
    source_location = relationship("WarehouseLocation", foreign_keys=[source_location_id])
    dest_location = relationship("WarehouseLocation", foreign_keys=[dest_location_id])
