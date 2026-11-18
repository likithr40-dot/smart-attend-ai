import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createBiometricDigest,
  decryptBiometricPayload,
  encryptBiometricPayload,
  hashPassword,
  signJwt,
  verifyJwt,
  verifyPassword,
} from './security';

test('password hashing never stores plain text and verifies correctly', () => {
  const hash = hashPassword('Admin@123');
  assert.notEqual(hash, 'Admin@123');
  assert.equal(verifyPassword('Admin@123', hash), true);
  assert.equal(verifyPassword('WrongPass', hash), false);
});

test('JWT signing and verification preserves role claims', () => {
  const token = signJwt({
    uid: 'uid_admin_01',
    email: 'admin@smartattend.edu',
    role: 'admin',
    name: 'Dr. Vikram Deshmukh',
  });
  const decoded = verifyJwt(token);
  assert.equal(decoded.role, 'admin');
  assert.equal(decoded.email, 'admin@smartattend.edu');
});

test('AES-256-GCM biometric encryption roundtrips cleanly and masks plaintext', () => {
  const sample = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD';
  const encrypted = encryptBiometricPayload(sample);
  assert.ok(!encrypted.includes('data:image'));
  assert.equal(decryptBiometricPayload(encrypted), sample);
  assert.equal(createBiometricDigest(sample).length, 64);
});
