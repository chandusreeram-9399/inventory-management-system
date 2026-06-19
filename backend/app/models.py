"""
SQLAlchemy ORM models — these are the source of truth for the database
schema. They are auto-created on application startup via
Base.metadata.create_all() (see main.py), so a fresh PostgreSQL database
needs no manual setup.

If you would rather create the tables yourself first, an equivalent hand
written DDL script is provided at backend/schema.sql — running the app
afterwards is safe either way because create_all() only creates tables
that do not already exist.
"""
from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    sku = Column(String(100), unique=True, nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    quantity_in_stock = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    order_items = relationship("OrderItem", back_populates="product")

    __table_args__ = (
        CheckConstraint("quantity_in_stock >= 0", name="ck_product_quantity_non_negative"),
        CheckConstraint("price >= 0", name="ck_product_price_non_negative"),
    )


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    phone_number = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    orders = relationship("Order", back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(
        Integer, ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False
    )
    total_amount = Column(Numeric(10, 2), nullable=False, default=0)
    status = Column(String(20), nullable=False, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    customer = relationship("Customer", back_populates="orders")
    items = relationship(
        "OrderItem", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItem(Base):
    """Line item linking an Order to one or more Products (with quantity)."""

    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(
        Integer, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    product_id = Column(
        Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False
    )
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)  # price snapshot at order time
    subtotal = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_order_item_quantity_positive"),
    )
