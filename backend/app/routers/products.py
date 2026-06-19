from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/products", tags=["Products"])


@router.post("/", response_model=schemas.ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    """Create a new product. SKU must be unique and stock cannot be negative."""
    existing = db.query(models.Product).filter(models.Product.sku == product.sku).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A product with SKU '{product.sku}' already exists",
        )

    db_product = models.Product(**product.model_dump())
    db.add(db_product)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product SKU must be unique")
    db.refresh(db_product)
    return db_product


@router.get("/", response_model=List[schemas.ProductOut])
def list_products(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    """Retrieve all products."""
    return (
        db.query(models.Product)
        .order_by(models.Product.id)
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Retrieve a single product by ID."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(product_id: int, payload: schemas.ProductUpdate, db: Session = Depends(get_db)):
    """Update product details. Re-validates SKU uniqueness if it changes."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)

    if "sku" in data and data["sku"] != product.sku:
        duplicate = db.query(models.Product).filter(models.Product.sku == data["sku"]).first()
        if duplicate:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product SKU must be unique")

    for field, value in data.items():
        setattr(product, field, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Product SKU must be unique")
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    in_use = (
        db.query(models.OrderItem).filter(models.OrderItem.product_id == product_id).first()
    )
    if in_use:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete a product that appears in existing orders",
        )

    db.delete(product)
    db.commit()
    return {"detail": "Product deleted successfully"}
