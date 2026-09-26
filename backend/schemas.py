from typing import Optional
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


class StockMovementResponse(StockMovementCreate):
    id: int
    status: MoveStatus
    created_at: datetime

    class Config:
        from_attributes = True
