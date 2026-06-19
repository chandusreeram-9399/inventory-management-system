# Stocklane — Inventory & Order Management System

A full-stack inventory and order management system built for the technical
assessment: **FastAPI** (Python) backend, **React** (Vite, JavaScript)
frontend, **PostgreSQL** database, fully containerized with **Docker** /
**Docker Compose**.

```
inventory-management-system/
├── backend/          FastAPI app, SQLAlchemy models, Pydantic schemas, tests
├── frontend/          React (Vite) app
├── docker-compose.yml Orchestrates db + backend + frontend
└── .env.example       Compose-level environment variables
```

---

## 1. Run it locally with Docker Compose (recommended)

This brings up PostgreSQL, the API, and the frontend together.

```bash
cp .env.example .env
# edit .env if you want to change credentials/ports — defaults work out of the box

docker-compose up --build
```

- Frontend: http://localhost:8080
- Backend API: http://localhost:8000 (docs at http://localhost:8000/docs)
- Postgres: localhost:5432 (data persisted in the named volume `inventory_postgres_data`)

The backend automatically creates all tables on startup via
SQLAlchemy's `Base.metadata.create_all()` — no manual migration step is
needed for Compose to work. `backend/schema.sql` is also provided (see
section 3) if you'd rather create the tables yourself.

To stop: `docker-compose down` (add `-v` to also delete the Postgres volume).

---

## 2. Run it locally without Docker

**Backend**

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # point DATABASE_URL at your local Postgres
uvicorn app.main:app --reload --port 8000
```

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_URL=http://localhost:8000
npm run dev
```

**Tests**

```bash
cd backend
pip install -r requirements.txt pytest
python3 -m pytest tests/ -v
```

The test suite runs against an in-memory SQLite database, so it needs no
Postgres connection.

---

## 3. Database schema

The app auto-creates tables on startup (`backend/app/main.py` →
`Base.metadata.create_all(bind=engine)`), defined in
`backend/app/models.py`. If you'd prefer to create the tables yourself in
PostgreSQL ahead of time, `backend/schema.sql` contains the equivalent
hand-written DDL — it stays in sync with `models.py`. Run it with:

```bash
psql -U postgres -d inventory_db -f backend/schema.sql
```

Either path produces the same four tables: `customers`, `products`,
`orders`, `order_items` (the join table that lets one order contain
multiple products).

---

## 4. API reference

Base path: `/`. Interactive docs auto-generated at `/docs` (Swagger) and
`/redoc`.

| Method | Path                  | Description                                  |
|--------|-----------------------|-----------------------------------------------|
| POST   | `/products`            | Create a product (`name`, `sku`, `price`, `quantity_in_stock`) |
| GET    | `/products`            | List all products                            |
| GET    | `/products/{id}`       | Get one product                              |
| PUT    | `/products/{id}`       | Update a product                             |
| DELETE | `/products/{id}`       | Delete a product (blocked if used in an order)|
| POST   | `/customers`            | Create a customer (`full_name`, `email`, `phone_number`) |
| GET    | `/customers`            | List all customers                           |
| GET    | `/customers/{id}`       | Get one customer                             |
| DELETE | `/customers/{id}`       | Delete a customer (blocked if they have orders)|
| POST   | `/orders`               | Create an order (`customer_id`, `items: [{product_id, quantity}]`) |
| GET    | `/orders`               | List all orders                              |
| GET    | `/orders/{id}`          | Get one order with line items                |
| DELETE | `/orders/{id}`          | Cancel an order and restock its items         |
| GET    | `/dashboard/summary`    | Totals + low-stock product list               |
| GET    | `/health`               | Health check (used by Docker healthchecks)    |

All endpoints return clean JSON error bodies (`{"detail": "..."}` or a
structured validation array) with appropriate HTTP status codes (400, 404,
409, 422).

---

## 5. Business rules enforced

- **SKU** is unique per product (`409 Conflict` on duplicate).
- **Email** is unique per customer (`409 Conflict` on duplicate).
- **Stock quantity** can never go negative — enforced at the DB level
  (`CHECK` constraint) and the API level.
- **Order creation** validates the customer and every product exist,
  locks the relevant product rows, and rejects the whole order
  (`400 Bad Request`, no partial side effects) if any line item requests
  more than the available stock.
- **Stock is reduced automatically** when an order is placed, and
  **restored automatically** when an order is cancelled (deleted).
- **Order total is always calculated server-side** from each product's
  price at the time of purchase — the client-submitted total (if any) is
  ignored.
- **Deleting a product** that's referenced in an existing order is
  blocked (`409 Conflict`); same for deleting a customer with existing
  orders.

---

## 6. Deployment

### Backend → Render / Railway / Fly.io + Docker Hub

1. **Build & push the image:**
   ```bash
   cd backend
   docker build -t YOUR_DOCKERHUB_USERNAME/stocklane-backend:latest .
   docker push YOUR_DOCKERHUB_USERNAME/stocklane-backend:latest
   ```
2. **Render** (simplest path):
   - New → Web Service → "Deploy an existing image from a registry"
   - Image: `YOUR_DOCKERHUB_USERNAME/stocklane-backend:latest`
   - Add a managed PostgreSQL instance (Render → New → PostgreSQL) and
     copy its **Internal Database URL**.
   - Environment variables: `DATABASE_URL` (the Postgres URL above),
     `CORS_ORIGINS` (your deployed frontend URL), `LOW_STOCK_THRESHOLD`.
   - Render injects `$PORT` automatically — the Dockerfile already
     respects it.
3. **Railway** / **Fly.io** follow the same shape: provision Postgres,
   deploy the pushed image, set the same three env vars. Fly.io:
   `fly launch --image YOUR_DOCKERHUB_USERNAME/stocklane-backend:latest`
   then `fly secrets set DATABASE_URL=... CORS_ORIGINS=...`.

### Frontend → Vercel / Netlify

The frontend is a static build (Vite), so either platform works without
Docker:

```bash
cd frontend
npm install
npm run build   # outputs to dist/
```

- **Vercel**: `vercel --prod` (or connect the GitHub repo in the
  dashboard, set root directory to `frontend`, build command
  `npm run build`, output directory `dist`).
- **Netlify**: connect the repo, base directory `frontend`, build
  command `npm run build`, publish directory `dist`.

In both cases, set the environment variable **`VITE_API_URL`** to your
live backend URL (e.g. `https://stocklane-backend.onrender.com`) **before
building** — Vite inlines `VITE_*` vars at build time, not at runtime.

Once both are live, update the backend's `CORS_ORIGINS` env var to
include the deployed frontend URL and redeploy the backend so requests
aren't blocked by CORS.

### Alternative: deploy the frontend Docker image instead

If you'd rather containerize the frontend too (e.g. on Fly.io/Railway):

```bash
cd frontend
docker build --build-arg VITE_API_URL=https://your-backend-url -t YOUR_DOCKERHUB_USERNAME/stocklane-frontend:latest .
docker push YOUR_DOCKERHUB_USERNAME/stocklane-frontend:latest
```

---

## 7. Submission checklist

- [ ] GitHub repo link — push this project: `git init && git add . && git commit -m "Stocklane: inventory & order management system" && git remote add origin <your-repo-url> && git push -u origin main`
- [ ] Docker Hub image link — `docker push YOUR_DOCKERHUB_USERNAME/stocklane-backend:latest` (see §6)
- [ ] Live frontend URL — from Vercel/Netlify (see §6)
- [ ] Live backend URL — from Render/Railway/Fly.io (see §6)

---

## 8. Design notes

- **Data model**: orders relate to products through an `order_items`
  join table rather than a single product reference, since an order can
  contain multiple products with independent quantities. Each line item
  snapshots the unit price at purchase time, so historical order totals
  stay correct even if a product's price changes later.
- **Frontend**: built with Vite + React (JavaScript), `react-router-dom`
  for routing, `axios` for HTTP, and local component state
  (`useState`/`useEffect`) rather than a global store — the data flows are
  simple enough that Redux/Context-for-data would add ceremony without
  benefit. Toasts use React Context since they're genuinely cross-cutting.
- **UI**: a small custom design system ("Stocklane") rather than a
  component library — see `frontend/src/index.css` for the full token set
  (palette, type scale, layout rules). The signature visual element is
  the `StockBar` shown next to every quantity figure, a color-coded fill
  bar (red/amber/green) that ties stock health directly to the inventory
  subject matter.
