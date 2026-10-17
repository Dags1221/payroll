import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import {
  User,
  Employee,
  Attendance,
  AbsenteeismRecord,
  LeaveRequest,
  OvertimeRecord,
  TaxBracket,
  Benefit,
  CostCenter,
  PayrollPeriod,
  PayrollItem,
  AuditLog,
  AppNotification,
  QrCredential
} from '../types';
import { getInitialSeedData } from './seed-data';

export interface DatabaseStore {
  users: User[];
  employees: Employee[];
  attendance: Attendance[];
  absenteeism: AbsenteeismRecord[];
  leaves: LeaveRequest[];
  overtime: OvertimeRecord[];
  benefits: Benefit[];
  costCenters: CostCenter[];
  taxBrackets: TaxBracket[];
  payrollPeriods: PayrollPeriod[];
  payrollItems: PayrollItem[];
  auditLogs: AuditLog[];
  notifications: AppNotification[];
  qrCredentials?: QrCredential[];
}

export class Database {
  private static instance: Database;
  private pool: Pool | null = null;
  private isConnectedToPg = false;
  private store: DatabaseStore;
  private localDbPath: string;

  private constructor() {
    this.localDbPath = path.resolve(__dirname, '../../../data/local_db.json');
    this.store = this.loadInitialStore();
    this.initPostgreSql();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public isPgActive(): boolean {
    return this.isConnectedToPg && this.pool !== null;
  }

  private loadInitialStore(): DatabaseStore {
    try {
      if (fs.existsSync(this.localDbPath)) {
        const raw = fs.readFileSync(this.localDbPath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read existing local database file, initializing fresh store.', e);
    }
    const seed = getInitialSeedData();
    this.saveStore(seed);
    return seed;
  }

  private saveStore(storeToSave?: DatabaseStore) {
    try {
      const dir = path.dirname(this.localDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.localDbPath, JSON.stringify(storeToSave || this.store, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to persist database state:', e);
    }
  }

  private async initPostgreSql() {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl && dbUrl.trim() !== '') {
      try {
        this.pool = new Pool({
          connectionString: dbUrl,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: 5000,
        });
        const client = await this.pool.connect();
        client.release();
        this.isConnectedToPg = true;
        console.log('✅ Successfully connected to Supabase PostgreSQL database.');

        // Initialize schema and seed PostgreSQL if tables are empty
        await this.ensurePostgresSchema();
        await this.seedPostgresIfEmpty();
      } catch (err) {
        console.warn('⚠️ PostgreSQL connection attempt failed. Falling back to persistent local storage.', err);
        this.isConnectedToPg = false;
      }
    } else {
      console.log('ℹ️ No DATABASE_URL supplied; operating in production-grade persistent file/memory mode.');
    }
  }

  private async ensurePostgresSchema() {
    if (!this.pool) return;
    try {
      const schemaPath = path.resolve(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
        await this.pool.query(schemaSql);
        console.log('✅ PostgreSQL schema verified and synchronized.');
      }
    } catch (e) {
      console.error('Failed to apply schema.sql to PostgreSQL:', e);
    }
  }

  private async seedPostgresIfEmpty() {
    if (!this.pool) return;
    try {
      const empRes = await this.pool.query('SELECT count(*) FROM employees');
      const count = parseInt(empRes.rows[0].count, 10);
      if (count === 0) {
        console.log('ℹ️ PostgreSQL database is empty. Seeding initial baseline datasets...');
        const seed = getInitialSeedData();

        for (const cc of seed.costCenters) {
          await this.pool.query(
            `INSERT INTO cost_centers (id, code, name, dept, budget, status, allocated_payroll)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (code) DO NOTHING`,
            [cc.id, cc.code, cc.name, cc.dept, cc.budget, cc.status, cc.allocatedPayroll || 0]
          );
        }

        for (const emp of seed.employees) {
          await this.pool.query(
            `INSERT INTO employees (id, name, email, phone, address, department, position, status, date_hired, salary, work_schedule, cost_center_id, tin, sss_no, phil_health_no, pag_ibig_no, emergency_contact, avatar)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ON CONFLICT (id) DO NOTHING`,
            [emp.id, emp.name, emp.email, emp.phone, emp.address, emp.department, emp.position, emp.status, emp.dateHired, emp.salary, emp.workSchedule, emp.costCenterId, emp.tin, emp.sssNo, emp.philHealthNo, emp.pagIbigNo, emp.emergencyContact, emp.avatar]
          );
        }

        for (const u of seed.users) {
          await this.pool.query(
            `INSERT INTO users (id, email, password_hash, role, employee_id, name, department, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (id) DO NOTHING`,
            [u.id, u.email, u.passwordHash, u.role, u.employeeId, u.name, u.department, u.isActive]
          );
        }

        for (const att of seed.attendance) {
          await this.pool.query(
            `INSERT INTO attendance (id, date, emp_id, in_time, out_time, working_hours, regular_hours, overtime_hours, break_minutes, late_minutes, undertime_minutes, status, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ON CONFLICT (emp_id, date) DO NOTHING`,
            [att.id, att.date, att.empId, att.in, att.out, att.workingHours, att.regularHours, att.overtimeHours, att.breakMinutes || 0, att.lateMinutes, att.undertimeMinutes, att.status, att.remarks]
          );
        }

        for (const l of seed.leaves) {
          await this.pool.query(
            `INSERT INTO leaves (id, emp_id, type, start_date, end_date, days, reason, status, submitted_at, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
            [l.id, l.empId, l.type, l.start, l.end, l.days, l.reason, l.status, l.createdAt || new Date().toISOString(), l.remarks]
          );
        }

        for (const ot of seed.overtime) {
          await this.pool.query(
            `INSERT INTO overtime (id, emp_id, date, regular_schedule, hours, rate, multiplier, amount, reason, status, remarks)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
            [ot.id, ot.empId, ot.date, ot.regularSchedule, ot.hours, ot.rate, ot.multiplier, ot.amount, ot.reason, ot.status, ot.remarks]
          );
        }

        for (const tb of seed.taxBrackets) {
          await this.pool.query(
            `INSERT INTO tax_brackets (id, code, name, min_income, max_income, base_tax, excess_rate, effective_date, is_active, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (code) DO NOTHING`,
            [tb.id, tb.code, tb.name, tb.minIncome, tb.maxIncome, tb.baseTax, tb.excessRate, tb.effectiveDate, tb.isActive, tb.notes]
          );
        }

        for (const b of seed.benefits) {
          await this.pool.query(
            `INSERT INTO benefits (id, emp_id, name, type, amount, employer_share, employee_share, frequency, status, is_taxable)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (id) DO NOTHING`,
            [b.id, b.empId, b.name, b.type, b.amount, b.employerShare, b.employeeShare, b.frequency, b.status, b.isTaxable]
          );
        }

        for (const pp of seed.payrollPeriods) {
          await this.pool.query(
            `INSERT INTO payroll_periods (id, name, type, start_date, end_date, cutoff_date, payment_date, status, total_gross, total_deductions, total_net, employee_count)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) ON CONFLICT (id) DO NOTHING`,
            [pp.id, pp.name, pp.type, pp.startDate, pp.endDate, pp.cutoffDate, pp.paymentDate, pp.status, pp.totalGross, pp.totalDeductions, pp.totalNet, pp.employeeCount]
          );
        }

        console.log('✅ Initial seed dataset successfully written to PostgreSQL.');
      }
    } catch (e) {
      console.error('Error during PostgreSQL initial data verification/seeding:', e);
    }
  }

  // --- Users ---
  public async getUsers(): Promise<User[]> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, email, password_hash as "passwordHash", role, employee_id as "employeeId",
                  name, department, avatar_url as "avatarUrl", is_active as "isActive", created_at as "createdAt"
           FROM users ORDER BY name ASC`
        );
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getUsers, falling back to local store:', err);
      }
    }
    return this.store.users;
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, email, password_hash as "passwordHash", role, employee_id as "employeeId",
                  name, department, avatar_url as "avatarUrl", is_active as "isActive", created_at as "createdAt"
           FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
          [email.trim()]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in findUserByEmail, falling back to local store:', err);
      }
    }
    return this.store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public async findUserById(id: string): Promise<User | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, email, password_hash as "passwordHash", role, employee_id as "employeeId",
                  name, department, avatar_url as "avatarUrl", is_active as "isActive", created_at as "createdAt"
           FROM users WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in findUserById, falling back to local store:', err);
      }
    }
    return this.store.users.find(u => u.id === id);
  }

  public async findUserByEmployeeId(empId: string): Promise<User | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, email, password_hash as "passwordHash", role, employee_id as "employeeId",
                  name, department, avatar_url as "avatarUrl", is_active as "isActive", created_at as "createdAt"
           FROM users WHERE employee_id = $1 LIMIT 1`,
          [empId]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in findUserByEmployeeId, falling back to local store:', err);
      }
    }
    return this.store.users.find(u => u.employeeId === empId);
  }

  public async createUser(user: User): Promise<User> {
    const existing = this.store.users.find(u => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (existing) {
      throw new Error(`User with email ${user.email} or ID ${user.id} already exists.`);
    }

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO users (id, email, password_hash, role, employee_id, name, department, avatar_url, is_active, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [user.id, user.email, user.passwordHash, user.role, user.employeeId || null, user.name, user.department || null, user.avatarUrl || null, user.isActive, user.createdAt || new Date().toISOString()]
        );
      } catch (err) {
        console.error('PG write failed in createUser:', err);
      }
    }

    this.store.users.push(user);
    this.saveStore();
    return user;
  }

  public async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const idx = this.store.users.findIndex(u => u.id === id || u.email.toLowerCase() === id.toLowerCase());
    if (idx === -1) return null;
    this.store.users[idx] = {
      ...this.store.users[idx],
      ...updates,
    };

    if (this.isPgActive()) {
      try {
        const u = this.store.users[idx];
        await this.pool!.query(
          `UPDATE users SET
             password_hash = COALESCE($2, password_hash),
             role = COALESCE($3, role),
             employee_id = COALESCE($4, employee_id),
             name = COALESCE($5, name),
             department = COALESCE($6, department),
             avatar_url = COALESCE($7, avatar_url),
             is_active = COALESCE($8, is_active)
           WHERE id = $1`,
          [u.id, updates.passwordHash, updates.role, updates.employeeId, updates.name, updates.department, updates.avatarUrl, updates.isActive]
        );
      } catch (err) {
        console.error('PG update failed in updateUser:', err);
      }
    }

    this.saveStore();
    return this.store.users[idx];
  }

  // --- Employees ---
  public async getEmployees(): Promise<Employee[]> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, name, email, phone, address, department, position, status,
                  date_hired::text as "dateHired", salary::float as salary, work_schedule as "workSchedule",
                  cost_center_id as "costCenterId", tin, sss_no as "sssNo", phil_health_no as "philHealthNo",
                  pag_ibig_no as "pagIbigNo", emergency_contact as "emergencyContact", avatar,
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM employees ORDER BY name ASC`
        );
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getEmployees, falling back to local store:', err);
      }
    }
    return this.store.employees;
  }

  public async getEmployeeById(id: string): Promise<Employee | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, name, email, phone, address, department, position, status,
                  date_hired::text as "dateHired", salary::float as salary, work_schedule as "workSchedule",
                  cost_center_id as "costCenterId", tin, sss_no as "sssNo", phil_health_no as "philHealthNo",
                  pag_ibig_no as "pagIbigNo", emergency_contact as "emergencyContact", avatar,
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM employees WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getEmployeeById, falling back to local store:', err);
      }
    }
    return this.store.employees.find(e => e.id === id);
  }

  public async createEmployee(emp: Employee): Promise<Employee> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO employees (id, name, email, phone, address, department, position, status, date_hired, salary, work_schedule, cost_center_id, tin, sss_no, phil_health_no, pag_ibig_no, emergency_contact, avatar)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
          [emp.id, emp.name, emp.email, emp.phone, emp.address, emp.department, emp.position, emp.status, emp.dateHired, emp.salary, emp.workSchedule, emp.costCenterId, emp.tin, emp.sssNo, emp.philHealthNo, emp.pagIbigNo, emp.emergencyContact, emp.avatar]
        );
      } catch (err) {
        console.error('PG write failed in createEmployee:', err);
      }
    }

    this.store.employees.push(emp);
    this.saveStore();
    return emp;
  }

  public async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    const idx = this.store.employees.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.store.employees[idx] = {
      ...this.store.employees[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    if (this.isPgActive()) {
      try {
        const emp = this.store.employees[idx];
        await this.pool!.query(
          `UPDATE employees SET
             name = COALESCE($2, name),
             email = COALESCE($3, email),
             phone = COALESCE($4, phone),
             address = COALESCE($5, address),
             department = COALESCE($6, department),
             position = COALESCE($7, position),
             status = COALESCE($8, status),
             salary = COALESCE($9, salary),
             work_schedule = COALESCE($10, work_schedule),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id, updates.name, updates.email, updates.phone, updates.address, updates.department, updates.position, updates.status, updates.salary, updates.workSchedule]
        );
      } catch (err) {
        console.error('PG update failed in updateEmployee:', err);
      }
    }

    this.saveStore();
    return this.store.employees[idx];
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    const idx = this.store.employees.findIndex(e => e.id === id);
    if (idx === -1) return false;

    if (this.isPgActive()) {
      try {
        await this.pool!.query('DELETE FROM employees WHERE id = $1', [id]);
      } catch (err) {
        console.error('PG delete failed in deleteEmployee:', err);
      }
    }

    this.store.employees.splice(idx, 1);
    this.saveStore();
    return true;
  }

  // --- Attendance ---
  public async getAttendance(filter?: { date?: string; empId?: string }): Promise<Attendance[]> {
    if (this.isPgActive()) {
      try {
        let query = `
          SELECT id, date::text as date, emp_id as "empId", in_time as "in", out_time as "out",
                 working_hours::float as "workingHours", regular_hours::float as "regularHours",
                 overtime_hours::float as "overtimeHours", break_minutes as "breakMinutes",
                 late_minutes as "lateMinutes", undertime_minutes as "undertimeMinutes",
                 status, remarks, corrected_by as "correctedBy", corrected_at as "correctedAt",
                 created_at as "createdAt"
          FROM attendance WHERE 1=1
        `;
        const params: any[] = [];
        if (filter?.date) {
          params.push(filter.date);
          query += ` AND date = $${params.length}`;
        }
        if (filter?.empId) {
          params.push(filter.empId);
          query += ` AND emp_id = $${params.length}`;
        }
        query += ` ORDER BY date DESC, in_time DESC`;
        const res = await this.pool!.query(query, params);
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getAttendance, falling back to local store:', err);
      }
    }

    let records = this.store.attendance;
    if (filter?.date) {
      records = records.filter(a => a.date === filter.date);
    }
    if (filter?.empId) {
      records = records.filter(a => a.empId === filter.empId);
    }
    return records;
  }

  public async getAttendanceById(id: string): Promise<Attendance | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, date::text as date, emp_id as "empId", in_time as "in", out_time as "out",
                  working_hours::float as "workingHours", regular_hours::float as "regularHours",
                  overtime_hours::float as "overtimeHours", break_minutes as "breakMinutes",
                  late_minutes as "lateMinutes", undertime_minutes as "undertimeMinutes",
                  status, remarks, corrected_by as "correctedBy", corrected_at as "correctedAt",
                  created_at as "createdAt"
           FROM attendance WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getAttendanceById, falling back to local store:', err);
      }
    }
    return this.store.attendance.find(a => a.id === id);
  }

  public async saveAttendance(att: Attendance): Promise<Attendance> {
    const idx = this.store.attendance.findIndex(a => a.id === att.id || (a.date === att.date && a.empId === att.empId));
    if (idx >= 0) {
      this.store.attendance[idx] = att;
    } else {
      this.store.attendance.push(att);
    }

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO attendance (id, date, emp_id, in_time, out_time, working_hours, regular_hours, overtime_hours, break_minutes, late_minutes, undertime_minutes, status, remarks, corrected_by, corrected_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           ON CONFLICT (emp_id, date) DO UPDATE SET
             in_time = EXCLUDED.in_time,
             out_time = EXCLUDED.out_time,
             working_hours = EXCLUDED.working_hours,
             regular_hours = EXCLUDED.regular_hours,
             overtime_hours = EXCLUDED.overtime_hours,
             break_minutes = EXCLUDED.break_minutes,
             late_minutes = EXCLUDED.late_minutes,
             undertime_minutes = EXCLUDED.undertime_minutes,
             status = EXCLUDED.status,
             remarks = EXCLUDED.remarks,
             corrected_by = EXCLUDED.corrected_by,
             corrected_at = EXCLUDED.corrected_at`,
          [att.id, att.date, att.empId, att.in, att.out, att.workingHours, att.regularHours, att.overtimeHours, att.breakMinutes || 0, att.lateMinutes, att.undertimeMinutes, att.status, att.remarks || null, att.correctedBy || null, att.correctedAt || null]
        );
      } catch (err) {
        console.error('PG upsert failed in saveAttendance:', err);
      }
    }

    this.saveStore();
    return att;
  }

  public async updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | null> {
    const idx = this.store.attendance.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.store.attendance[idx] = { ...this.store.attendance[idx], ...updates };

    if (this.isPgActive()) {
      try {
        const item = this.store.attendance[idx];
        await this.pool!.query(
          `UPDATE attendance SET
             in_time = $2, out_time = $3, working_hours = $4, regular_hours = $5,
             overtime_hours = $6, break_minutes = $7, late_minutes = $8,
             undertime_minutes = $9, status = $10, remarks = $11,
             corrected_by = $12, corrected_at = $13
           WHERE id = $1`,
          [id, item.in, item.out, item.workingHours, item.regularHours, item.overtimeHours, item.breakMinutes || 0, item.lateMinutes, item.undertimeMinutes, item.status, item.remarks || null, item.correctedBy || null, item.correctedAt || null]
        );
      } catch (err) {
        console.error('PG update failed in updateAttendance:', err);
      }
    }

    this.saveStore();
    return this.store.attendance[idx];
  }

  // --- Absenteeism ---
  public async getAbsenteeism(): Promise<AbsenteeismRecord[]> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, emp_id as "empId", employee_name as "employeeName", department,
                  date::text as date, scheduled_workday as "scheduledWorkday", status,
                  detection_source as "detectionSource", reviewer_notes as "reason",
                  reviewed_by as "reviewedBy", reviewed_at as "reviewedAt", created_at as "createdAt"
           FROM absenteeism ORDER BY date DESC`
        );
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getAbsenteeism, falling back to local store:', err);
      }
    }
    return this.store.absenteeism;
  }

  public async createAbsenteeismRecord(record: AbsenteeismRecord): Promise<AbsenteeismRecord> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO absenteeism (id, emp_id, employee_name, department, date, scheduled_workday, status, detection_source, reviewer_notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [record.id, record.empId, record.employeeName, record.department, record.date, record.scheduledWorkday, record.status, record.detectionSource, record.reason || null]
        );
      } catch (err) {
        console.error('PG write failed in createAbsenteeismRecord:', err);
      }
    }

    this.store.absenteeism.push(record);
    this.saveStore();
    return record;
  }

  public async updateAbsenteeismRecord(id: string, updates: Partial<AbsenteeismRecord>): Promise<AbsenteeismRecord | null> {
    const idx = this.store.absenteeism.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.store.absenteeism[idx] = { ...this.store.absenteeism[idx], ...updates };

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `UPDATE absenteeism SET
             status = COALESCE($2, status),
             reviewer_notes = COALESCE($3, reviewer_notes),
             reviewed_by = COALESCE($4, reviewed_by),
             reviewed_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [id, updates.status, updates.reason, updates.reviewedBy]
        );
      } catch (err) {
        console.error('PG update failed in updateAbsenteeismRecord:', err);
      }
    }

    this.saveStore();
    return this.store.absenteeism[idx];
  }

  // --- Leaves ---
  public async getLeaves(filter?: { empId?: string; status?: string }): Promise<LeaveRequest[]> {
    if (this.isPgActive()) {
      try {
        let query = `
          SELECT id, emp_id as "empId", type, start_date::text as start, end_date::text as "end",
                 days::float as days, reason, status, approved_by as "reviewerName",
                 approved_at as "reviewedAt", remarks, submitted_at as "createdAt"
          FROM leaves WHERE 1=1
        `;
        const params: any[] = [];
        if (filter?.empId) {
          params.push(filter.empId);
          query += ` AND emp_id = $${params.length}`;
        }
        if (filter?.status) {
          params.push(filter.status);
          query += ` AND status = $${params.length}`;
        }
        query += ` ORDER BY submitted_at DESC`;
        const res = await this.pool!.query(query, params);
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getLeaves, falling back to local store:', err);
      }
    }

    let leaves = this.store.leaves;
    if (filter?.empId) leaves = leaves.filter(l => l.empId === filter.empId);
    if (filter?.status) leaves = leaves.filter(l => l.status === filter.status);
    return leaves;
  }

  public async getLeaveById(id: string): Promise<LeaveRequest | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, emp_id as "empId", type, start_date::text as start, end_date::text as "end",
                  days::float as days, reason, status, approved_by as "reviewerName",
                  approved_at as "reviewedAt", remarks, submitted_at as "createdAt"
           FROM leaves WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getLeaveById, falling back to local store:', err);
      }
    }
    return this.store.leaves.find(l => l.id === id);
  }

  public async createLeave(leave: LeaveRequest): Promise<LeaveRequest> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO leaves (id, emp_id, type, start_date, end_date, days, reason, status, submitted_at, remarks)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [leave.id, leave.empId, leave.type, leave.start, leave.end, leave.days, leave.reason, leave.status, leave.createdAt || new Date().toISOString(), leave.remarks || null]
        );
      } catch (err) {
        console.error('PG write failed in createLeave:', err);
      }
    }

    this.store.leaves.push(leave);
    this.saveStore();
    return leave;
  }

  public async updateLeave(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const idx = this.store.leaves.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.store.leaves[idx] = { ...this.store.leaves[idx], ...updates };

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `UPDATE leaves SET
             status = COALESCE($2, status),
             approved_by = COALESCE($3, approved_by),
             approved_at = COALESCE($4, approved_at),
             remarks = COALESCE($5, remarks)
           WHERE id = $1`,
          [id, updates.status, updates.reviewerName || updates.reviewerId, updates.reviewedAt, updates.remarks]
        );
      } catch (err) {
        console.error('PG update failed in updateLeave:', err);
      }
    }

    this.saveStore();
    return this.store.leaves[idx];
  }

  // --- Overtime ---
  public async getOvertime(filter?: { empId?: string; status?: string }): Promise<OvertimeRecord[]> {
    if (this.isPgActive()) {
      try {
        let query = `
          SELECT id, emp_id as "empId", date::text as date, regular_schedule as "regularSchedule",
                 hours::float as hours, rate::float as rate, multiplier::float as multiplier,
                 amount::float as amount, reason, status, attendance_id as "attendanceId",
                 payroll_item_id as "payrollItemId", approver_id as "approverId",
                 approver_name as "approverName", remarks, approved_at as "approvedAt",
                 created_at as "createdAt"
          FROM overtime WHERE 1=1
        `;
        const params: any[] = [];
        if (filter?.empId) {
          params.push(filter.empId);
          query += ` AND emp_id = $${params.length}`;
        }
        if (filter?.status) {
          params.push(filter.status);
          query += ` AND status = $${params.length}`;
        }
        query += ` ORDER BY date DESC`;
        const res = await this.pool!.query(query, params);
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getOvertime, falling back to local store:', err);
      }
    }

    let ot = this.store.overtime;
    if (filter?.empId) ot = ot.filter(o => o.empId === filter.empId);
    if (filter?.status) ot = ot.filter(o => o.status === filter.status);
    return ot;
  }

  public async getOvertimeById(id: string): Promise<OvertimeRecord | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, emp_id as "empId", date::text as date, regular_schedule as "regularSchedule",
                  hours::float as hours, rate::float as rate, multiplier::float as multiplier,
                  amount::float as amount, reason, status, attendance_id as "attendanceId",
                  payroll_item_id as "payrollItemId", approver_id as "approverId",
                  approver_name as "approverName", remarks, approved_at as "approvedAt",
                  created_at as "createdAt"
           FROM overtime WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getOvertimeById, falling back to local store:', err);
      }
    }
    return this.store.overtime.find(o => o.id === id);
  }

  public async createOvertime(ot: OvertimeRecord): Promise<OvertimeRecord> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO overtime (id, emp_id, date, regular_schedule, hours, rate, multiplier, amount, reason, status, attendance_id, payroll_item_id, approver_id, approver_name, remarks, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
          [ot.id, ot.empId, ot.date, ot.regularSchedule || null, ot.hours, ot.rate, ot.multiplier, ot.amount, ot.reason || null, ot.status, ot.attendanceId || null, ot.payrollItemId || null, ot.approverId || null, ot.approverName || null, ot.remarks || null, ot.createdAt || new Date().toISOString()]
        );
      } catch (err) {
        console.error('PG write failed in createOvertime:', err);
      }
    }

    this.store.overtime.push(ot);
    this.saveStore();
    return ot;
  }

  public async updateOvertime(id: string, updates: Partial<OvertimeRecord>): Promise<OvertimeRecord | null> {
    const idx = this.store.overtime.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.store.overtime[idx] = { ...this.store.overtime[idx], ...updates };

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `UPDATE overtime SET
             status = COALESCE($2, status),
             attendance_id = COALESCE($3, attendance_id),
             payroll_item_id = $4,
             approver_id = COALESCE($5, approver_id),
             approver_name = COALESCE($6, approver_name),
             remarks = COALESCE($7, remarks),
             approved_at = COALESCE($8, approved_at)
           WHERE id = $1`,
          [id, updates.status, updates.attendanceId, updates.payrollItemId !== undefined ? updates.payrollItemId : this.store.overtime[idx].payrollItemId, updates.approverId, updates.approverName, updates.remarks, updates.approvedAt]
        );
      } catch (err) {
        console.error('PG update failed in updateOvertime:', err);
      }
    }

    this.saveStore();
    return this.store.overtime[idx];
  }

  public async getOvertimeByAttendanceId(attendanceId: string): Promise<OvertimeRecord | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, emp_id as "empId", date::text as date, regular_schedule as "regularSchedule",
                  hours::float as hours, rate::float as rate, multiplier::float as multiplier,
                  amount::float as amount, reason, status, attendance_id as "attendanceId",
                  payroll_item_id as "payrollItemId", approver_id as "approverId",
                  approver_name as "approverName", remarks, approved_at as "approvedAt",
                  created_at as "createdAt"
           FROM overtime WHERE attendance_id = $1 LIMIT 1`,
          [attendanceId]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getOvertimeByAttendanceId, falling back to local store:', err);
      }
    }
    return this.store.overtime.find(o => o.attendanceId === attendanceId);
  }

  // --- QR Credentials ---
  public async getQrCredential(empId: string): Promise<QrCredential | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, emp_id as "empId", token_version as "tokenVersion", secret_key as "secretKey",
                  revoked, last_generated_at as "lastGeneratedAt", last_scanned_at as "lastScannedAt"
           FROM qr_credentials WHERE emp_id = $1 LIMIT 1`,
          [empId]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getQrCredential, falling back to local store:', err);
      }
    }
    if (!this.store.qrCredentials) this.store.qrCredentials = [];
    return this.store.qrCredentials.find(q => q.empId === empId);
  }

  public async saveQrCredential(cred: QrCredential): Promise<QrCredential> {
    if (!this.store.qrCredentials) this.store.qrCredentials = [];
    const idx = this.store.qrCredentials.findIndex(q => q.empId === cred.empId);
    if (idx >= 0) {
      this.store.qrCredentials[idx] = cred;
    } else {
      this.store.qrCredentials.push(cred);
    }

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO qr_credentials (id, emp_id, token_version, secret_key, revoked, last_generated_at)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             token_version = EXCLUDED.token_version,
             secret_key = EXCLUDED.secret_key,
             revoked = EXCLUDED.revoked,
             last_generated_at = EXCLUDED.last_generated_at`,
          [cred.id, cred.empId, cred.tokenVersion, cred.secretKey || null, cred.revoked, cred.lastGeneratedAt]
        );
      } catch (err) {
        console.error('PG upsert failed in saveQrCredential:', err);
      }
    }

    this.saveStore();
    return cred;
  }

  public async revokeQrCredential(empId: string): Promise<boolean> {
    let modified = false;
    if (!this.store.qrCredentials) this.store.qrCredentials = [];
    const cred = this.store.qrCredentials.find(q => q.empId === empId);
    if (cred) {
      cred.revoked = true;
      cred.tokenVersion = (cred.tokenVersion || 1) + 1;
      modified = true;
    }

    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `UPDATE qr_credentials SET revoked = TRUE, token_version = token_version + 1 WHERE emp_id = $1`,
          [empId]
        );
        if ((res.rowCount ?? 0) > 0) modified = true;
      } catch (err) {
        console.error('PG update failed in revokeQrCredential:', err);
      }
    }

    if (modified) {
      this.saveStore();
      return true;
    }
    return false;
  }

  // --- Benefits ---
  public async getBenefits(filter?: { empId?: string; status?: string }): Promise<Benefit[]> {
    if (this.isPgActive()) {
      try {
        let query = `
          SELECT id, emp_id as "empId", name, type, amount::float as amount,
                 employer_share::float as "employerShare", employee_share::float as "employeeShare",
                 frequency, status, is_taxable as "isTaxable", created_at as "createdAt"
          FROM benefits WHERE 1=1
        `;
        const params: any[] = [];
        if (filter?.empId) {
          params.push(filter.empId);
          query += ` AND emp_id = $${params.length}`;
        }
        if (filter?.status) {
          params.push(filter.status);
          query += ` AND status = $${params.length}`;
        }
        const res = await this.pool!.query(query, params);
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getBenefits, falling back to local store:', err);
      }
    }

    let list = this.store.benefits;
    if (filter?.empId) list = list.filter(b => b.empId === filter.empId);
    if (filter?.status) list = list.filter(b => b.status === filter.status);
    return list;
  }

  public async createBenefit(b: Benefit): Promise<Benefit> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO benefits (id, emp_id, name, type, amount, employer_share, employee_share, frequency, status, is_taxable)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [b.id, b.empId, b.name, b.type, b.amount, b.employerShare, b.employeeShare, b.frequency, b.status, b.isTaxable]
        );
      } catch (err) {
        console.error('PG write failed in createBenefit:', err);
      }
    }

    this.store.benefits.push(b);
    this.saveStore();
    return b;
  }

  public async updateBenefit(id: string, updates: Partial<Benefit>): Promise<Benefit | null> {
    const idx = this.store.benefits.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.store.benefits[idx] = { ...this.store.benefits[idx], ...updates };

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `UPDATE benefits SET
             amount = COALESCE($2, amount),
             employer_share = COALESCE($3, employer_share),
             employee_share = COALESCE($4, employee_share),
             status = COALESCE($5, status)
           WHERE id = $1`,
          [id, updates.amount, updates.employerShare, updates.employeeShare, updates.status]
        );
      } catch (err) {
        console.error('PG update failed in updateBenefit:', err);
      }
    }

    this.saveStore();
    return this.store.benefits[idx];
  }

  public async deleteBenefit(id: string): Promise<boolean> {
    const idx = this.store.benefits.findIndex(b => b.id === id);
    if (idx === -1) return false;

    if (this.isPgActive()) {
      try {
        await this.pool!.query('DELETE FROM benefits WHERE id = $1', [id]);
      } catch (err) {
        console.error('PG delete failed in deleteBenefit:', err);
      }
    }

    this.store.benefits.splice(idx, 1);
    this.saveStore();
    return true;
  }

  // --- Cost Centers ---
  public async getCostCenters(): Promise<CostCenter[]> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, code, name, dept, budget::float as budget, status,
                  allocated_payroll::float as "allocatedPayroll"
           FROM cost_centers ORDER BY code ASC`
        );
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getCostCenters, falling back to local store:', err);
      }
    }
    return this.store.costCenters;
  }

  public async getCostCenterByCode(code: string): Promise<CostCenter | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, code, name, dept, budget::float as budget, status,
                  allocated_payroll::float as "allocatedPayroll"
           FROM cost_centers WHERE code = $1 LIMIT 1`,
          [code]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getCostCenterByCode, falling back to local store:', err);
      }
    }
    return this.store.costCenters.find(c => c.code === code);
  }

  public async createCostCenter(cc: CostCenter): Promise<CostCenter> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO cost_centers (id, code, name, dept, budget, status, allocated_payroll)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [cc.id, cc.code, cc.name, cc.dept, cc.budget, cc.status, cc.allocatedPayroll || 0]
        );
      } catch (err) {
        console.error('PG write failed in createCostCenter:', err);
      }
    }

    this.store.costCenters.push(cc);
    this.saveStore();
    return cc;
  }

  public async updateCostCenter(id: string, updates: Partial<CostCenter>): Promise<CostCenter | null> {
    const idx = this.store.costCenters.findIndex(c => c.id === id || c.code === id);
    if (idx === -1) return null;
    this.store.costCenters[idx] = { ...this.store.costCenters[idx], ...updates };

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `UPDATE cost_centers SET
             name = COALESCE($2, name),
             dept = COALESCE($3, dept),
             budget = COALESCE($4, budget),
             status = COALESCE($5, status),
             allocated_payroll = COALESCE($6, allocated_payroll)
           WHERE id = $1 OR code = $1`,
          [id, updates.name, updates.dept, updates.budget, updates.status, updates.allocatedPayroll]
        );
      } catch (err) {
        console.error('PG update failed in updateCostCenter:', err);
      }
    }

    this.saveStore();
    return this.store.costCenters[idx];
  }

  public async deleteCostCenter(id: string): Promise<boolean> {
    const idx = this.store.costCenters.findIndex(c => c.id === id || c.code === id);
    if (idx === -1) return false;

    if (this.isPgActive()) {
      try {
        await this.pool!.query('DELETE FROM cost_centers WHERE id = $1 OR code = $1', [id]);
      } catch (err) {
        console.error('PG delete failed in deleteCostCenter:', err);
      }
    }

    this.store.costCenters.splice(idx, 1);
    this.saveStore();
    return true;
  }

  // --- Tax Matrix ---
  public async getTaxBrackets(): Promise<TaxBracket[]> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, code, name, min_income::float as "minIncome", max_income::float as "maxIncome",
                  base_tax::float as "baseTax", excess_rate::float as "excessRate",
                  effective_date::text as "effectiveDate", is_active as "isActive", notes,
                  updated_at as "updatedAt"
           FROM tax_brackets ORDER BY min_income ASC`
        );
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getTaxBrackets, falling back to local store:', err);
      }
    }
    return this.store.taxBrackets;
  }

  public async createTaxBracket(tb: TaxBracket): Promise<TaxBracket> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO tax_brackets (id, code, name, min_income, max_income, base_tax, excess_rate, effective_date, is_active, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [tb.id, tb.code, tb.name, tb.minIncome, tb.maxIncome, tb.baseTax, tb.excessRate, tb.effectiveDate, tb.isActive, tb.notes || null]
        );
      } catch (err) {
        console.error('PG write failed in createTaxBracket:', err);
      }
    }

    this.store.taxBrackets.push(tb);
    this.saveStore();
    return tb;
  }

  public async updateTaxBracket(id: string, updates: Partial<TaxBracket>): Promise<TaxBracket | null> {
    const idx = this.store.taxBrackets.findIndex(b => b.id === id || b.code === id);
    if (idx === -1) return null;
    const targetId = this.store.taxBrackets[idx].id;
    this.store.taxBrackets[idx] = {
      ...this.store.taxBrackets[idx],
      ...updates,
      minIncome: updates.minIncome !== undefined ? Number(updates.minIncome) : this.store.taxBrackets[idx].minIncome,
      maxIncome: updates.maxIncome !== undefined ? Number(updates.maxIncome) : this.store.taxBrackets[idx].maxIncome,
      baseTax: updates.baseTax !== undefined ? Number(updates.baseTax) : this.store.taxBrackets[idx].baseTax,
      excessRate: updates.excessRate !== undefined ? Number(updates.excessRate) : this.store.taxBrackets[idx].excessRate,
      updatedAt: new Date().toISOString()
    };

    if (this.isPgActive()) {
      try {
        const tb = this.store.taxBrackets[idx];
        await this.pool!.query(
          `UPDATE tax_brackets SET
             name = COALESCE($2, name),
             min_income = COALESCE($3, min_income),
             max_income = COALESCE($4, max_income),
             base_tax = COALESCE($5, base_tax),
             excess_rate = COALESCE($6, excess_rate),
             effective_date = COALESCE($7, effective_date),
             is_active = COALESCE($8, is_active),
             notes = COALESCE($9, notes),
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [targetId, updates.name, updates.minIncome, updates.maxIncome, updates.baseTax, updates.excessRate, updates.effectiveDate, updates.isActive, updates.notes]
        );
      } catch (err) {
        console.error('PG update failed in updateTaxBracket:', err);
      }
    }

    this.saveStore();
    return this.store.taxBrackets[idx];
  }

  // --- Payroll Periods & Items ---
  public async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, name, type, start_date::text as "startDate", end_date::text as "endDate",
                  cutoff_date::text as "cutoffDate", payment_date::text as "paymentDate",
                  status, total_gross::float as "totalGross", total_deductions::float as "totalDeductions",
                  total_net::float as "totalNet", employee_count as "employeeCount",
                  finalized_by as "finalizedBy", finalized_at as "finalizedAt", created_at as "createdAt"
           FROM payroll_periods ORDER BY start_date DESC`
        );
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getPayrollPeriods, falling back to local store:', err);
      }
    }
    return this.store.payrollPeriods;
  }

  public async getPayrollPeriodById(id: string): Promise<PayrollPeriod | undefined> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, name, type, start_date::text as "startDate", end_date::text as "endDate",
                  cutoff_date::text as "cutoffDate", payment_date::text as "paymentDate",
                  status, total_gross::float as "totalGross", total_deductions::float as "totalDeductions",
                  total_net::float as "totalNet", employee_count as "employeeCount",
                  finalized_by as "finalizedBy", finalized_at as "finalizedAt", created_at as "createdAt"
           FROM payroll_periods WHERE id = $1 LIMIT 1`,
          [id]
        );
        if (res.rows.length > 0) return res.rows[0];
        return undefined;
      } catch (err) {
        console.error('PG query failed in getPayrollPeriodById, falling back to local store:', err);
      }
    }
    return this.store.payrollPeriods.find(p => p.id === id);
  }

  public async createPayrollPeriod(period: PayrollPeriod): Promise<PayrollPeriod> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO payroll_periods (id, name, type, start_date, end_date, cutoff_date, payment_date, status, total_gross, total_deductions, total_net, employee_count, finalized_by, finalized_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [period.id, period.name, period.type, period.startDate, period.endDate, period.cutoffDate, period.paymentDate, period.status, period.totalGross, period.totalDeductions, period.totalNet, period.employeeCount, period.finalizedBy || null, period.finalizedAt || null]
        );
      } catch (err) {
        console.error('PG write failed in createPayrollPeriod:', err);
      }
    }

    this.store.payrollPeriods.unshift(period);
    this.saveStore();
    return period;
  }

  public async updatePayrollPeriod(id: string, updates: Partial<PayrollPeriod>): Promise<PayrollPeriod | null> {
    const idx = this.store.payrollPeriods.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.store.payrollPeriods[idx] = { ...this.store.payrollPeriods[idx], ...updates };

    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `UPDATE payroll_periods SET
             status = COALESCE($2, status),
             total_gross = COALESCE($3, total_gross),
             total_deductions = COALESCE($4, total_deductions),
             total_net = COALESCE($5, total_net),
             employee_count = COALESCE($6, employee_count),
             finalized_by = COALESCE($7, finalized_by),
             finalized_at = COALESCE($8, finalized_at)
           WHERE id = $1`,
          [id, updates.status, updates.totalGross, updates.totalDeductions, updates.totalNet, updates.employeeCount, updates.finalizedBy, updates.finalizedAt]
        );
      } catch (err) {
        console.error('PG update failed in updatePayrollPeriod:', err);
      }
    }

    this.saveStore();
    return this.store.payrollPeriods[idx];
  }

  public async getPayrollItems(filter?: { periodId?: string; empId?: string }): Promise<PayrollItem[]> {
    if (this.isPgActive()) {
      try {
        let query = `
          SELECT id, payroll_period_id as "payrollPeriodId", emp_id as "empId",
                 employee_name as "employeeName", department, position, cost_center_code as "costCenterCode",
                 basic_salary::float as "basicSalary", period_basic_pay::float as "periodBasicPay",
                 overtime_hours::float as "overtimeHours", overtime_pay::float as "overtimePay",
                 benefits_pay::float as "benefitsPay", gross_pay::float as "grossPay",
                 late_deduction::float as "lateDeduction", absence_deduction::float as "absenceDeduction",
                 tax_withheld::float as "taxWithheld", sss_deduction::float as "sssDeduction",
                 phil_health_deduction::float as "philHealthDeduction", pag_ibig_deduction::float as "pagIbigDeduction",
                 other_deductions::float as "otherDeductions", total_deductions::float as "totalDeductions",
                 net_pay::float as "netPay", created_at as "createdAt"
          FROM payroll_items WHERE 1=1
        `;
        const params: any[] = [];
        if (filter?.periodId) {
          params.push(filter.periodId);
          query += ` AND payroll_period_id = $${params.length}`;
        }
        if (filter?.empId) {
          params.push(filter.empId);
          query += ` AND emp_id = $${params.length}`;
        }
        query += ` ORDER BY employee_name ASC`;
        const res = await this.pool!.query(query, params);
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getPayrollItems, falling back to local store:', err);
      }
    }

    let items = this.store.payrollItems;
    if (filter?.periodId) items = items.filter(i => i.payrollPeriodId === filter.periodId);
    if (filter?.empId) items = items.filter(i => i.empId === filter.empId);
    return items;
  }

  public async savePayrollItems(items: PayrollItem[]): Promise<PayrollItem[]> {
    const periodId = items[0]?.payrollPeriodId;
    if (periodId) {
      this.store.payrollItems = this.store.payrollItems.filter(i => i.payrollPeriodId !== periodId);
    }
    this.store.payrollItems.push(...items);

    if (this.isPgActive() && items.length > 0) {
      try {
        if (periodId) {
          await this.pool!.query('DELETE FROM payroll_items WHERE payroll_period_id = $1', [periodId]);
        }
        for (const item of items) {
          await this.pool!.query(
            `INSERT INTO payroll_items (
               id, payroll_period_id, emp_id, employee_name, department, position, cost_center_code,
               basic_salary, period_basic_pay, overtime_hours, overtime_pay, benefits_pay, gross_pay,
               late_deduction, absence_deduction, tax_withheld, sss_deduction, phil_health_deduction,
               pag_ibig_deduction, other_deductions, total_deductions, net_pay
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
             ON CONFLICT (payroll_period_id, emp_id) DO UPDATE SET
               basic_salary = EXCLUDED.basic_salary,
               period_basic_pay = EXCLUDED.period_basic_pay,
               overtime_hours = EXCLUDED.overtime_hours,
               overtime_pay = EXCLUDED.overtime_pay,
               gross_pay = EXCLUDED.gross_pay,
               total_deductions = EXCLUDED.total_deductions,
               net_pay = EXCLUDED.net_pay`,
            [
              item.id, item.payrollPeriodId, item.empId, item.employeeName, item.department, item.position, item.costCenterCode || null,
              item.basicSalary, item.periodBasicPay, item.overtimeHours, item.overtimePay, item.benefitsPay, item.grossPay,
              item.lateDeduction, item.absenceDeduction, item.taxWithheld, item.sssDeduction, item.philHealthDeduction,
              item.pagIbigDeduction, item.otherDeductions, item.totalDeductions, item.netPay
            ]
          );
        }
      } catch (err) {
        console.error('PG write failed in savePayrollItems:', err);
      }
    }

    this.saveStore();
    return items;
  }

  // --- Audit Logs ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query(
          `SELECT id, timestamp, user_id as "userId", user_name as "userName", role,
                  action, entity, entity_id as "entityId", details, ip_address as "ipAddress"
           FROM audit_logs ORDER BY timestamp DESC LIMIT 500`
        );
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getAuditLogs, falling back to local store:', err);
      }
    }
    return this.store.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async createAuditLog(log: AuditLog): Promise<AuditLog> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO audit_logs (id, timestamp, user_id, user_name, role, action, entity, entity_id, details, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [log.id, log.timestamp, log.userId, log.userName, log.role, log.action, log.entity, log.entityId || null, log.details, log.ipAddress || null]
        );
      } catch (err) {
        console.error('PG write failed in createAuditLog:', err);
      }
    }

    this.store.auditLogs.unshift(log);
    if (this.store.auditLogs.length > 500) {
      this.store.auditLogs.pop();
    }
    this.saveStore();
    return log;
  }

  // --- Notifications ---
  public async getNotifications(userId?: string): Promise<AppNotification[]> {
    if (this.isPgActive()) {
      try {
        let query = `
          SELECT id, user_id as "userId", title, message, type, is_read as "isRead", link, created_at as "createdAt"
          FROM notifications WHERE 1=1
        `;
        const params: any[] = [];
        if (userId) {
          params.push(userId);
          query += ` AND (user_id = $1 OR user_id = 'ALL' OR (user_id = 'ADMINS' AND $1 = 'USR-001'))`;
        }
        query += ` ORDER BY created_at DESC`;
        const res = await this.pool!.query(query, params);
        return res.rows;
      } catch (err) {
        console.error('PG query failed in getNotifications, falling back to local store:', err);
      }
    }

    let notifs = this.store.notifications;
    if (userId) {
      notifs = notifs.filter(n => n.userId === userId || n.userId === 'ALL' || (n.userId === 'ADMINS' && userId === 'USR-001'));
    }
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationAsRead(id: string): Promise<boolean> {
    let success = false;
    const n = this.store.notifications.find(item => item.id === id);
    if (n) {
      n.isRead = true;
      success = true;
    }

    if (this.isPgActive()) {
      try {
        const res = await this.pool!.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [id]);
        if ((res.rowCount ?? 0) > 0) success = true;
      } catch (err) {
        console.error('PG update failed in markNotificationAsRead:', err);
      }
    }

    if (success) this.saveStore();
    return success;
  }

  public async markAllNotificationsAsRead(userId?: string): Promise<boolean> {
    this.store.notifications.forEach(n => {
      if (!userId || n.userId === userId || n.userId === 'ALL') {
        n.isRead = true;
      }
    });

    if (this.isPgActive()) {
      try {
        if (userId) {
          await this.pool!.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id = \'ALL\'', [userId]);
        } else {
          await this.pool!.query('UPDATE notifications SET is_read = TRUE');
        }
      } catch (err) {
        console.error('PG update failed in markAllNotificationsAsRead:', err);
      }
    }

    this.saveStore();
    return true;
  }

  public async createNotification(notif: AppNotification): Promise<AppNotification> {
    if (this.isPgActive()) {
      try {
        await this.pool!.query(
          `INSERT INTO notifications (id, user_id, title, message, type, is_read, link, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [notif.id, notif.userId, notif.title, notif.message, notif.type, notif.isRead, notif.link || null, notif.createdAt]
        );
      } catch (err) {
        console.error('PG write failed in createNotification:', err);
      }
    }

    this.store.notifications.unshift(notif);
    this.saveStore();
    return notif;
  }
}
