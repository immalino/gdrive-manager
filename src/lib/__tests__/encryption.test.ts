import { describe, expect, it } from 'vitest';

process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');

import { decryptSecret, encryptSecret } from '@/lib/encryption';

describe('encryptSecret/decryptSecret', () => {
  it('roundtrip', () => {
    const token = '1//0gSecretRefreshTokenXYZ';
    const payload = encryptSecret(token);
    expect(payload).not.toContain(token);
    expect(payload.startsWith('v1.')).toBe(true);
    expect(decryptSecret(payload)).toBe(token);
  });

  it('ciphertext dimanipulasi → throw', () => {
    const payload = encryptSecret('secret');
    const parts = payload.split('.');
    const tampered = [parts[0], parts[1], Buffer.from('diubah-attacker').toString('base64'), parts[3]].join('.');
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it('key berbeda → throw', () => {
    const payload = encryptSecret('secret');
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 9).toString('base64');
    expect(() => decryptSecret(payload)).toThrow();
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
  });
});
