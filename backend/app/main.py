"""
Application entrypoint.

Run locally with:
    uvicorn app.main:app --reload

Tables are created automatically on startup via Base.metadata.create_all,
so a fresh PostgreSQL database needs no manual migration step. See
backend/schema.sql if you prefer to create the tables yourself first.
"""
import os

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .database import Base, engine
from .routers import customers, dashboard, orders, products


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Tables are created here (at app startup) rather than at import time,
    # so test suites can swap in a different engine/database beforehand.
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="Inventory & Order Management System",
    description="API for managing products, customers, orders, and inventory.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS_ORIGINS is a comma-separated list, e.g.
# "https://myapp.vercel.app,http://localhost:5173"
_origins_env = os.getenv("CORS_ORIGINS", "*")
origins = [o.strip() for o in _origins_env.split(",")] if _origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return clean, consistent 422 error payloads for invalid request data."""
    errors = [
        {"field": ".".join(str(p) for p in err["loc"][1:]), "message": err["msg"]}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation failed", "errors": errors},
    )


app.include_router(products.router)
app.include_router(customers.router)
app.include_router(orders.router)
app.include_router(dashboard.router)


@app.get("/", tags=["Health"])
def root():
    return {"message": "Inventory & Order Management System API", "docs": "/docs"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "healthy"}
