/**
 * Result<T, E> — Type-Safe Success/Failure
 *
 * 사장님 Platform Owner 확립 (2026-07-11):
 * "Rust 스타일을 추천합니다. throw를 최소화하세요."
 *
 * 헌법 §C-20: Minor 100% 하위 호환
 */

export type Result<T, E extends Error = Error> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** 성공 Result 생성 */
export function Ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** 실패 Result 생성 */
export function Err<E extends Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** 성공 여부 Type Guard */
export function isOk<T, E extends Error>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok;
}

/** 실패 여부 Type Guard */
export function isErr<T, E extends Error>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok;
}

/** Result.map — 성공 시에만 함수 적용 */
export function map<T, U, E extends Error>(result: Result<T, E>, fn: (value: T) => U): Result<U, E> {
  return result.ok ? Ok(fn(result.value)) : result;
}

/** Result.mapErr — 실패 시에만 에러 변환 */
export function mapErr<T, E extends Error, F extends Error>(
  result: Result<T, E>,
  fn: (error: E) => F,
): Result<T, F> {
  return result.ok ? result : Err(fn(result.error));
}

/** Result.flatMap (비동기) */
export async function flatMap<T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => Promise<Result<U, E>>,
): Promise<Result<U, E>> {
  return result.ok ? await fn(result.value) : result;
}

/** Result.andThen (동기) */
export function andThen<T, U, E extends Error>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> {
  return result.ok ? fn(result.value) : result;
}

/** Result.unwrap — 성공 값 추출 (실패 시 throw) */
export function unwrap<T, E extends Error>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/** Result.unwrapOr — 성공 값 또는 default */
export function unwrapOr<T, E extends Error>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.value : defaultValue;
}

/** Result.fromPromise — Promise를 Result로 변환 */
export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T, Error>> {
  try {
    return Ok(await promise);
  } catch (e) {
    return Err(e instanceof Error ? e : new Error(String(e)));
  }
}

/** Result.fromTry — 동기 함수를 Result로 변환 */
export function fromTry<T>(fn: () => T): Result<T, Error> {
  try {
    return Ok(fn());
  } catch (e) {
    return Err(e instanceof Error ? e : new Error(String(e)));
  }
}

/** Result.sequence — Result 배열을 Result 배열로 변환 */
export function sequence<T, E extends Error>(results: Result<T, E>[]): Result<T[], E> {
  const values: T[] = [];
  for (const r of results) {
    if (!r.ok) return r;
    values.push(r.value);
  }
  return Ok(values);
}
