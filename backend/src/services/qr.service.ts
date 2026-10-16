import crypto from 'crypto';
import { Database } from '../db/database';
import { QrCredential, QrTokenPayload } from '../types';
import { auditService } from './audit.service';

export function getQrSecret(): string {
  const explicitSecret = process.env.QR_HMAC_SECRET || process.env.QR_SECRET;
  if (explicitSecret && explicitSecret.trim() !== '') {
    if (process.env.NODE_ENV === 'production' && (explicitSecret.includes('change-me') || explicitSecret.length < 32)) {
      throw new Error('FATAL SECURITY CONFIGURATION ERROR: Production QR_HMAC_SECRET must be at least 32 characters and cannot use default placeholder values.');
    }
    return explicitSecret;
  }

  // Cryptographically derive a secure 256-bit QR secret from master JWT_SECRET or APP_SECRET
  const baseSecret = process.env.JWT_SECRET || process.env.APP_SECRET;
  if (baseSecret && baseSecret.trim() !== '' && !baseSecret.includes('change-me')) {
    return crypto.createHmac('sha256', baseSecret).update('apex-enterprise-qr-hmac-salt-v1').digest('hex');
  }

  const isProd = process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error('FATAL SECURITY CONFIGURATION ERROR: Neither QR_HMAC_SECRET nor a valid JWT_SECRET environment variable is configured in production mode.');
  }

  console.warn('[SECURITY WARNING] QR_HMAC_SECRET is not set in environment. Falling back to development secret. NEVER use this in production.');
  return 'apex-payroll-qr-dev-only-secret-key-32chars';
}

const TOKEN_PREFIX = 'APXQR';
const TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days validity per badge

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

export class QrService {
  private db = Database.getInstance();

  /**
   * Generates a tamper-proof, HMAC-SHA256 cryptographically signed QR token.
   * Format: APXQR.<base64url(payload)>.<signature>
   * Contains nonces, versioning, and revocable credentials.
   */
  public async generateSignedToken(empId: string, actorName = 'System'): Promise<{
    token: string;
    payload: QrTokenPayload;
    credential: QrCredential;
  }> {
    const employee = await this.db.getEmployeeById(empId);
    if (!employee) {
      throw new Error(`Employee record with ID ${empId} not found.`);
    }

    let credential = await this.db.getQrCredential(empId);
    const now = Math.floor(Date.now() / 1000);

    if (!credential) {
      credential = {
        id: `QRC-${empId}`,
        empId,
        tokenVersion: 1,
        revoked: false,
        lastGeneratedAt: new Date().toISOString()
      };
      await this.db.saveQrCredential(credential);
    } else if (credential.revoked) {
      // Re-activating with incremented version
      credential.revoked = false;
      credential.tokenVersion = (credential.tokenVersion || 1) + 1;
      credential.lastGeneratedAt = new Date().toISOString();
      await this.db.saveQrCredential(credential);
    }

    const nonce = crypto.randomBytes(8).toString('hex');
    const payload: QrTokenPayload = {
      empId: employee.id,
      name: employee.name,
      dept: employee.department,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      nonce,
      v: credential.tokenVersion
    };

    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const hmac = crypto.createHmac('sha256', getQrSecret());
    hmac.update(`${TOKEN_PREFIX}.${encodedPayload}`);
    const signature = hmac.digest('hex');

    const token = `${TOKEN_PREFIX}.${encodedPayload}.${signature}`;

    await auditService.log({
      userId: empId,
      userName: actorName,
      role: 'ADMIN',
      action: 'QR_BADGE_GENERATE',
      entity: 'QR_CREDENTIAL',
      entityId: credential.id,
      details: `Generated cryptographically signed attendance QR badge for ${employee.name} (${empId}). Version ${credential.tokenVersion}.`,
    });

    return { token, payload, credential };
  }

  /**
   * Verifies cryptographic signature, expiration, and checks revocation against database store.
   */
  public async verifySignedToken(tokenString: string): Promise<{
    empId: string;
    name: string;
    dept: string;
    tokenVersion: number;
  }> {
    if (!tokenString || typeof tokenString !== 'string') {
      throw new Error('QR token is missing or malformed.');
    }

    const trimmed = tokenString.trim();
    const parts = trimmed.split('.');

    if (parts.length !== 3 || parts[0] !== TOKEN_PREFIX) {
      // Fallback: If it's a raw JSON or plain ID, reject for cryptographic attendance
      throw new Error('Invalid QR badge format. Expected signed APXQR token.');
    }

    const [prefix, encodedPayload, receivedSignature] = parts;

    // Verify HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', getQrSecret());
    hmac.update(`${prefix}.${encodedPayload}`);
    const expectedSignature = hmac.digest('hex');

    const receivedBuf = Buffer.from(receivedSignature, 'hex');
    const expectedBuf = Buffer.from(expectedSignature, 'hex');

    if (receivedBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(receivedBuf, expectedBuf)) {
      throw new Error('Cryptographic signature verification failed. Counterfeit or tampered QR badge.');
    }

    // Decode and parse payload
    let payload: QrTokenPayload;
    try {
      const decodedJson = base64UrlDecode(encodedPayload);
      payload = JSON.parse(decodedJson);
    } catch {
      throw new Error('Failed to decode QR token payload.');
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
      throw new Error('QR badge has expired. Please contact administration for a refreshed badge.');
    }

    // Check credential store for revocation and version match
    const credential = await this.db.getQrCredential(payload.empId);
    if (credential) {
      if (credential.revoked) {
        throw new Error(`This QR badge has been revoked for security reasons.`);
      }
      if (credential.tokenVersion && payload.v !== credential.tokenVersion) {
        throw new Error(`This QR badge is superseded by a newer version. Please obtain your latest badge.`);
      }

      // Update last scanned time
      credential.lastScannedAt = new Date().toISOString();
      await this.db.saveQrCredential(credential);
    }

    return {
      empId: payload.empId,
      name: payload.name,
      dept: payload.dept,
      tokenVersion: payload.v
    };
  }

  /**
   * Instantly revokes a QR badge
   */
  public async revokeToken(empId: string, actorName = 'Admin'): Promise<boolean> {
    const success = await this.db.revokeQrCredential(empId);
    if (success) {
      await auditService.log({
        userId: empId,
        userName: actorName,
        role: 'ADMIN',
        action: 'QR_BADGE_REVOKE',
        entity: 'QR_CREDENTIAL',
        entityId: empId,
        details: `Revoked attendance QR badge for employee ${empId}.`,
      });
    }
    return success;
  }
}

export const qrService = new QrService();
