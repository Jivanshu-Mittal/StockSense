# How To Run StockSense

This guide explains how to run the StockSense project locally for development.

## Prerequisites

- Python 3.11+
- Node.js 18+
- `uv` package manager for Python (optional but recommended)

---

## 1. Running the Backend (FastAPI)

### Backend Setup

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Create and activate a virtual environment, then install dependencies:

   ```bash
   # Using uv (recommended for speed)
   uv venv
   # Activate:
   # On Windows: .venv\Scripts\activate
   # On Mac/Linux: source .venv/bin/activate
   
   uv pip install -r requirements.txt
   ```

   *(Alternatively, just use `pip install ...` for FastAPI, SQLAlchemy, Alembic, Uvicorn, Passlib, python-jose, email-validator, bcrypt, etc.)*

3. Set up the environment variables:
   Create a `.env` file in the `backend/` directory:

   ```env
   # REQUIRED: Set a strong secret key for JWT tokens!
   SECRET_KEY=your_super_secret_key_here
   # OPTIONAL: Configure frontend allowed origins for CORS
   ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081
   ```

### Database Initialization

The backend uses SQLite by default for development. To initialize the database tables:

```bash
alembic upgrade head
```

*(Optional)* To seed the database with 100 test users and default locations:

```bash
python seed.py
```

### Start the Server

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API documentation (Swagger) will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

---

## 2. Running the Frontend (React Native Expo)

### Setup

1. Navigate to the frontend directory:

   ```bash
   cd frontend
   ```

2. Install Node dependencies:

   ```bash
   npm install
   ```

### Start the Expo Server

```bash
npm start
```

This will open the Expo Metro Bundler in your terminal. You can then:

- Press `a` to open the app on an Android Emulator.
- Press `i` to open the app on an iOS Simulator (macOS only).
- Scan the QR code with the Expo Go app on your physical device.

---

## 3. Load Testing (Locust)

To ensure the backend handles high load (e.g. 1000 users):

1. Start the FastAPI backend.
2. In a separate terminal, navigate to the `backend/` directory.
3. Run the Locust test:

   ```bash
   locust -f locustfile.py
   ```

4. Open [http://localhost:8089](http://localhost:8089) in your browser to configure and start the load test swarming.
