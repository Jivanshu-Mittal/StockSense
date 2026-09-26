# TASK: Production Refactoring & Completion for Odoo Hackathon IMS (StockSense)

You are an expert full-stack engineer and database architect specializing in FastAPI, SQLAlchemy, PostgreSQL, and React Native / React frontend applications.

Review the existing repository structure and implement all critical security fixes, database architectural improvements, business logic, and UI workflows required by the Odoo Hackathon "StockSense" specification.

---

## 1. CRITICAL SECURITY & CONFIGURATION FIXES

1. **Tighten CORS (`backend/main.py`)**:
   - Remove `allow_origins=["*"]` when `allow_credentials=True`. Configure strict, environment-controlled origins (e.g., `["http://localhost:3000", "http://localhost:8081", "http://localhost:19006"]`).
2. **Environment & Secrets Hardening (`backend/core/config.py`, `backend/alembic.ini`)**:
   - Ensure `sqlalchemy.url` in `alembic.ini` dynamically reads from `DATABASE_URL` via `env.py`.
   - Remove hardcoded credentials. Ensure secrets (JWT secret, DB connection strings) are loaded securely from `.env`.
3. **Role-Based Access Control (RBAC) & User Roles (`backend/models.py`, `backend/dependencies.py`)**:
   - Add a `UserRole` enum in `models.py` with `INVENTORY_MANAGER` and `WAREHOUSE_STAFF`.
   - Add role verification dependencies in `dependencies.py` to guard manager-only routes (e.g., adjustments, reordering rules, product deletion) vs staff routes (picking, packing, movement logging).
4. **Implement OTP Password Reset Flow**:
   - Create endpoints `/auth/forgot-password` (generates & stores an OTP with expiration) and `/auth/reset-password-otp` (validates OTP and resets password).
5. **Sanitize Database Seeder (`backend/seed.py`)**:
   - Replace static default passwords (`admin123`, `password123`) with secure fallback parameters or environment overrides.

---

## 2. DATABASE ARCHITECTURE & STOCK LEDGER ENHANCEMENTS

1. **Double-Entry Stock Ledger Model (`backend/models.py`)**:
   - Refactor `StockMovement` and create a dedicated `StockQuant` or `StockBalance` table tracking real-time product quantities per location:
     - `product_id` (ForeignKey)
     - `location_id` (ForeignKey)
     - `quantity` (Float, with non-negative constraints for physical internal locations)
   - Ensure movements handle:
     - **Incoming Receipts**: source location is `is_virtual=True` (Vendor), destination is physical warehouse.
     - **Outgoing Deliveries**: source is physical warehouse, destination is `is_virtual=True` (Customer).
     - **Internal Transfers**: physical location to physical location (e.g., Main Store to Production Rack).
     - **Adjustments**: difference between physical count and recorded stock, logging the delta to a loss/virtual adjustment location.
2. **Database Concurrency & Integrity**:
   - Add database check constraints or row-level locking (`with_for_update()`) in SQLAlchemy to prevent race conditions during high-concurrency stock delivery deductions.
3. **Reordering Rules & Low-Stock Alerts**:
   - Add `min_stock_level` and `reorder_quantity` to `Product` model.
   - Implement an automated alert flag or query checking for items where total available stock $\le$ `min_stock_level`.
4. **Document Metadata**:
   - Add partner metadata (`partner_name`, `contact_email`, `reference_code`) to receipts and delivery orders.

---

## 3. BUSINESS LOGIC & API ENDPOINTS

Implement or complete the following endpoints in `backend/routers/`:

1. **`operations.py`**:
   - `POST /operations/receipts`: Create and validate incoming stock from vendor.
   - `POST /operations/deliveries`: Multi-step flow (Draft $\rightarrow$ Waiting $\rightarrow$ Ready $\rightarrow$ Done/Canceled) with picking & packing validations.
   - `POST /operations/transfers`: Internal movement logging across warehouse locations.
   - `POST /operations/adjustments`: Count input and auto-reconciliation.
   - `GET /operations/movements`: Ledger move history supporting dynamic filtering (by document type, status, location, date range, product).
2. **`products.py`**:
   - Dynamic real-time calculation of `current_stock` broken down by location.
   - Search by SKU, barcode/code, and category filter.
3. **Dashboard KPIs (`GET /dashboard/kpis`)**:
   - Total products in stock
   - Low stock / out-of-stock items count
   - Pending receipts count
   - Pending deliveries count
   - Scheduled internal transfers count
4. **Robust Error Handling**:
   - Implement consistent custom exception handlers returning clean JSON error bodies (e.g., `"Invalid email format"`, `"Insufficient stock available in source location"`) rather than default unhandled HTTP 500 or raw 422 arrays.

---

## 4. FRONTEND COMPLETION (`frontend/src/`)

1. **Dashboard Screen**:
   - Display the 5 KPI metric cards from `/dashboard/kpis`.
   - Add dynamic filter dropdowns (document type, status, location, category).
2. **Operations & Movements Views**:
   - Screen for managing Receipts (incoming), Deliveries (outgoing), Internal Transfers, and Stock Adjustments.
   - Status badge indicators (`draft`, `waiting`, `ready`, `done`, `canceled`).
3. **Product Inventory Screen**:
   - Product list with SKU search, stock per location, and low-stock badge indicators.
4. **Password Reset Modal**:
   - OTP request and verification form in `AuthScreen.tsx`.

---

## 5. VALIDATION & TESTING

1. Generate a new Alembic revision migration for all schema changes (`alembic revision --autogenerate -m "refactor_stock_ledger_and_rbac"`).
2. Update `backend/locustfile.py` to simulate realistic multi-user load testing across the new movement and KPI routes.
3. Update `README.md` with explicit database migration commands, test setup, and architecture documentation.