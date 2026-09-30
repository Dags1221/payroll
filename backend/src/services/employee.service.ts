import { Database } from '../db/database';
import { Employee } from '../types';
import { auditService } from './audit.service';

export class EmployeeService {
  private db = Database.getInstance();

  public async getAll(): Promise<Employee[]> {
    return this.db.getEmployees();
  }

  public async getById(id: string): Promise<Employee | undefined> {
    return this.db.getEmployeeById(id);
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
