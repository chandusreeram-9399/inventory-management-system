"""
Functional tests exercising the API end-to-end against an in-memory
SQLite database (see conftest.py). These cover the business rules called
out in the assessment brief: unique SKU/email, non-negative stock,
insufficient-stock rejection, automatic stock reduction, and automatic
total calculation.

Run with:
    pytest -v
"""


def test_create_and_list_product(client):
    resp = client.post(
        "/products/",
        json={"name": "Wireless Mouse", "sku": "WM-001", "price": "19.99", "quantity_in_stock": 50},
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["sku"] == "WM-001"
    assert body["quantity_in_stock"] == 50

    resp = client.get("/products/")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_duplicate_sku_rejected(client):
    payload = {"name": "Keyboard", "sku": "KB-001", "price": "29.99", "quantity_in_stock": 10}
    first = client.post("/products/", json=payload)
    assert first.status_code == 201

    second = client.post("/products/", json=payload)
    assert second.status_code == 409


def test_negative_stock_rejected(client):
    resp = client.post(
        "/products/",
        json={"name": "Monitor", "sku": "MN-001", "price": "199.99", "quantity_in_stock": -5},
    )
    assert resp.status_code == 422


def test_duplicate_customer_email_rejected(client):
    payload = {"full_name": "Jane Doe", "email": "jane@example.com", "phone_number": "555-1234"}
    first = client.post("/customers/", json=payload)
    assert first.status_code == 201

    second = client.post("/customers/", json=payload)
    assert second.status_code == 409


def test_order_reduces_stock_and_computes_total(client):
    product = client.post(
        "/products/",
        json={"name": "USB Cable", "sku": "USB-001", "price": "9.50", "quantity_in_stock": 100},
    ).json()
    customer = client.post(
        "/customers/",
        json={"full_name": "Alice Smith", "email": "alice@example.com", "phone_number": "555-9999"},
    ).json()

    order_resp = client.post(
        "/orders/",
        json={"customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 4}]},
    )
    assert order_resp.status_code == 201
    order = order_resp.json()
    assert float(order["total_amount"]) == 38.00  # 9.50 * 4, computed server-side
    assert order["items"][0]["quantity"] == 4

    updated_product = client.get(f"/products/{product['id']}").json()
    assert updated_product["quantity_in_stock"] == 96  # 100 - 4


def test_order_rejected_when_stock_insufficient(client):
    product = client.post(
        "/products/",
        json={"name": "Rare Part", "sku": "RP-001", "price": "500.00", "quantity_in_stock": 2},
    ).json()
    customer = client.post(
        "/customers/",
        json={"full_name": "Bob Lee", "email": "bob@example.com", "phone_number": "555-0000"},
    ).json()

    resp = client.post(
        "/orders/",
        json={"customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 5}]},
    )
    assert resp.status_code == 400
    assert "Insufficient stock" in resp.json()["detail"]

    # Stock must remain untouched after a rejected order
    unchanged = client.get(f"/products/{product['id']}").json()
    assert unchanged["quantity_in_stock"] == 2


def test_order_cancel_restocks_items(client):
    product = client.post(
        "/products/",
        json={"name": "Notebook", "sku": "NB-001", "price": "5.00", "quantity_in_stock": 20},
    ).json()
    customer = client.post(
        "/customers/",
        json={"full_name": "Cara White", "email": "cara@example.com", "phone_number": "555-1111"},
    ).json()

    order = client.post(
        "/orders/",
        json={"customer_id": customer["id"], "items": [{"product_id": product["id"], "quantity": 6}]},
    ).json()

    after_order = client.get(f"/products/{product['id']}").json()
    assert after_order["quantity_in_stock"] == 14

    cancel = client.delete(f"/orders/{order['id']}")
    assert cancel.status_code == 200

    after_cancel = client.get(f"/products/{product['id']}").json()
    assert after_cancel["quantity_in_stock"] == 20


def test_dashboard_summary(client):
    client.post(
        "/products/",
        json={"name": "Low Stock Item", "sku": "LS-001", "price": "1.00", "quantity_in_stock": 3},
    )
    resp = client.get("/dashboard/summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_products"] == 1
    assert len(body["low_stock_products"]) == 1
    assert body["low_stock_products"][0]["sku"] == "LS-001"
