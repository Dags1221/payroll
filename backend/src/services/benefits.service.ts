import { Database } from '../db/database';
import { Benefit } from '../types';
import { auditService } from './audit.service';

export class BenefitsService {
  private db = Database.getInstance();

  public async getBenefits(filter?: { empId?: string; status?: string }): Promise<Benefit[]> {
    return this.db.getBenefits(filter);
  }

  public async addBenefit(data: Omit<Benefit, 'id' | 'createdAt'>, actorName = 'Administrator'): Promise<Benefit> {
    const id = `BEN-${Date.now().toString(36).toUpperCase().slice(-4)}`;
    const benefit: Benefit = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    const saved = await this.db.createBenefit(benefit);

    await auditService.log({
      userId: 'ADMIN',
      userName: actorName,
      role: 'ADMIN',
      action: 'BENEFIT_CREATE',
      entity: 'BENEFIT',
      entityId: saved.id,
      details: `Added ${saved.name} (₱${saved.amount}) for employee ${saved.empId}.`,
    });

    return saved;
  }

  public async updateBenefit(id: string, updates: Partial<Benefit>, actorName = 'Administrator'): Promise<Benefit | null> {
    const updated = await this.db.updateBenefit(id, updates);
    if (updated) {
      await auditService.log({
        userId: 'ADMIN',
        userName: actorName,
        role: 'ADMIN',
        action: 'BENEFIT_UPDATE',
        entity: 'BENEFIT',
        entityId: id,
        details: `Updated benefit record ${id}.`,
      });
    }
    return updated;
  }

  public async deleteBenefit(id: string, actorName = 'Administrator'): Promise<boolean> {
    const deleted = await this.db.deleteBenefit(id);
    if (deleted) {
      await auditService.log({
        userId: 'ADMIN',
        userName: actorName,
        role: 'ADMIN',
        action: 'BENEFIT_DELETE',
        entity: 'BENEFIT',
        entityId: id,
        details: `Deleted benefit record ${id}.`,
      });
    }
    return deleted;
  }
}

export const benefitsService = new BenefitsService();
