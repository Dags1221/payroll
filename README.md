# Apex Enterprise Attendance & Payroll Management System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.11-green.svg)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg)](https://supabase.com/)
[![Compliance](https://img.shields.io/badge/Compliance-Philippine%20TRAIN%20Law-emerald.svg)]()

> A production-grade, secure, full-stack Employee Attendance Monitoring and Payroll Management System designed for modern enterprises. Built with Next.js, Node.js/Express, TypeScript, Tailwind CSS, and PostgreSQL (Supabase ready), fully compliant with Philippine statutory payroll rules (TRAIN Law withholding tax, SSS, PhilHealth, Pag-IBIG).

---

## 🏛️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   Next.js 14 Frontend  │
                                  │   (Vercel Production)  │
                                  └───────────┬────────────┘
                                              │ REST API / JWT
                                              ▼
                                  ┌────────────────────────┐
                                  │   Node.js Express API  │
                                  │   (Render Production)  │
                                  └───────────┬────────────┘
                                              │ PostgreSQL Pool
                                              ▼
                                  ┌────────────────────────┐
                                  │   Supabase PostgreSQL  │
                                  │   Relational Database  │
                                  └────────────────────────┘
```

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide icons, Framer Motion animations.
- **Backend**: Node.js, Express, TypeScript, Helmet security headers, CORS, Morgan logger, bcryptjs password hashing, JSON Web Tokens (JWT), Zod validation.
- **Database**: PostgreSQL (Supabase ready) with transactional safety, decimal-safe financial calculations, foreign keys, and indexes. Zero-config fallback persistent engine for offline local demonstration.
- **Compliance**: Philippine Labor Code and Tax Reform for Acceleration and Inclusion (TRAIN Law) monthly/semi-monthly progressive withholding tax matrix.

---

## 🚀 Key Modules & Business Features

### 1. Employee Information Management
- Complete personnel master directory with filtering, real-time search, sorting, and CSV export.
- Records: Employee ID, Full Name, Corporate Email, Phone, Address, Department, Position, Basic Monthly Salary, Work Schedule, Cost Center, TIN, SSS, PhilHealth, Pag-IBIG, and Emergency Contacts.
- Slide-over profile inspection with employment status badges and salary history.
- Add, Edit, and Confirmation-safeguarded Deletion workflows.

### 2. Time & Attendance Monitoring
- Time In and Time Out recording with real timestamps.
- Automated calculation of working hours, regular hours, overtime hours, late arrival minutes (based on scheduled start), and undertime.
- Daily, Weekly, and Monthly views with status tags (`Present`, `Late`, `Absent`, `On Leave`).
- Administrative Adjustment Workflow: allows authorized HR personnel to correct punch records with mandatory audit justification notes.

### 3. Automated Absenteeism Detection Engine
- Automated background routines (`npm run detect-absences` or in-app trigger) that evaluate scheduled workdays against attendance and approved leave requests.
- Flags unnotified absences directly into an administrative review queue without destructively overwriting data.
- Review and Resolution Workflow: Administrators categorize flagged absences as `Excused` (retroactive duty certification) or `Unexcused Absence` (deducted from salary).

### 4. Leave Requisition & Approval Workflow
- Employee self-service submission: Vacation Leave, Sick Leave, Emergency Leave, Maternity, Paternity, Bereavement.
- Supervisor/Admin review modal: Displays inclusive dates, total working days, and reasons.
- Live status tracking (`Pending`, `Approved`, `Rejected`) with in-app notification triggers and audit trail.

### 5. Overtime Compensation Management
- Overtime submission with date, hours worked, and premium rate multipliers (1.25x for regular workdays, 1.30x for rest days, 2.00x for holidays).
- Dynamic hourly rate computation based on basic monthly salary: `Hourly Rate = (Monthly Salary / 160) * Multiplier`.
- Only authorized and approved overtime records are disbursed during payroll computation.

### 6. Configurable Tax Bracket Matrix
- Dynamic TRAIN Law progressive withholding tax schedule.
- Administrators can view, add, modify, or activate/deactivate tax brackets without hardcoded formulas.
- Includes an **Interactive Tax Computation Simulator** in the UI to preview progressive marginal tax rates on any taxable income amount.

### 7. Precision Payroll Processing Engine
- Safe decimal financial arithmetic to prevent floating-point calculation drift.
- Supports Semi-Monthly and Monthly payroll cycles with lifecycle statuses: `Draft` ➔ `Processing` ➔ `For Review` ➔ `Approved` ➔ `Finalized` ➔ `Locked`.
- Full ledger computation:
  $$\text{Gross Pay} = \text{Base Pay} + \text{Approved OT} + \text{Allowances}$$
  $$\text{Deductions} = \text{Tax (TRAIN)} + \text{SSS} + \text{PhilHealth} + \text{Pag-IBIG} + \text{Tardiness} + \text{Absences}$$
  $$\text{Net Pay} = \text{Gross Pay} - \text{Deductions}$$
- **Pre-Finalization Financial Safeguard**: Modal verifying total headcount, gross payroll, total deductions, and cost center reconciliation before locking.
- Controlled reversal workflow with mandatory audit trail justification.

### 8. Digital Payslip PDF Generator
- High-definition official employee payslips ready for instant browser printing and PDF download.
- Formatted to Philippine corporate standards: Company header, employee profile, inclusive cutoff dates, earnings breakdown, statutory deductions, take-home net pay, and dual signature blocks.

### 9. Cost Center Distribution Tables
- Allocation of personnel payroll expenditures across organizational cost centers (`Human Resources`, `Finance`, `Information Technology`, `Operations`, `Administration`, `Marketing`).
- Budget vs Actual Expenditure visualization with utilization percentages.
- Reconciles 1:1 with period payroll totals.

### 10. Employee Benefits Management
- Enrollment in medical allowances, de minimis provisions (e.g. rice subsidy), and statutory stipends.
- Taxable vs non-taxable configuration linked directly to payroll withholding tax calculations.

### 11. Security Audit Trail & In-App Notification Center
- Immutable compliance log capturing: user, timestamp, action (`LOGIN`, `EMPLOYEE_CREATE`, `ATTENDANCE_ADJUSTMENT`, `PAYROLL_FINALIZE`, etc.), target record ID, details, and IP address.
- In-app notification bell with unread counters, alert categories, and direct deep links to pending modules.

---

## 📦 Project Directory Structure

```
payroll/
├── backend/
│   ├── src/
│   │   ├── controllers/      # REST API controllers
│   │   ├── db/               # PostgreSQL schema & database store
│   │   ├── middleware/       # JWT auth & error handler
│   │   ├── routes/           # Modular Express API routes
│   │   ├── scripts/          # Absenteeism detector & seed CLI
│   │   ├── services/         # Domain business logic & payroll engine
│   │   └── types/            # TypeScript domain interfaces
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js 14 App Router pages
│   │   │   ├── page.tsx      # Executive Dashboard
│   │   │   ├── employees/    # Employee Directory
│   │   │   ├── attendance/   # Time & Attendance Log
│   │   │   ├── absenteeism/  # Absenteeism Review Queue
│   │   │   ├── leave/        # Leave Requisitions
│   │   │   ├── overtime/     # Overtime Compensation
│   │   │   ├── tax-matrix/   # Configurable Tax Matrix
│   │   │   ├── payroll/      # Payroll Processing Engine
│   │   │   ├── payslips/     # Payslip PDF Generator
│   │   │   ├── cost-centers/ # Cost Center Distribution
│   │   │   ├── benefits/     # Employee Benefits
│   │   │   ├── reports/      # Reporting & Analytics Suite
│   │   │   ├── audit-logs/   # Security Audit Trail
│   │   │   └── login/        # Authentication & Persona Switcher
│   │   ├── components/       # Reusable UI components & SVG charts
│   │   ├── context/          # AuthContext & ToastContext
│   │   ├── lib/              # API client & currency formatters
│   │   └── types/            # Frontend TypeScript types
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── docs/                     # Study documentation & requirements
├── legacy_demo/              # Original academic single-file prototype
└── package.json              # Monorepo root workspace configuration
```

---

## ⚡ Quick Start & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v24 LTS recommended)
- **npm**: v9.0.0 or higher
- **Git**

### 1. Clone & Install Dependencies

```bash
# Clone the repository
git clone https://github.com/Dags1221/payroll.git
cd payroll

# Install dependencies for both backend and frontend
npm install --workspace=backend
npm install --workspace=frontend
```

### 2. Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=supersecret-payroll-production-key-change-me-2026
JWT_EXPIRES_IN=7d
DATABASE_URL=
FRONTEND_URL=http://localhost:3000
```
*(Leave `DATABASE_URL` empty to run in zero-config persistent local mode, or supply your Supabase PostgreSQL connection string).*

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_NAME="Apex Payroll"
```

### 3. Launch Development Servers

**Terminal 1 — Backend API:**
```bash
cd backend
npm run dev
# Server listening on http://localhost:5000
# Health check available at http://localhost:5000/health
```

**Terminal 2 — Frontend Application:**
```bash
cd frontend
npm run dev
# Application running on http://localhost:3000
```

---

## 🔑 Demo Evaluator Accounts

| Role | Email | Password | Persona |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@payroll.corp` | `admin123` | Full access to all modules, configurations, and approvals |
| **Supervisor** | `maria.santos@payroll.corp` | `employee123` | Department supervisor with leave & overtime approval permissions |
| **Employee** | `juan.delacruz@payroll.corp` | `employee123` | Personnel self-service: time punch, leave submission, payslip download |

*Note: The navigation header includes an instant **One-Click Persona Switcher** allowing evaluators to switch between Administrator, Supervisor, and Employee perspectives seamlessly without logging out.*

---

## 🛠️ Automated Absenteeism Detection CLI

To execute the automated absenteeism detection script directly from the terminal (e.g. for cron schedule automation):

```bash
cd backend
npm run detect-absences [YYYY-MM-DD]
```

---

## ☁️ Deployment Instructions

### Deploying Frontend to Vercel
1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Set the Environment Variable:
   - `NEXT_PUBLIC_API_URL`: Your deployed Render backend API URL (e.g. `https://payroll-api.onrender.com/api`).
4. Click **Deploy**.

### Deploying Backend to Render
1. Create a new **Web Service** on [Render](https://render.com).
2. Set the **Root Directory** to `backend`.
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
4. Set Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: A secure 32+ character secret
   - `DATABASE_URL`: Your Supabase PostgreSQL connection string
   - `FRONTEND_URL`: Your Vercel domain URL
5. Click **Create Web Service**.

### Supabase Database Setup
1. Create a project at [Supabase](https://supabase.com).
2. Navigate to the **SQL Editor** in your Supabase dashboard.
3. Paste and run the complete PostgreSQL schema located at `backend/src/db/schema.sql`.
4. Copy the URI from **Project Settings > Database > Connection String (URI)** into your backend `DATABASE_URL`.

---

## 📄 License & Compliance

Designed and built as a production-grade workforce and payroll management platform compliant with the Philippine Labor Code, National Internal Revenue Code (NIRC), and TRAIN Law.
