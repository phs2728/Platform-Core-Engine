/**
 * TOTP (RFC 6238) Implementation
 * Epic 4 MFA — Core SDK 외부, Identity 내부 의존성 없음.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { ITotp } from '../interfaces/index.js';

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }
  return result;
}

function base32Decode(encoded: string): Buffer {
  const cleaned = encoded.replace(/=+$/, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of cleaned) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base32 char: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export class TotpImpl implements ITotp {
  generateSecret(): string {
    return base32Encode(randomBytes(20));
  }

  generateUri(secret: string, accountName: string, issuer: string): string {
    const params = new URLSearchParams({
      secret,
      issuer,
      algorithm: 'SHA1',
      digits: '6',
      period: '30',
    });
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    return `otpauth://totp/${label}?${params.toString()}`;
  }

  verify(secret: string, code: string): boolean {
    const window = 1; // ±30초
    const currentTime = Math.floor(Date.now() / 1000);
    for (let offset = -window; offset <= window; offset++) {
      const expected = this.generateCode(secret, currentTime + offset * 30);
      if (this.safeCompare(expected, code)) return true;
    }
    return false;
  }

  generateBackupCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = randomBytes(5).toString('hex').toUpperCase();
      codes.push(`${raw.slice(0, 5)}-${raw.slice(5, 10)}`);
    }
    return codes;
  }

  private generateCode(secret: string, time: number): string {
    const key = base32Decode(secret);
    const counter = Math.floor(time / 30);
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(BigInt(counter));
    const hmac = createHmac('sha1', key).update(buf).digest();
    const offset = hmac[hmac.length - 1]! & 0xf;
    const code = ((hmac[offset]! & 0x7f) << 24) |
      ((hmac[offset + 1]! & 0xff) << 16) |
      ((hmac[offset + 2]! & 0xff) << 8) |
      (hmac[offset + 3]! & 0xff);
    return (code % 1000000).toString().padStart(6, '0');
  }

  private safeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    try {
      return timingSafeEqual(Buffer.from(a), Buffer.from(b));
    } catch {
      return false;
    }
  }
}
