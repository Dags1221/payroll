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
  AppNotification
} from '../types';
import { getInitialSeedData } from './seed-data';

interface DatabaseStore {
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
        console.log('Successfully connected to Supabase PostgreSQL database.');
      } catch (err) {
        console.warn('PostgreSQL connection attempt failed. Falling back to persistent local storage.', err);
        this.isConnectedToPg = false;
      }
    } else {
      console.log('No DATABASE_URL supplied; operating in production-grade persistent file/memory mode.');
    }
  }

  // --- Users ---
  public async getUsers(): Promise<User[]> {
    return this.store.users;
  }

  public async findUserByEmail(email: string): Promise<User | undefined> {
    return this.store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public async findUserById(id: string): Promise<User | undefined> {
    return this.store.users.find(u => u.id === id);
  }

  // --- Employees ---
  public async getEmployees(): Promise<Employee[]> {
    return this.store.employees;
  }

  public async getEmployeeById(id: string): Promise<Employee | undefined> {
    return this.store.employees.find(e => e.id === id);
  }

  public async createEmployee(emp: Employee): Promise<Employee> {
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
    this.saveStore();
    return this.store.employees[idx];
  }

  public async deleteEmployee(id: string): Promise<boolean> {
    const idx = this.store.employees.findIndex(e => e.id === id);
    if (idx === -1) return false;
    this.store.employees.splice(idx, 1);
    this.saveStore();
    return true;
  }

  // --- Attendance ---
  public async getAttendance(filter?: { date?: string; empId?: string }): Promise<Attendance[]> {
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
    return this.store.attendance.find(a => a.id === id);
  }

  public async saveAttendance(att: Attendance): Promise<Attendance> {
    const idx = this.store.attendance.findIndex(a => a.id === att.id || (a.date === att.date && a.empId === att.empId));
    if (idx >= 0) {
      this.store.attendance[idx] = att;
    } else {
      this.store.attendance.push(att);
    }
    this.saveStore();
    return att;
  }

  public async updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance | null> {
    const idx = this.store.attendance.findIndex(a => a.id === id);
    if (idx === -1) return null;
    this.store.attendance[idx] = { ...this.store.attendance[idx], ...updates };
    this.saveStore();
    return this.store.attendance[idx];
  }

  // --- Absenteeism ---
  public async getAbsenteeism(): Promise<AbsenteeismRecord[]> {
    return this.store.absenteeism;
  }

  public async createAbsenteeismRecord(record: AbsenteeismRecord): Promise<AbsenteeismRecord> {
    this.store.absenteeism.push(record);
    this.saveStore();
    return record;
  }

  public async updateAbsenteeismRecord(id: string, updates: Partial<AbsenteeismRecord>): Promise<AbsenteeismRecord | null> {
    const idx = this.store.absenteeism.findIndex(r => r.id === id);
    if (idx === -1) return null;
    this.store.absenteeism[idx] = { ...this.store.absenteeism[idx], ...updates };
    this.saveStore();
    return this.store.absenteeism[idx];
  }

  // --- Leaves ---
  public async getLeaves(filter?: { empId?: string; status?: string }): Promise<LeaveRequest[]> {
    let leaves = this.store.leaves;
    if (filter?.empId) leaves = leaves.filter(l => l.empId === filter.empId);
    if (filter?.status) leaves = leaves.filter(l => l.status === filter.status);
    return leaves;
  }

  public async getLeaveById(id: string): Promise<LeaveRequest | undefined> {
    return this.store.leaves.find(l => l.id === id);
  }

  public async createLeave(leave: LeaveRequest): Promise<LeaveRequest> {
    this.store.leaves.push(leave);
    this.saveStore();
    return leave;
  }

  public async updateLeave(id: string, updates: Partial<LeaveRequest>): Promise<LeaveRequest | null> {
    const idx = this.store.leaves.findIndex(l => l.id === id);
    if (idx === -1) return null;
    this.store.leaves[idx] = { ...this.store.leaves[idx], ...updates };
    this.saveStore();
    return this.store.leaves[idx];
  }

  // --- Overtime ---
  public async getOvertime(filter?: { empId?: string; status?: string }): Promise<OvertimeRecord[]> {
    let ot = this.store.overtime;
    if (filter?.empId) ot = ot.filter(o => o.empId === filter.empId);
    if (filter?.status) ot = ot.filter(o => o.status === filter.status);
    return ot;
  }

  public async getOvertimeById(id: string): Promise<OvertimeRecord | undefined> {
    return this.store.overtime.find(o => o.id === id);
  }

  public async createOvertime(ot: OvertimeRecord): Promise<OvertimeRecord> {
    this.store.overtime.push(ot);
    this.saveStore();
    return ot;
  }

  public async updateOvertime(id: string, updates: Partial<OvertimeRecord>): Promise<OvertimeRecord | null> {
    const idx = this.store.overtime.findIndex(o => o.id === id);
    if (idx === -1) return null;
    this.store.overtime[idx] = { ...this.store.overtime[idx], ...updates };
    this.saveStore();
    return this.store.overtime[idx];
  }

  // --- Benefits ---
  public async getBenefits(filter?: { empId?: string; status?: string }): Promise<Benefit[]> {
    let list = this.store.benefits;
    if (filter?.empId) list = list.filter(b => b.empId === filter.empId);
    if (filter?.status) list = list.filter(b => b.status === filter.status);
    return list;
  }

  public async createBenefit(b: Benefit): Promise<Benefit> {
    this.store.benefits.push(b);
    this.saveStore();
    return b;
  }

  public async updateBenefit(id: string, updates: Partial<Benefit>): Promise<Benefit | null> {
    const idx = this.store.benefits.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.store.benefits[idx] = { ...this.store.benefits[idx], ...updates };
    this.saveStore();
    return this.store.benefits[idx];
  }

  public async deleteBenefit(id: string): Promise<boolean> {
    const idx = this.store.benefits.findIndex(b => b.id === id);
    if (idx === -1) return false;
    this.store.benefits.splice(idx, 1);
    this.saveStore();
    return true;
  }

  // --- Cost Centers ---
  public async getCostCenters(): Promise<CostCenter[]> {
    return this.store.costCenters;
  }

  public async getCostCenterByCode(code: string): Promise<CostCenter | undefined> {
    return this.store.costCenters.find(c => c.code === code);
  }

  public async createCostCenter(cc: CostCenter): Promise<CostCenter> {
    this.store.costCenters.push(cc);
    this.saveStore();
    return cc;
  }

  public async updateCostCenter(id: string, updates: Partial<CostCenter>): Promise<CostCenter | null> {
    const idx = this.store.costCenters.findIndex(c => c.id === id || c.code === id);
    if (idx === -1) return null;
    this.store.costCenters[idx] = { ...this.store.costCenters[idx], ...updates };
    this.saveStore();
    return this.store.costCenters[idx];
  }

  // --- Tax Matrix ---
  public async getTaxBrackets(): Promise<TaxBracket[]> {
    return this.store.taxBrackets;
  }

  public async createTaxBracket(tb: TaxBracket): Promise<TaxBracket> {
    this.store.taxBrackets.push(tb);
    this.saveStore();
    return tb;
  }

  public async updateTaxBracket(id: string, updates: Partial<TaxBracket>): Promise<TaxBracket | null> {
    const idx = this.store.taxBrackets.findIndex(b => b.id === id);
    if (idx === -1) return null;
    this.store.taxBrackets[idx] = {
      ...this.store.taxBrackets[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveStore();
    return this.store.taxBrackets[idx];
  }

  // --- Payroll Periods & Items ---
  public async getPayrollPeriods(): Promise<PayrollPeriod[]> {
    return this.store.payrollPeriods;
  }

  public async getPayrollPeriodById(id: string): Promise<PayrollPeriod | undefined> {
    return this.store.payrollPeriods.find(p => p.id === id);
  }

  public async createPayrollPeriod(period: PayrollPeriod): Promise<PayrollPeriod> {
    this.store.payrollPeriods.unshift(period);
    this.saveStore();
    return period;
  }

  public async updatePayrollPeriod(id: string, updates: Partial<PayrollPeriod>): Promise<PayrollPeriod | null> {
    const idx = this.store.payrollPeriods.findIndex(p => p.id === id);
    if (idx === -1) return null;
    this.store.payrollPeriods[idx] = { ...this.store.payrollPeriods[idx], ...updates };
    this.saveStore();
    return this.store.payrollPeriods[idx];
  }

  public async getPayrollItems(filter?: { periodId?: string; empId?: string }): Promise<PayrollItem[]> {
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
    this.saveStore();
    return items;
  }

  // --- Audit Logs ---
  public async getAuditLogs(): Promise<AuditLog[]> {
    return this.store.auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async createAuditLog(log: AuditLog): Promise<AuditLog> {
    this.store.auditLogs.unshift(log);
    if (this.store.auditLogs.length > 500) {
      this.store.auditLogs.pop();
    }
    this.saveStore();
    return log;
  }

  // --- Notifications ---
  public async getNotifications(userId?: string): Promise<AppNotification[]> {
    let notifs = this.store.notifications;
    if (userId) {
      notifs = notifs.filter(n => n.userId === userId || n.userId === 'ALL' || (n.userId === 'ADMINS' && userId === 'USR-001'));
    }
    return notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationAsRead(id: string): Promise<boolean> {
    const n = this.store.notifications.find(item => item.id === id);
    if (n) {
      n.isRead = true;
      this.saveStore();
      return true;
    }
    return false;
  }

  public async markAllNotificationsAsRead(userId?: string): Promise<boolean> {
    this.store.notifications.forEach(n => {
      if (!userId || n.userId === userId || n.userId === 'ALL') {
        n.isRead = true;
      }
    });
    this.saveStore();
    return true;
  }

  public async createNotification(notif: AppNotification): Promise<AppNotification> {
    this.store.notifications.unshift(notif);
    this.saveStore();
    return notif;
  }
}
