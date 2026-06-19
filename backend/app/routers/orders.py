from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from .. import models, schemas
from ..database import get_db

router = APIRouter(prefix="/orders", tags=["Orders"])


def _serialize_order(order: models.Order) -> schemas.OrderOut:
    return schemas.OrderOut(
        id=order.id,
        customer_id=order.customer_id,
        customer_name=order.customer.full_name if order.customer else None,
        total_amount=order.total_amount,
        status=order.status,
        created_at=order.created_at,
        items=[
            schemas.OrderItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=item.product.name if item.product else None,
                quantity=item.quantity,
                unit_price=item.unit_price,
                subtotal=item.subtotal,
            )
            for item in order.items
        ],
    )


def _order_query(db: Session):
    return db.query(models.Order).options(
        joinedload(models.Order.customer),
        joinedload(models.Order.items).joinedload(models.OrderItem.product),
    )


@router.post("/", response_model=schemas.OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(order_in: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Create a new order.

    Business rules enforced here:
      * The referenced customer must exist.
      * Every referenced product must exist and have enough stock.
      * Stock is reduced automatically for every line item.
      * The order total is calculated automatically by the backend
        (never trusted from the client).
    """
    customer = db.query(models.Customer).filter(models.Customer.id == order_in.customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    # Validate every line item up front so the whole order fails atomically
    # if any single product is missing or under-stocked.
    products_by_id = {}
    for item in order_in.items:
        if item.product_id in products_by_id:
            # Same product listed twice in one order — treat as cumulative demand.
            continue
        product = (
            db.query(models.Product)
            .filter(models.Product.id == item.product_id)
            .with_for_update()
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with id {item.product_id} not found",
            )
        products_by_id[item.product_id] = product

    # Aggregate requested quantity per product (in case of duplicate lines)
    requested_qty = {}
    for item in order_in.items:
        requested_qty[item.product_id] = requested_qty.get(item.product_id, 0) + item.quantity

    for product_id, qty in requested_qty.items():
        product = products_by_id[product_id]
        if product.quantity_in_stock < qty:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.name}' (SKU {product.sku}). "
                    f"Available: {product.quantity_in_stock}, requested: {qty}"
                ),
            )

    # All validations passed — create the order, its line items, and
    # decrement stock, all inside a single DB transaction.
    db_order = models.Order(customer_id=customer.id, total_amount=0, status="completed")
    db.add(db_order)
    db.flush()  # assigns db_order.id without ending the transaction

    total_amount = 0
    for item in order_in.items:
        product = products_by_id[item.product_id]
        subtotal = product.price * item.quantity
        total_amount += subtotal
        product.quantity_in_stock -= item.quantity

        db_item = models.OrderItem(
            order_id=db_order.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=product.price,
            subtotal=subtotal,
        )
        db.add(db_item)

    db_order.total_amount = total_amount
    db.commit()

    order = _order_query(db).filter(models.Order.id == db_order.id).first()
    return _serialize_order(order)


@router.get("/", response_model=List[schemas.OrderOut])
def list_orders(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    """Retrieve all orders, including their line items."""
    orders = _order_query(db).order_by(models.Order.id.desc()).offset(skip).limit(limit).all()
    return [_serialize_order(o) for o in orders]


@router.get("/{order_id}", response_model=schemas.OrderOut)
def get_order(order_id: int, db: Session = Depends(get_db)):
    """Retrieve full details for a single order."""
    order = _order_query(db).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _serialize_order(order)


@router.delete("/{order_id}", status_code=status.HTTP_200_OK)
def delete_order(order_id: int, db: Session = Depends(get_db)):
    """Cancel/delete an order and restock its items."""
    order = (
        db.query(models.Order)
        .options(joinedload(models.Order.items))
        .filter(models.Order.id == order_id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    for item in order.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if product:
            product.quantity_in_stock += item.quantity

    db.delete(order)
    db.commit()
    return {"detail": "Order cancelled and stock restored"}
