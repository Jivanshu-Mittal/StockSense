from typing import Optional, List
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from models import DocType, MoveStatus


class Token(BaseModel):
    access_token: str
    token_type: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    is_active: bool

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    sku: str
    category: str
    unit_of_measure: str = "Units"


class ProductCreate(ProductBase):
    initial_stock: float = 0.0


class ProductResponse(ProductBase):
    id: int
    current_stock: float = 0.0

    class Config:
        from_attributes = True


class StockMovementCreate(BaseModel):
    document_type: DocType
    product_id: int
    quantity: float
    source_location_id: Optional[int] = None
    dest_location_id: Optional[int] = None
    partner_name: Optional[str] = None
    contact_email: Optional[str] = None
    reference_code: Optional[str] = None


class StockMovementResponse(StockMovementCreate):
    id: int
    status: MoveStatus
    created_at: datetime


class ReceiptCreate(BaseModel):
    product_id: int
    quantity: float
    partner_name: str
    contact_email: str
    reference_code: str
    schedule_date: Optional[datetime] = None
    dest_location_id: int  # Physical warehouse where stock is received


class DeliveryCreate(BaseModel):
    product_id: int
    quantity: float
    partner_name: str
    contact_email: str
    reference_code: str
    schedule_date: Optional[datetime] = None
    source_location_id: int  # Physical warehouse from which stock is shipped


class TransferCreate(BaseModel):
    product_id: int
    quantity: float
    source_location_id: int
    dest_location_id: int
    schedule_date: Optional[datetime] = None


class AdjustmentCreate(BaseModel):
    product_id: int
    quantity: float  # positive for increase, negative for decrease
    source_location_id: Optional[int] = None  # location to adjust from (if decreasing)
    dest_location_id: Optional[int] = None    # location to adjust to (if increasing)
    # For adjustments, one of source_location_id or dest_location_id should be None/virtual

    class Config:
        from_attributes = True


class ProductStockBreakdown(BaseModel):
    location_id: int
    location_name: str
    quantity: float


class ProductListResponse(BaseModel):
    id: int
    name: str
    sku: str
    category: str
    unit_of_measure: str
    current_stock: float
    stock_by_location: List[ProductStockBreakdown]

    class Config:
        from_attributes = True