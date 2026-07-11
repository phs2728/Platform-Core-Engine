import { describe, it, expect } from 'vitest';
import { Ok, Err, map, flatMap, isOk, isErr, unwrap, fromPromise, fromTry } from '../src/result/index.js';

describe('Result', () => {
  it('Ok 생성', () => {
    const r = Ok(42);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('Err 생성', () => {
    const e = new Error('test');
    const r = Err(e);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe(e);
  });

  it('isOk / isErr Type Guard', () => {
    const ok = Ok(1);
    const err = Err(new Error('x'));
    expect(isOk(ok)).toBe(true);
    expect(isErr(ok)).toBe(false);
    expect(isOk(err)).toBe(false);
    expect(isErr(err)).toBe(true);
  });

  it('map', () => {
    const r = map(Ok(5), (x) => x * 2);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(10);
  });

  it('map은 Err을 그대로 전달', () => {
    const e = Err(new Error('x'));
    const r = map(e, (x: number) => x * 2);
    expect(r.ok).toBe(false);
  });

  it('flatMap (async)', async () => {
    const r = await flatMap(Ok(5), async (x) => Ok(x + 10));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe(15);
  });

  it('unwrap', () => {
    expect(unwrap(Ok(42))).toBe(42);
    expect(() => unwrap(Err(new Error('x')))).toThrow();
  });

  it('fromPromise', async () => {
    const ok = await fromPromise(Promise.resolve(42));
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value).toBe(42);

    const err = await fromPromise(Promise.reject(new Error('x')));
    expect(err.ok).toBe(false);
  });

  it('fromTry', () => {
    const ok = fromTry(() => 42);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(ok.value).toBe(42);

    const err = fromTry(() => {
      throw new Error('x');
    });
    expect(err.ok).toBe(false);
  });
});
