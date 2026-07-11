/**
 * result/examples/01-basic.ts
 */

import { Ok, Err, map, flatMap, isOk, isErr, type Result } from '../index.js';

// 1. Ok/Err (명시적 타입)
const success: Result<number, Error> = Ok(42);
const failure: Result<number, Error> = Err(new Error('Something went wrong'));

console.log('Success:', isOk(success), success.ok ? success.value : null);
console.log('Failure:', isErr(failure), failure.ok ? null : failure.error.message);

// 2. map
const doubled = map(success, (x) => x * 2);
console.log('Doubled:', doubled.ok ? doubled.value : null);

// 3. flatMap (async)
async function example() {
  const result = await flatMap(success, async (x) => Ok(x + 10));
  console.log('flatMap:', result.ok ? result.value : null);
}

example();
