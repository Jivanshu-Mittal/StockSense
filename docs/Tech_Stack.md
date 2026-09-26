# Tech Stack

StockSense is built using a modern, decoupled client-server architecture. The following technologies were carefully selected to prioritize rapid development, high performance, and cross-platform mobile compatibility.

## 1. Backend (API Server)
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) (Python)
  * **Why:** Provides extremely fast routing, automatic interactive API documentation (Swagger UI), and built-in data validation using Pydantic. It is async by default which is great for scaling.
* **ORM:** [SQLAlchemy](https://www.sqlalchemy.org/)
  * **Why:** The enterprise standard for Python ORMs. Allows seamless transition between SQLite (for development) and PostgreSQL (for production).
* **Migrations:** [Alembic](https://alembic.sqlalchemy.org/)
  * **Why:** Manages incremental database schema changes programmatically.
* **Authentication:** JWT (JSON Web Tokens) with `python-jose` and `passlib/bcrypt`
  * **Why:** Stateless authentication allows the server to scale easily without session management.

## 2. Frontend (Mobile App)
* **Framework:** [React Native](https://reactnative.dev/)
  * **Why:** Allows writing a single codebase (in TypeScript/JavaScript) that compiles to native applications for both Android and iOS.
* **Toolchain:** [Expo](https://expo.dev/)
  * **Why:** Eliminates the need for complex native build environments (Xcode/Android Studio) during initial development and provides a robust standard library of mobile components.
* **Language:** TypeScript
  * **Why:** Type safety minimizes runtime errors and provides excellent editor autocomplete.

## 3. Database
* **Development Database:** SQLite
  * **Why:** Requires zero configuration and runs from a local file, perfect for rapid prototyping and local development environments.
* **Production Database (Planned):** PostgreSQL
  * **Why:** Robust, ACID-compliant relational database designed to handle high concurrency (e.g., 1000+ users) and large volumes of transactional stock movement data.

## 4. Testing & Infrastructure
* **Load Testing:** [Locust](https://locust.io/)
  * **Why:** Python-based load testing tool that allows writing complex user simulation scripts to test backend performance and database locking.
* **Package Management:** `uv` (Python) and `npm` (Node)
