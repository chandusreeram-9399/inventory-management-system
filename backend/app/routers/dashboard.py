import os

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

LOW_STOCK_THRESHOLD = int(os.getenv("LOW_STOCK_THRESHOLD", 10))


@router.get("/summary", response_model=schemas.DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    """Aggregate counts and low-stock products for the frontend dashboard."""
    total_products = db.query(models.Product).count()
    total_customers = db.query(models.Customer).count()
    total_orders = db.query(models.Order).count()

    low_stock = (
        db.query(models.Product)
        .filter(models.Product.quantity_in_stock <= LOW_STOCK_THRESHOLD)
        .order_by(models.Product.quantity_in_stock.asc())
        .all()
    )

    return schemas.DashboardSummary(
        total_products=total_products,
        total_customers=total_customers,
        total_orders=total_orders,
        low_stock_threshold=LOW_STOCK_THRESHOLD,
        low_stock_products=[
            schemas.LowStockProduct(
                id=p.id, name=p.name, sku=p.sku, quantity_in_stock=p.quantity_in_stock
            )
            for p in low_stock
        ],
    )
