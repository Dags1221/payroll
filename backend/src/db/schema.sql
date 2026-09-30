-- =========================================================================
-- ENTERPRISE ATTENDANCE & PAYROLL MANAGEMENT SYSTEM - POSTGRESQL SCHEMA
-- Target Database: Supabase PostgreSQL
-- =========================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cost Centers
CREATE TABLE IF NOT EXISTS cost_centers (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    dept VARCHAR(100) NOT NULL,
    budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    allocated_payroll NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_dept ON cost_centers(dept);

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Active',
    date_hired DATE NOT NULL,
    salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    work_schedule VARCHAR(100) NOT NULL DEFAULT '08:00 AM - 05:00 PM (Mon-Fri)',
    cost_center_id VARCHAR(50) REFERENCES cost_centers(id) ON DELETE SET NULL,
    tin VARCHAR(50),
    sss_no VARCHAR(50),
    phil_health_no VARCHAR(50),
    pag_ibig_no VARCHAR(50),
    emergency_contact TEXT,
    avatar VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_employees_dept ON employees(department);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'EMPLOYEE',
    employee_id VARCHAR(50) REFERENCES employees(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    department VARCHAR(100),
    avatar_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Attendance Records
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    emp_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    in_time VARCHAR(20),
    out_time VARCHAR(20),
    working_hours NUMERIC(5, 2) DEFAULT 0.00,
    regular_hours NUMERIC(5, 2) DEFAULT 0.00,
    overtime_hours NUMERIC(5, 2) DEFAULT 0.00,
    late_minutes INTEGER DEFAULT 0,
    undertime_minutes INTEGER DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'Present',
    remarks TEXT,
    corrected_by VARCHAR(150),
    corrected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_emp_date UNIQUE(emp_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_emp ON attendance(emp_id);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);

-- Absenteeism Queue
CREATE TABLE IF NOT EXISTS absenteeism (
    id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    scheduled_workday BOOLEAN DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending Review',
    detection_source VARCHAR(50) DEFAULT 'Automated Script',
    reason TEXT,
    reviewed_by VARCHAR(150),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_absenteeism_date ON absenteeism(date);
CREATE INDEX IF NOT EXISTS idx_absenteeism_status ON absenteeism(status);

-- Leave Requisitions
CREATE TABLE IF NOT EXISTS leave_requests (
    id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    reviewer_id VARCHAR(50),
    reviewer_name VARCHAR(150),
    remarks TEXT,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leave_emp ON leave_requests(emp_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);

-- Overtime Compensation
CREATE TABLE IF NOT EXISTS overtime (
    id VARCHAR(50) PRIMARY KEY,
    date DATE NOT NULL,
    emp_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    regular_schedule VARCHAR(100),
    hours NUMERIC(5, 2) NOT NULL,
    rate NUMERIC(10, 2) NOT NULL,
    multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.25,
    amount NUMERIC(10, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    approver_id VARCHAR(50),
    approver_name VARCHAR(150),
    remarks TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_overtime_emp ON overtime(emp_id);
CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime(status);

-- Tax Bracket Matrix
CREATE TABLE IF NOT EXISTS tax_brackets (
    id VARCHAR(50) PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    min_income NUMERIC(12, 2) NOT NULL,
    max_income NUMERIC(12, 2) NOT NULL,
    base_tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    excess_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000,
    effective_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Employee Benefits
CREATE TABLE IF NOT EXISTS benefits (
    id VARCHAR(50) PRIMARY KEY,
    emp_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'Allowance',
    amount NUMERIC(10, 2) NOT NULL,
    employer_share NUMERIC(10, 2) DEFAULT 0.00,
    employee_share NUMERIC(10, 2) DEFAULT 0.00,
    frequency VARCHAR(30) NOT NULL DEFAULT 'Monthly',
    status VARCHAR(20) NOT NULL DEFAULT 'Active',
    is_taxable BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_benefits_emp ON benefits(emp_id);

-- Payroll Periods
CREATE TABLE IF NOT EXISTS payroll_periods (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'Semi-Monthly',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    cutoff_date DATE NOT NULL,
    payment_date DATE NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Draft',
    total_gross NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_net NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    employee_count INTEGER NOT NULL DEFAULT 0,
    finalized_by VARCHAR(150),
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payroll Items (Individual Employee Payroll in Period)
CREATE TABLE IF NOT EXISTS payroll_items (
    id VARCHAR(50) PRIMARY KEY,
    payroll_period_id VARCHAR(50) NOT NULL REFERENCES payroll_periods(id) ON DELETE CASCADE,
    emp_id VARCHAR(50) NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    cost_center_code VARCHAR(50),
    basic_salary NUMERIC(12, 2) NOT NULL,
    period_basic_pay NUMERIC(12, 2) NOT NULL,
    overtime_hours NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
    overtime_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    benefits_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    late_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    absence_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_withheld NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    sss_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    phil_health_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    pag_ibig_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    other_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_period_emp UNIQUE(payroll_period_id, emp_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_items_period ON payroll_items(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_items_emp ON payroll_items(emp_id);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(50) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(50) NOT NULL,
    user_name VARCHAR(150) NOT NULL,
    role VARCHAR(30) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id VARCHAR(50),
    details TEXT NOT NULL,
    ip_address VARCHAR(50)
);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'INFO',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    link VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
