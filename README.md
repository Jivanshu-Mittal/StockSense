# 📦 StockSense

A modern, event-sourced Inventory Management System (IMS) built for the Odoo Hackathon.

---

## 💡 The Problem

Traditional inventory trackers often overwrite data, losing the history of stock movements. StockSense treats inventory as an **append-only ledger** of stock movements, giving you a perfect audit trail—just like enterprise systems.

## 🚀 Tech Stack

* **Backend:** FastAPI (Python), SQLAlchemy, SQLite (Development) / PostgreSQL (Production), Alembic, JWT Auth
* **Frontend:** React Native (Expo), TypeScript, Zustand
* **Load Testing:** Locust

## 📖 Quick Start

### 1. Backend Setup

```bash
cd backend
# Install dependencies
uv pip install -r requirements.txt
# Run migrations
alembic upgrade head
# Seed the database (optional)
python seed.py
# Start the server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

API Documentation will be available at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup

```bash
cd frontend
npm install
npm start
```

## 🔄 Database Migrations

To generate a new migration after model changes:

```bash
cd backend
alembic revision --autogenerate -m "your migration description"
```

To apply pending migrations:

```bash
alembic upgrade head
```

To rollback the last migration:

```bash
alembic downgrade -1
```

## 🧪 Load Testing with Locust

StockSense uses Locust for load testing. To run the load tests:

1. Set the admin password environment variable (if not already set in the environment):

   ```bash
   export ADMIN_PASSWORD="your_admin_password"
   ```

   On Windows PowerShell:

   ```powershell
   $env:ADMIN_PASSWORD="your_admin_password"
   ```

2. Start the backend server (if not already running):

   ```bash
   cd backend
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. Run Locust:

   ```bash
   locust -f locustfile.py
   ```

   Then open [http://localhost:8089](http://localhost:8089) in your browser to start the test.

## 🏗️ Architecture Overview

### Stock Ledger Model

StockSense implements an append-only ledger of stock movements. Every inventory change (receipt, delivery, internal transfer, adjustment) is recorded as a `StockMovement` record. The actual stock quantities are derived from these movements and stored in the `StockQuant` table, which maintains the current quantity of each product at each location. This design ensures a complete audit trail and enables accurate stock calculations even after complex sequences of operations.

### Role-Based Access Control (RBAC)

The system defines two primary roles:

* **Inventory Manager**: Can perform all operations including creating products, receipts, transfers, adjustments, and viewing all reports.
* **Warehouse Staff**: Can create and process deliveries (start, pack, ship), view movements, and see dashboard KPIs.

Roles are enforced via FastAPI dependencies (`get_inventory_manager_user` and `get_warehouse_staff_user`) that check the user's role attribute stored in the `users` table.

## ⚖️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
