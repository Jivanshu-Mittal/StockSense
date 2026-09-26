# Design and Structure

The StockSense project is architected as a modern, decoupled client-server application. It separates the backend data layer and business logic from the mobile client UI.

## 1. High-Level Architecture

* **Client Layer (Mobile App):** A React Native application built with Expo. It communicates with the backend exclusively via RESTful HTTP calls.
* **Server Layer (API):** A FastAPI server that exposes REST endpoints, handles business logic, issues JWT tokens, and manages database transactions.
* **Data Layer (Database):** A relational database (SQLite for dev, Postgres planned for prod) accessed via SQLAlchemy ORM.

## 2. Directory Structure

The repository is split into two primary domains:

### `backend/`

The backend is organized using a feature-based router structure, separating concerns cleanly.

* **`main.py`**: The entry point for the FastAPI application. Sets up CORS, API metadata, and registers all routers.
* **`core/`**: Contains core configuration and security utilities.
  * `config.py`: Environment variable loading and application settings.
  * `security.py`: Password hashing, verification, and JWT token generation.
* **`database.py`**: SQLAlchemy engine configuration and database session dependency (`get_db`).
* **`models.py`**: SQLAlchemy ORM models detailing the database schema (`User`, `Product`, `StockMovement`, `WarehouseLocation`).
* **`schemas.py`**: Pydantic models used to validate incoming HTTP request payloads and format outbound HTTP responses.
* **`dependencies.py`**: FastAPI dependencies, primarily `get_current_user` which intercepts and validates JWT tokens on protected routes.
* **`routers/`**: The HTTP endpoints grouped by feature domain.
  * `auth.py`: `/signup` and `/login` endpoints.
  * `products.py`: Endpoints for listing products and creating new products (which auto-triggers an initial stock movement).
  * `operations.py`: Endpoints for tracking and logging individual stock movements (receipts, deliveries, adjustments).
* **`alembic/`**: Database migration files.
* **`seed.py`**: A utility script to populate the database with mock data.
* **`locustfile.py`**: Load testing scripts to simulate heavy concurrent API usage.

### `frontend/`

The frontend is structured as a standard Expo React Native project.
*(Note: As the UI is still in early development, this structure represents the intended architecture).*

* **`App.tsx`**: The main entry point for the Expo application. Will house the primary navigation container.
* **`src/api/`**: Axios client configuration for communicating with the backend.
* **`src/components/`**: Reusable, stateless UI components (e.g., custom buttons, input fields, cards).
* **`src/screens/`**: Stateful React components representing distinct application views (e.g., LoginScreen, DashboardScreen, InventoryScreen).
* **`src/store/`**: Global state management (e.g., Zustand or Redux) for handling the authentication token and user session state.

## 3. Core Design Decisions

### Event-Sourced Inventory

Instead of storing a static `current_stock` integer on the `Product` table and blindly overwriting it, StockSense treats inventory as an **append-only ledger** of `StockMovement` records.

* To find a product's current stock, the backend dynamically calculates the sum of all its past movements (Receipts add stock, Deliveries subtract stock).
* This provides a perfect audit trail of every stock change, essential for enterprise inventory management systems like Odoo.

### Token-Based Authentication

The system uses JSON Web Tokens (JWT) for authentication.

* The backend does not need to store user sessions in memory or in a database table.
* The frontend receives the JWT upon login, stores it securely, and attaches it as a `Bearer` token in the `Authorization` header of all subsequent API requests.
