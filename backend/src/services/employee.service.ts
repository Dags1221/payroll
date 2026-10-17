import bcrypt from 'bcryptjs';
import { Database } from '../db/database';
import { Employee, User, Role } from '../types';
import { auditService } from './audit.service';

export class EmployeeService {
  private db = Database.getInstance();

  public async getAll(): Promise<Employee[]> {
    return this.db.getEmployees();
  }

  public async getById(id: string): Promise<Employee | undefined> {
    return this.db.getEmployeeById(id);
  }

  public async generateAccount(data: {
    id?: string;
    name: string;
    email: string;
    password?: string;
    pin?: string;
    role?: Role;
    department: string;
    position: string;
    salary: number;
    phone?: string;
    address?: string;
    workSchedule?: string;
    costCenterId?: string;
    tin?: string;
    sssNo?: string;
    philHealthNo?: string;
    pagIbigNo?: string;
    emergencyContact?: string;
  }, actorName = 'Administrator'): Promise<{
    employee: Employee;
    user: Omit<User, 'passwordHash'>;
    plainPassword: string;
    pin: string;
  }> {
    let empId = data.id?.trim();
    if (!empId) {
      const all = await this.db.getEmployees();
      let maxNum = 0;
      for (const e of all) {
        const match = e.id.match(/^EMP-(\d+)$/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      empId = `EMP-${String(maxNum + 1).padStart(3, '0')}`;
    }

    const plainPassword = data.password && data.password.trim() !== '' ? data.password : 'ApexPass2026!';
    const pin = data.pin && data.pin.trim() !== '' ? data.pin : '1234';
    const role: Role = data.role || 'EMPLOYEE';

    const newEmp: Employee = {
      id: empId,
      name: data.name,
      email: data.email,
      phone: data.phone || '+63 917 000 0000',
      address: data.address || 'Metro Manila, Philippines',
      department: data.department || 'Operations',
      position: data.position || 'Staff',
      status: 'Active',
      dateHired: new Date().toISOString().slice(0, 10),
      salary: Number(data.salary) || 25000,
      workSchedule: data.workSchedule || '08:00 AM - 05:00 PM (Mon-Fri)',
      costCenterId: data.costCenterId || 'CC-001',
      tin: data.tin || '000-000-000-000',
      sssNo: data.sssNo || '00-0000000-0',
      philHealthNo: data.philHealthNo || '00-000000000-0',
      pagIbigNo: data.pagIbigNo || '0000-0000-0000',
      emergencyContact: data.emergencyContact || 'Emergency Contact - 0917-000-0000',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const existingEmp = await this.db.getEmployeeById(empId);
    let savedEmp: Employee;
    if (existingEmp) {
      savedEmp = (await this.db.updateEmployee(empId, newEmp)) || { ...existingEmp, ...newEmp };
    } else {
      savedEmp = await this.db.createEmployee(newEmp);
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const existingUser = await this.db.findUserByEmail(data.email);
    let finalUser: User;

    if (existingUser) {
      const updatedUser = await this.db.updateUser(existingUser.id, {
        passwordHash,
        role,
        employeeId: empId,
        name: data.name,
        department: data.department,
        isActive: true
      });
      finalUser = updatedUser || { ...existingUser, role, employeeId: empId, name: data.name, department: data.department };
    } else {
      const userId = `USR-${Date.now().toString(36).toUpperCase()}`;
      const newUser: User = {
        id: userId,
        email: data.email.toLowerCase(),
        passwordHash,
        role,
        employeeId: empId,
        name: data.name,
        department: data.department,
        isActive: true,
        createdAt: new Date().toISOString()
      };
      finalUser = await this.db.createUser(newUser);
    }

    await auditService.log({
      userId: 'ADMIN',
      userName: actorName,
      role: 'ADMIN',
      action: 'ACCOUNT_GENERATED',
      entity: 'USER',
      entityId: finalUser.id,
      details: `Generated system account and credentials for ${savedEmp.name} (${empId}, Role: ${role}).`,
    });

    return {
      employee: savedEmp,
      user: {
        id: finalUser.id,
        email: finalUser.email,
        role: finalUser.role,
        employeeId: finalUser.employeeId,
        name: finalUser.name,
        department: finalUser.department,
        isActive: finalUser.isActive,
        createdAt: finalUser.createdAt
      },
      plainPassword,
      pin
    };
  }

  public async create(data: Omit<Employee, 'createdAt' | 'updatedAt'>, actorName = 'Administrator'): Promise<Employee> {
    const existing = await this.db.getEmployeeById(data.id);
    if (existing) {
      throw new Error(`Employee with ID ${data.id} already exists.`);
    }

    const newEmp: Employee = {
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await this.db.createEmployee(newEmp);

    await auditService.log({
      userId: 'ADMIN',
      userName: actorName,
      role: 'ADMIN',
      action: 'EMPLOYEE_CREATE',
      entity: 'EMPLOYEE',
      entityId: saved.id,
      details: `Added new employee ${saved.name} (${saved.id}) in ${saved.department}.`,
    });

    return saved;
  }

  public async update(id: string, updates: Partial<Employee>, actorName = 'Administrator'): Promise<Employee> {
    const updated = await this.db.updateEmployee(id, updates);
    if (!updated) throw new Error('Employee not found.');

    await auditService.log({
      userId: 'ADMIN',
      userName: actorName,
      role: 'ADMIN',
      action: 'EMPLOYEE_UPDATE',
      entity: 'EMPLOYEE',
      entityId: id,
      details: `Updated employee details for ${updated.name} (${id}).`,
    });

    return updated;
  }

  public async delete(id: string, actorName = 'Administrator'): Promise<boolean> {
    const emp = await this.db.getEmployeeById(id);
    if (!emp) throw new Error('Employee not found.');

    const deleted = await this.db.deleteEmployee(id);
    if (deleted) {
      await auditService.log({
        userId: 'ADMIN',
        userName: actorName,
        role: 'ADMIN',
        action: 'EMPLOYEE_DELETE',
        entity: 'EMPLOYEE',
        entityId: id,
        details: `Deleted employee record for ${emp.name} (${id}).`,
      });
    }
    return deleted;
  }
}

export const employeeService = new EmployeeService();
