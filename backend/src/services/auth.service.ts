import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Database } from '../db/database';
import { User, Role } from '../types';
import { auditService } from './audit.service';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret-payroll-production-key-change-me-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: Role;
  employeeId?: string;
  name: string;
  department?: string;
}

export class AuthService {
  private db = Database.getInstance();

  public async login(email: string, passwordPlain: string, ipAddress?: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> }> {
    const user = await this.db.findUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password.');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated. Please contact your system administrator.');
    }

    const matches = await bcrypt.compare(passwordPlain, user.passwordHash);
    if (!matches) {
      throw new Error('Invalid email or password.');
    }

    const payload: AuthTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      name: user.name,
      department: user.department,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    await auditService.log({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'USER_LOGIN',
      entity: 'AUTH',
      entityId: user.id,
      details: `User ${user.email} (${user.role}) logged in successfully.`,
      ipAddress,
    });

    const { passwordHash, ...safeUser } = user;
    return { token, user: safeUser };
  }

  public verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
    } catch (e) {
      throw new Error('Authentication token is invalid or expired.');
    }
  }

  public async changePassword(userId: string, oldPlain: string, newPlain: string): Promise<boolean> {
    const user = await this.db.findUserById(userId);
    if (!user) throw new Error('User not found.');

    const matches = await bcrypt.compare(oldPlain, user.passwordHash);
    if (!matches) throw new Error('Incorrect current password.');

    user.passwordHash = await bcrypt.hash(newPlain, 10);
    await auditService.log({
      userId: user.id,
      userName: user.name,
      role: user.role,
      action: 'PASSWORD_CHANGE',
      entity: 'USER',
      entityId: user.id,
      details: `Password changed for user ${user.email}.`,
    });
    return true;
  }
}

export const authService = new AuthService();
