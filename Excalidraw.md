# TASK: Align StockSense Codebase with Excalidraw UI Mockup & Hackathon Specification

You are an expert full-stack developer specializing in FastAPI, SQLAlchemy, and React / React Native.

Your objective is to update the backend and build out the entire frontend of the `StockSense` repository to match the official Excalidraw mockup and problem statement specification.

---

## 1. BACKEND UPDATES

### A. Database Models (`backend/models.py`)
1. **Product Enhancements**:
   - Add `min_stock_level` (Float, default=0.0) and `reorder_quantity` (Float, default=0.0) to `Product`[cite: 3].
2. **Double-Entry Stock Tracking**:
   - Create a `StockQuant` (or `StockBalance`) table to maintain stock by location[cite: 3]:
     - `product_id` (ForeignKey to products.id)[cite: 8]
     - `location_id` (ForeignKey to locations.id)[cite: 8]
     - `quantity` (Float, non-negative for physical locations)[cite: 8]
     - Unique constraint on `(product_id, location_id)`
3. **Movement & Partner Metadata**:
   - Add `partner_name` (String, nullable) for Vendor/Customer tracking[cite: 3, 10].
   - Add `created_by_user_id` (ForeignKey to users.id) for audit trail tracking[cite: 8].

### B. Schemas & Endpoints (`backend/schemas.py`, `backend/routers/`)
1. **Dashboard KPIs (`backend/routers/dashboard.py`)**:
   - Create `GET /dashboard/kpis` returning[cite: 3]:
     - `total_products_in_stock`: Sum of quantities in physical warehouse locations[cite: 3, 10].
     - `low_stock_count`: Count of products where total stock $\le$ `min_stock_level`[cite: 3].
     - `pending_receipts`: Count of receipts in `draft`/`waiting`/`ready` status[cite: 3, 8].
     - `pending_deliveries`: Count of deliveries in `draft`/`waiting`/`ready` status[cite: 3, 8].
     - `internal_transfers_scheduled`: Count of internal transfers not yet marked `done`[cite: 3, 8].
2. **Operations & Movements (`backend/routers/operations.py`)**:
   - Support query parameters on `GET /operations/movements` for dynamic filtering:
     - `document_type`, `status`, `location_id`, `category`, and `date_range`[cite: 3].
   - Add validation actions:
     - `POST /operations/receipts/validate`: Transitions movement to `done` and increments destination `StockQuant`[cite: 3, 8].
     - `POST /operations/deliveries/validate`: Checks for sufficient stock, deducts source `StockQuant`, and transitions to `done`[cite: 3, 8].
     - `POST /operations/adjustments`: Compares physical count with recorded `StockQuant`, applies difference, and creates a ledger record[cite: 3, 8].
3. **Product Stock by Location (`backend/routers/products.py`)**:
   - Include a per-location breakdown in the product response schema[cite: 3].

---

## 2. FRONTEND IMPLEMENTATION (`frontend/src/`)

Build the complete application layout and screens matching the Excalidraw mockup:

### A. Navigation Shell & Sidebar Layout
1. Implement a persistent navigation sidebar with:
   - **Dashboard**[cite: 3]
   - **Products** (Product Catalog, Categories, Reordering Rules)[cite: 3]
   - **Operations** (Receipts, Deliveries, Internal Transfers, Stock Adjustments, Move History)[cite: 3]
   - **Settings** (Warehouse & Locations)[cite: 3]
   - **Bottom Profile Menu** (User info & Logout)[cite: 3]

### B. Dashboard Screen (`DashboardScreen.tsx`)
1. **KPI Banner**: Render 5 summary cards consuming `GET /dashboard/kpis`[cite: 3]:
   - Total Products, Low Stock / Out of Stock, Pending Receipts, Pending Deliveries, Scheduled Transfers[cite: 3].
2. **Dynamic Filter Bar**: Dropdowns for Document Type, Status, Warehouse/Location, and Category[cite: 3].
3. **Recent Operations Table**: Quick snapshot table showing latest movements with status tags[cite: 3, 8].

### C. Operations Views (`OperationsScreen.tsx` or modular views)
1. **Receipts (Incoming)**:
   - Form for Supplier name, product selector, received quantity[cite: 3].
   - "Validate" button to automatically increase stock[cite: 3].
2. **Delivery Orders (Outgoing)**:
   - Workflow buttons: "Pick Items", "Pack Items", and "Validate" to decrease stock[cite: 3].
3. **Internal Transfers**:
   - Source location picker, destination location picker, quantity[cite: 3].
4. **Stock Adjustments**:
   - Location selector, recorded stock display, input for physical count, and auto-reconciliation button[cite: 3].
5. **Move History (Stock Ledger)**:
   - Chronological table showing Reference, Date, Product SKU, From $\rightarrow$ To, Quantity (+/-), Status, and User[cite: 3, 8].

### D. Products Screen (`ProductsScreen.tsx`)
1. Product table with SKU search bar and category filters[cite: 3, 8].
2. Stock per location modal/accordion[cite: 3].
3. Visual warning badges on low-stock items[cite: 3].

---

## 3. VERIFICATION

1. Run Alembic autogenerate to update migration scripts:
   ```bash
   alembic revision --autogenerate -m "align_schema_with_excalidraw_spec"
   alembic upgrade head