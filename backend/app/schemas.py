"""
Pydantic schemas used for request validation and response serialization.
Keeping these separate from the SQLAlchemy models (models.py) lets us
expose a different shape to the API than what's stored in the DB.
"""
from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------
class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    sku: str = Field(..., min_length=1, max_length=100)
    price: Decimal = Field(..., gt=0, description="Unit price, must be greater than 0")
    quantity_in_stock: int = Field(..., ge=0, description="Cannot be negative")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    sku: Optional[str] = Field(None, min_length=1, max_length=100)
    price: Optional[Decimal] = Field(None, gt=0)
    quantity_in_stock: Optional[int] = Field(None, ge=0)


class ProductOut(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------
class CustomerBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    phone_number: str = Field(..., min_length=7, max_length=20)


class CustomerCreate(CustomerBase):
    pass


class CustomerOut(CustomerBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Order
# ---------------------------------------------------------------------------
class OrderItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)


class OrderCreate(BaseModel):
    customer_id: int
    items: List[OrderItemCreate] = Field(..., min_length=1)


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    model_config = ConfigDict(from_attributes=True)


class OrderOut(BaseModel):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    total_amount: Decimal
    status: str
    created_at: datetime
    items: List[OrderItemOut] = []

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------
class LowStockProduct(BaseModel):
    id: int
    name: str
    sku: str
    quantity_in_stock: int


class DashboardSummary(BaseModel):
    total_products: int
    total_customers: int
    total_orders: int
    low_stock_threshold: int
    low_stock_products: List[LowStockProduct]
