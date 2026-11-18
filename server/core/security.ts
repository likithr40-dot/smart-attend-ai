import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { UserRole } from '../../src/types';

const JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET !== 'smart-attend-dev-jwt-secret-change-in-prod'
    ? process.env.JWT_SECRET
    : 'smart-attend-local-jwt-secret-key-2026';

const RAW_BIOMETRIC_KEY =
  process.env.BIOMETRIC_ENCRYPTION_KEY || 'smart-attend-biometric-aes-256-key';

const BIOMETRIC_KEY = crypto
  .createHash('sha256')
  .update(RAW_BIOMETRIC_KEY)
  .digest();

export interface JwtPayload {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  studentId?: string;
  facultyId?: string;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function encryptBiometricPayload(plainBase64: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', BIOMETRIC_KEY, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainBase64, 'utf8'),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptBiometricPayload(encryptedBlob: string): string {
  const [ivHex, tagHex, dataHex] = encryptedBlob.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Malformed encrypted biometric template');
  }
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', BIOMETRIC_KEY, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export function createBiometricDigest(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
