# GreenBalcony — "Your Garden, Our Responsibility"

DBMS-backed Full-Stack Balcony Gardening and Maintenance Web Application.
*Developed as an MCA Mini Project (GVP Department of Computer Applications).*

## Project Overview
Urban apartment residents want balcony gardens but lack the time, knowledge, and maintenance support. GreenBalcony resolves this through a digital full-stack system enabling customers to:
- Browse plants, pots, fertilizers, and string lights from a catalog.
- Book garden setup and maintenance services via a 4-step wizard.
- Receive routine care visits with transparent worker assignments.
- Pay online (UPI, NetBanking, Cards) and export bills to PDF.
- Consult **GreenBot** (Gemini AI Advisor) for customized balcony plants, care advice, and general troubleshooting chat.

---

## Tech Stack
- **Backend**: Node.js + Express (v4)
- **Database**: PostgreSQL (v15+) using `pg` Pool connection.
- **Frontend**: Vanilla HTML5, CSS3, ES6+ Javascript (served statically or standalone, zero build steps).
- **AI Integration**: Google Gemini API via `gemini-1.5-flash` model.
- **Auth**: JWT tokens stored in localStorage/sessionStorage + Bcrypt password hashing.

---

## Folder Structure
```
greenbalcony/
  backend/
    server.js                    ← Express entry point
    package.json
    .env.example                 ← Template environment file
    db/
      db.js                      ← pg pool configuration
      schema.sql                 ← PostgreSQL DDL (13 tables)
      seed.sql                   ← Telugu/Indian names seed data
    middleware/
      auth.js                    ← JWT verification guards
      errorHandler.js            ← Global error catcher
    routes/
      auth.js, customers.js, categories.js, products.js, orders.js, 
      maintenance.js, employees.js, assignments.js, payments.js, 
      deliveries.js, feedback.js, notifications.js, admin.js, ai.js
  frontend/
    index.html, login.html, register.html, dashboard.html, catalog.html, 
    booking.html, maintenance.html, payments.html, feedback.html, 
    ai-advisor.html, admin.html
    css/style.css                ← Glassmorphic dark styling system
    js/
      api.js                     ← Central fetch API routes
      auth.js                    ← Registration & login submissions
      dashboard.js, catalog.js, booking.js, maintenance.js, payments.js, 
      feedback.js, admin.js, ai-advisor.js, utils.js
  README.md
```

---

## Local Development Setup

### 1. Database Setup
Ensure you have **PostgreSQL** installed and running. 
1. Create a database called `greenbalcony`:
   ```sql
   CREATE DATABASE greenbalcony;
   ```
2. Run the DDL schema file:
   ```bash
   psql -U postgres -d greenbalcony -f backend/db/schema.sql
   ```
3. Seed the database (includes pre-computed bcrypt hash of `'Password@123'` for all users):
   ```bash
   psql -U postgres -d greenbalcony -f backend/db/seed.sql
   ```

### 2. Configuration Setup
Create a `.env` file inside the `backend/` directory (you can copy `.env.example`):
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/greenbalcony
JWT_SECRET=supersecretjwtkeyforgreenbalcony123
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
```
*Note: Make sure your `DATABASE_URL` credentials match your local PostgreSQL setup.*

### 3. Install Backend Dependencies
Navigate to the `backend/` folder and run:
```bash
cmd.exe /c npm install
```

### 4. Running the Application
Start the Node.js Express server:
```bash
npm run dev
```
Open **`http://localhost:5000`** in your browser to view the application. The Express server serves all frontend HTML, CSS, and JS files statically, avoiding any CORS configuration issues!

---

## Seed Accounts (Password: `Password@123`)
- **Admin**: `admin@greenbalcony.com`
- **Customer**: `ravi@gmail.com`
- **Customer**: `sita@gmail.com`
- **Employee (Gardener)**: `meena@greenbalcony.com`
