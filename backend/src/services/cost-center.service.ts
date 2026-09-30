import { Database } from '../db/database';
import { CostCenter } from '../types';
import { auditService } from './audit.service';

export class CostCenterService {
  private db = Database.getInstance();

  public async getCostCenters(): Promise<CostCenter[]> {
    return this.db.getCostCenters();
  }

  public async getDistributionSummary(): Promise<{
    costCenters: (CostCenter & { employeeCount: number; budgetUtilizationPercent: number })[];
    totalBudget: number;
    totalAllocatedPayroll: number;
  }> {
    const centers = await this.db.getCostCenters();
    const employees = await this.db.getEmployees();

    let totalBudget = 0;
    let totalAllocatedPayroll = 0;

    const enriched = centers.map(cc => {
      const assigned = employees.filter(e => e.costCenterId === cc.code || e.department === cc.dept);
      const budget = Number(cc.budget || 0);
      const allocated = Number(cc.allocatedPayroll || 0);
      const budgetUtilizationPercent = budget > 0 ? Math.round((allocated / budget) * 1000) / 10 : 0;

      totalBudget += budget;
      totalAllocatedPayroll += allocated;

      return {
        ...cc,
        employeeCount: assigned.length,
        budgetUtilizationPercent
      };
    });

    return {
      costCenters: enriched,
      totalBudget,
      totalAllocatedPayroll
    };
  }

  public async create(data: Omit<CostCenter, 'id'>, actorName = 'Administrator'): Promise<CostCenter> {
    const existing = await this.db.getCostCenterByCode(data.code);
    if (existing) throw new Error(`Cost center with code ${data.code} already exists.`);

    const cc: CostCenter = {
      ...data,
      id: data.code,
      allocatedPayroll: 0
    };

    const saved = await this.db.createCostCenter(cc);

    await auditService.log({
      userId: 'ADMIN',
      userName: actorName,
      role: 'ADMIN',
      action: 'COST_CENTER_CREATE',
      entity: 'COST_CENTER',
      entityId: saved.code,
      details: `Created Cost Center ${saved.name} (${saved.code}) with budget ₱${saved.budget.toLocaleString()}.`,
    });

    return saved;
  }

  public async update(code: string, updates: Partial<CostCenter>, actorName = 'Administrator'): Promise<CostCenter | null> {
    const updated = await this.db.updateCostCenter(code, updates);
    if (updated) {
      await auditService.log({
        userId: 'ADMIN',
        userName: actorName,
        role: 'ADMIN',
        action: 'COST_CENTER_UPDATE',
        entity: 'COST_CENTER',
        entityId: code,
        details: `Updated Cost Center ${code}.`,
      });
    }
    return updated;
  }
}

export const costCenterService = new CostCenterService();
