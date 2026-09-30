import { Database } from '../db/database';
import { AuditLog, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AuditService {
  private db = Database.getInstance();

  public async log(params: {
    userId: string;
    userName: string;
    role: Role;
    action: string;
    entity: string;
    entityId?: string;
    details: string;
    ipAddress?: string;
  }): Promise<AuditLog> {
    const entry: AuditLog = {
      id: `AUD-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId: params.userId,
      userName: params.userName,
      role: params.role,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      details: params.details,
      ipAddress: params.ipAddress || '127.0.0.1'
    };
    return this.db.createAuditLog(entry);
  }

  public async getLogs(): Promise<AuditLog[]> {
    return this.db.getAuditLogs();
  }
}

export const auditService = new AuditService();
