# TASK: Generate End-to-End Walkthrough Demo Video Script for StockSense IMS

You are an expert technical presenter preparing a complete, production-ready video walkthrough script and execution guide for an Odoo Hackathon project submission[cite: 1, 2].

The target project is **StockSense**—a modular Inventory Management System (IMS) built using FastAPI, SQLAlchemy, Alembic, PostgreSQL/SQLite, and React[cite: 3, 4, 5, 7, 11].

Create a comprehensive video recording guide and spoken script that demonstrates the system inside AntiGravity IDE and a web browser, strictly aligning with the Odoo evaluators' criteria[cite: 1].

---

## 1. PRESENTATION REQUIREMENTS & EVALUATOR FOCUS

Ensure the script directly addresses the core grading criteria outlined by the hackathon judges[cite: 1]:
1. **Relational Database Design & Double-Entry Ledger**: Emphasize PostgreSQL/SQLAlchemy data modeling, warehouse location links, and ledger entries over static data mocks or BaaS shortcuts[cite: 1, 3, 8].
2. **Real-Time Dynamic Data**: Demonstrate live inventory balance updates as operations are validated[cite: 1, 3].
3. **Robust Input Validation & Error Handling**: Highlight graceful validation messages (e.g., preventing negative inventory, handling invalid email inputs)[cite: 1].
4. **Clean Code & Modular Architecture**: Walk through the backend folder structure, models, schemas, and router organization in AntiGravity IDE[cite: 1, 7, 8, 9, 11].
5. **Team Ownership & Git Practices**: Note multi-member Git commits and team contribution[cite: 1, 2].

---

## 2. STEP-BY-STEP SCRIPT STRUCTURE (Target Duration: ~4–5 Minutes)

Provide exact visual instructions (`[On Screen]`) and the word-for-word spoken voiceover (`[Voiceover]`) for each segment:

### Segment 1: Introduction & High-Level Architecture (0:00 – 0:45)
- **Visual**: AntiGravity IDE root directory showing `main.py`, `models.py`, `schemas.py`, and the terminal[cite: 7, 8, 9, 11].
- **Content**: Introduce Team Name, Team Number, Problem Statement ("StockSense"), tech stack overview, and project structure[cite: 2, 3].

### Segment 2: Database Schema & Migration Tour in AntiGravity IDE (0:45 – 1:45)
- **Visual**: Open `backend/models.py` and `backend/alembic.ini` / migration files[cite: 4, 8, 11].
- **Content**:
  - Explain the `Product`, `WarehouseLocation`, and `StockMovement` models[cite: 8].
  - Explain the double-entry ledger design: internal physical locations vs. virtual locations (Vendors, Customers)[cite: 3, 8, 10].
  - Run or show migrations (`alembic upgrade head`) and database seeding in the AntiGravity IDE terminal[cite: 4, 10].

### Segment 3: Core Functional Workflows (1:45 – 3:30)
- **Visual**: Browser window showing the running web app side-by-side with FastAPI interactive docs (`/docs`)[cite: 7].
- **Content**:
  - **Auth**: User login and role verification[cite: 3, 6, 9].
  - **Incoming Receipts**: Create a receipt from a vendor, set quantities, click "Validate", and show stock increasing in real time[cite: 3].
  - **Outgoing Deliveries**: Process a delivery order, pick/pack items, validate deduction, and verify stock balance updates[cite: 3].
  - **Internal Transfers & Stock Adjustments**: Move items from Main Store to Production Rack; reconcile a physical count mismatch and show the ledger log[cite: 3].
  - **Dashboard KPIs**: Show the 5 live KPIs updating (Total Products, Low Stock / Out of Stock, Pending Receipts, Pending Deliveries, Scheduled Transfers)[cite: 3].

### Segment 4: Edge Cases, Validations & Conclusion (3:30 – 4:15)
- **Visual**: Return to AntiGravity IDE terminal/code.
- **Content**:
  - Trigger an edge case (e.g., negative stock attempt or invalid input) to showcase custom error feedback[cite: 1].
  - Briefly show Git commit history to demonstrate active version control across all team member accounts[cite: 1, 2].
  - Closing remarks thanking the mentors and organizers[cite: 1, 2].

---

## 3. TECHNICAL PRE-FLIGHT CHECKLIST

Include a quick pre-recording setup checklist covering:
- Terminal commands to start backend (`uvicorn main:app --reload`) and frontend bundler[cite: 7, 11].
- Screen capture setup (OBS / OS recorder layout).
- Hosting instructions for the submission link (YouTube Unlisted, Google Drive public access, Loom) to ensure it satisfies hackathon submission rules[cite: 2].