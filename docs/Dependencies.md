# Project Dependencies

This document lists the main libraries and packages utilized in the StockSense project, separated by environment.

## 1. Backend (Python)

All backend dependencies are defined in `backend/requirements.txt`.

### Core API Framework
* **`fastapi`**: The core web framework used to build the REST API.
* **`uvicorn`**: An ASGI web server implementation used to run the FastAPI application.
* **`pydantic` & `pydantic-settings`**: Used for data validation, schema definition, and environment variable management.
* **`python-multipart`**: Required by FastAPI to parse form data (used specifically for the OAuth2 login form).
* **`email-validator`**: Used by Pydantic to validate `EmailStr` fields during user signup.

### Database & ORM
* **`sqlalchemy`**: The Object Relational Mapper used to interact with the database.
* **`alembic`**: The database migration tool used to manage SQLAlchemy schema changes.

### Security & Authentication
* **`passlib`**: A password hashing library used to hash user passwords.
* **`bcrypt`**: The specific cryptographic hashing algorithm used by passlib. *(Note: Pinned to `<4.0.0` due to a known compatibility bug with passlib).*
* **`python-jose`**: Used to generate and decode JWT (JSON Web Tokens) for user authentication.

### Testing & Development
* **`locust`**: A load testing tool used to simulate heavy concurrent user traffic.
* **`Faker`**: A library used in `seed.py` to generate realistic dummy data (emails) for database seeding.

---

## 2. Frontend (Node / React Native)

All frontend dependencies are defined in `frontend/package.json`.

### Core Framework
* **`react`**: The underlying UI library.
* **`react-native`**: The framework for building native apps using React.
* **`expo`**: The platform and toolchain making React Native development easier.

### Development Tools
* **`typescript`**: Provides static typing to the JavaScript codebase.
* **`@types/react`**, **`@types/react-native`**: TypeScript type definitions.

*(Note: The frontend is currently a freshly initialized Expo boilerplate. State management, routing, and HTTP client dependencies will be added as UI development progresses).*
