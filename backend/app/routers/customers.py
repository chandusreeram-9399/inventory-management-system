from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/customers", tags=["Customers"])


@router.post("/", response_model=schemas.CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    """Create a new customer. Email must be unique."""
    existing = db.query(models.Customer).filter(models.Customer.email == customer.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A customer with email '{customer.email}' already exists",
        )

    db_customer = models.Customer(**customer.model_dump())
    db.add(db_customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Customer email must be unique")
    db.refresh(db_customer)
    return db_customer


@router.get("/", response_model=List[schemas.CustomerOut])
def list_customers(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    """Retrieve all customers."""
    return (
        db.query(models.Customer)
        .order_by(models.Customer.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{customer_id}", response_model=schemas.CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    """Retrieve a single customer by ID."""
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_200_OK)
def delete_customer(customer_id: int, db: Session = Depends(get_db)):
    """Delete a customer."""
    customer = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    has_orders = db.query(models.Order).filter(models.Order.customer_id == customer_id).first()
    if has_orders:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a customer with existing orders",
        )

    db.delete(customer)
    db.commit()
    return {"detail": "Customer deleted successfully"}
