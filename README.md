<div align="center">
  <h1>📦 StockSense</h1>
  <p>A modern, event-sourced Inventory Management System (IMS) built for the Odoo Hackathon.</p>
</div>

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

## 🏗️ Architecture & Documentation
For a deeper dive into the architecture, dependencies, and requirements, check out the `docs/` folder:
- [Design & Structure](docs/Design_And_Structure.md)
- [Requirements](docs/Requirements.md)
- [Tech Stack](docs/Tech_Stack.md)
- [Dependencies](docs/Dependencies.md)

## ⚖️ License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
