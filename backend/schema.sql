-- =============================================================================
-- Inventory & Order Management System — Database Schema
-- =============================================================================
-- This file is a manual reference matching backend/app/models.py exactly.
--
-- You do NOT have to run this yourself: the FastAPI app creates these same
-- tables automatically on startup (Base.metadata.create_all). This script
-- is provided so you can create the tables ahead of time in your own
-- PostgreSQL instance if you'd prefer to manage schema manually — running
-- the app afterwards is safe, it will simply detect the tables already exist.
--
-- Usage:
--   psql -U postgres -d inventory_db -f schema.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id            SERIAL PRIMARY KEY,
    full_name     VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL UNIQUE,
    phone_number  VARCHAR(20)  NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(255)   NOT NULL,
    sku                VARCHAR(100)   NOT NULL UNIQUE,
    price              NUMERIC(10,2)  NOT NULL CHECK (price >= 0),
    quantity_in_stock  INTEGER        NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
    created_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
    id            SERIAL PRIMARY KEY,
    customer_id   INTEGER       NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    total_amount  NUMERIC(10,2) NOT NULL DEFAULT 0,
    status        VARCHAR(20)   NOT NULL DEFAULT 'completed',
    created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Line items: lets a single order reference one or more products, each
-- with its own quantity and a snapshot of the unit price at order time.
CREATE TABLE IF NOT EXISTS order_items (
    id          SERIAL PRIMARY KEY,
    order_id    INTEGER       NOT NULL REFERENCES orders(id)   ON DELETE CASCADE,
    product_id  INTEGER       NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity    INTEGER       NOT NULL CHECK (quantity > 0),
    unit_price  NUMERIC(10,2) NOT NULL,
    subtotal    NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_sku        ON products(sku);
CREATE INDEX IF NOT EXISTS idx_customers_email      ON customers(email);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id   ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product  ON order_items(product_id);
