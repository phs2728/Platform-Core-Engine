/**
 * errors/examples/01-basic-usage.ts
 *
 * 사장님 Platform Owner 확립: "Core SDK를 삭제하면 Platform 전체가 깨지는가? YES."
 * → 모든 Engine이 이 패턴을 사용.
 */

import { ValidationError, NotFoundError, AuthenticationError } from '../index.js';

// 1. ValidationError — 입력 검증 실패
function createUser(name: string, email: string) {
  if (!email.includes('@')) {
    throw new ValidationError('Invalid email format', {
      details: { field: 'email', value: email },
    });
  }
  return { name, email };
}

// 2. NotFoundError — 리소스 없음
async function findUser(id: string) {
  const user = null; // 가정: DB 조회
  if (!user) {
    throw new NotFoundError('User not found', {
      details: { resource: 'user', id },
    });
  }
  return user;
}

// 3. AuthenticationError — 인증 실패
function login(email: string, password: string) {
  if (password !== 'correct') {
    throw new AuthenticationError('Invalid credentials', {
      details: { reason: 'invalid_credentials' },
    });
  }
  return { email };
}

// 사용
try {
  createUser('John', 'invalid');
} catch (e) {
  console.log(e);
  // ValidationError: Invalid email format
  //   code: 'PLATFORM_VALIDATION_FAILED', httpStatus: 400, safeToExpose: true
  console.log(JSON.stringify((e as any).toJSON()));
  // {"code":"PLATFORM_VALIDATION_FAILED","message":"Invalid email format","details":{"field":"email","value":"invalid"}}
}
