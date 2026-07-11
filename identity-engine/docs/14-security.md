# Identity Engine — Security Policy

**Version**: v1.0
**Status**: Frozen (사장님 확립, 2026-07-11)
**Companion to**: [14-security.md](./14-security.md), [13-configuration.md](./13-configuration.md)

---

## 0. 문서 위치

이 문서는 **Identity Engine이 따르는 모든 보안 정책과 위협 대응**을 정의합니다.

- **데이터 보호**: 암호화, 저장, 전송
- **인증 보안**: 비밀번호, 토큰, 세션
- **인가**: Tenant 격리, RLS
- **감사**: Audit Log 무결성
- **위협 모델**: STRIDE 기반

---

## 1. 보안 원칙 (사장님 확립)

```
1. Defense in Depth — 한 가지 방어선에 의존하지 않는다
2. Least Privilege — 최소 권한만 부여
3. Fail Securely — 실패 시 안전하게 (lockout > open access)
4. Encrypt Everything Sensitive — 평문은 비밀번호뿐 아니라 PII도
5. Audit Everything — 모든 보안 이벤트 기록
6. Secure by Default — 기본값은 가장 안전한 옵션
```

---

## 2. 위협 모델 (STRIDE)

### 2.1 STRIDE 분류

| 범주 | 위협 | 대응 |
|---|---|---|
| **Spoofing (위장)** | 신원 위장 | 비밀번호 + MFA, JWT 서명, OAuth state |
| **Tampering (변조)** | 데이터 변조 | RLS, Audit hash chain, 암호화 |
| **Repudiation (부인)** | 액션 부인 | Audit log (append-only) |
| **Information Disclosure (정보 누설)** | 데이터 유출 | 암호화, 최소 로깅, 마스킹 |
| **Denial of Service (서비스 거부)** | 가용성 침해 | Rate limit, CAPTCHA, lockout |
| **Elevation of Privilege (권한 상승)** | 관리자 권한 탈취 | Tenant 격리, RLS, Admin 2FA |

### 2.2 구체적 위협 + 대응

| 위협 | 시나리오 | 대응 |
|---|---|---|
| 비밀번호 무차별 대입 | 100만번 시도 | Argon2id (느림) + Rate limit + Account lock |
| 비밀번호 DB 유출 | DB dump | Argon2id (비역함수) |
| API Key DB 유출 | DB dump | AES-256-GCM (KMS 키 분리) |
| 세션 토큰 가로채기 | XSS / 네트워크 | HttpOnly Secure SameSite cookie + 짧은 TTL |
| JWT 서명 키 유출 | 서버 침해 | 정기 키 회전 + JWKS |
| OAuth state 누락 | CSRF | state 생성 + 검증 (Redis 10분 TTL) |
| Open redirect | redirect_uri 조작 | allowlist + exact match |
| Email enumeration | 회원가입/리셋 응답 차이 | 동일 응답 + 동일 시간 (constant time) |
| Audit log 변조 | 내부자 | append-only + hash chain |
| Tenant 간 데이터 누출 | RLS 우회 시도 | engine 코드도 tenant_id 명시 + RLS |

---

## 3. 데이터 분류 및 보호

### 3.1 분류표

| 분류 | 정의 | 예시 | 처리 |
|---|---|---|---|
| **Critical Secret** | 유출 시 즉각 피해 | 비밀번호, OAuth Client Secret, API Key | Argon2id / AES-256-GCM |
| **Sensitive PII** | 유출 시 GDPR 위반 | 이메일, 전화번호, IP | 결정적 암호화 (검색 가능) |
| **Internal** | 인증 책임 메타데이터 | User ID, Session ID, Tenant ID | 평문 (FK) |
| **Public** | 누구나 봐도 무관 | (저장 안 함) | — |

### 3.2 비밀번호

```
저장: Argon2id
  - 메모리: 64 MiB (65536 KB)
  - iterations: 3
  - parallelism: 1
  - salt: 16 bytes (각 비밀번호별 unique)
  - 출력 형식: $argon2id$v=19$m=65536,t=3,p=1$<salt-b64>$<hash-b64>

검증: Argon2id.verify(stored, candidate)
  - 시간: ~200-500ms (1회)
  - 실패 시 동일 시간 반환 (timing attack 방지)

전송: TLS 1.2+
  - 평문 password는 네트워크에만 존재, 메모리에서 즉시 GC

로깅: 절대 금지
  - 비밀번호 입력/해시/검증 모두 로깅 대상 제외

표시: 절대 금지
  - Admin Console에서도 표시 안 함
```

### 3.3 PII (Email, Phone)

```
저장: 결정적 암호화 (AES-SIV)
  - 같은 평문 → 같은 ciphertext (검색 가능)
  - 키: KMS (테넌트별 키 분리 권장)
  - 출력: base64

검색용: HMAC-SHA256(identifier, hash_pepper)
  - 결정적이지만 키 분리로 복호화 불가
  - Pepper는 env 또는 KMS

검색 흐름:
  login(email)
    → normalizeEmail(email)
    → hmacSha256(normalized, hash_pepper)
    → SELECT WHERE identifier_hash = $hmac

표시: 마스킹
  - "t***@example.com"
  - "+995****3456"

로깅: 마스킹 또는 hash만
  - log.info("login attempt", { identifierHash: "..." })
```

### 3.4 API Key / OAuth Secret

```
저장: AES-256-GCM
  - keyId: KMS 키 ID (테넌트별 가능)
  - iv: 12 bytes (랜덤)
  - authTag: 16 bytes
  - payload: 암호화된 JSON

사용: 호스트가 필요할 때만 복호화
  - 메모리에 평문 노출 최소화
  - 사용 후 즉시 nullify

로깅: 절대 금지
```

### 3.5 세션 토큰

```
생성: 256-bit random (32 bytes)
  → base64url 인코딩
  → 클라이언트에 한 번만 반환

저장: SHA-256(token)
  → DB에는 해시만

검증: 클라이언트가 보낸 토큰 → SHA-256 → DB 조회

회전: 정기 회전 안 함 (1회성 X, 만료되면 폐기)
```

### 3.6 JWT

```
서명: RS256 (2048-bit 또는 4096-bit)
  - 개인키: KMS 또는 env (production)
  - 공개키: JWKS endpoint로 공개

Claims:
  - iss: IDENTITY_JWT_ISSUER
  - aud: IDENTITY_JWT_AUDIENCE
  - sub: userId
  - tenant: tenantId
  - iat: issued at
  - exp: expires (15분)
  - jti: JWT ID (revocation 추적용)

검증:
  - 서명 검증
  - iss / aud 확인
  - exp 확인
  - jti가 revocation list에 없는지 확인

Revocation:
  - jti blacklist (Redis) — 비밀번호 변경/계정 잠금 시
```

### 3.7 TOTP Secret

```
저장: AES-256-GCM
  - 평문 노출 최소화

사용: User가 등록한 Authenticator App과 동기
  - 매 로그인마다 새 6자리 코드 생성
  - 서버는 시간 window ±1 내에서 검증

회전: 사용자 요청 시 또는 Admin reset
```

---

## 4. 전송 보안

### 4.1 TLS

| 통신 | TLS 버전 |
|---|---|
| Client → API | TLS 1.2+ (TLS 1.3 권장) |
| API → Postgres | TLS 1.2+ (또는 VPC 내부) |
| API → Redis | TLS 1.2+ (rediss://) |
| API → KMS | mTLS 또는 VPC endpoint |
| API → OAuth Provider | TLS 1.2+ |
| API → Email/SMS | TLS 1.2+ (SMTP over TLS, HTTPS) |

### 4.2 HTTP Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...

(Set-Cookie):
  HttpOnly
  Secure
  SameSite=Lax (또는 Strict)
  Path=/
```

### 4.3 CORS

```
허용 Origin: 화이트리스트 (Tenant별 또는 글로벌)
자격증명 포함: 명시적 Origin만
Preflight 캐시: max-age=86400
```

---

## 5. Rate Limiting

### 5.1 정책 (기본값)

| Endpoint | Per IP | Per Identifier | Per Tenant |
|---|---|---|---|
| `POST /auth/login` | 5/15min | 10/15min | 1000/15min |
| `POST /auth/register` | 3/1h | (no identifier check) | 100/1h |
| `POST /auth/password/reset` | 3/1h | 3/1h | 100/1h |
| `POST /auth/verify/email/request` | 5/1h | 3/1h | 1000/1h |
| `POST /auth/verify/sms/request` | 5/1h | 3/1h | 100/1h |
| `POST /auth/2fa/verify` | 10/15min | 10/15min | 500/15min |
| `POST /auth/oauth/{provider}/callback` | 10/1min | — | 1000/1min |
| `GET /auth/*` | 60/1min | — | 5000/1min |

> 모든 정책은 Tenant별 조정 가능.

### 5.2 구현

```
Redis Lua script (atomic):
  local current = redis.call('INCR', KEYS[1])
  if current == 1 then
    redis.call('EXPIRE', KEYS[1], ARGV[1])
  end
  return current

key format: `rl:<scope>:<scopeValue>:<route>:<window_bucket>`
window_bucket = floor(now / windowSeconds)
```

### 5.3 429 응답

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 123
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1234567890

{
  "code": "IDENTITY_RATE_LIMITED",
  "messageId": "auth.rate_limit.exceeded",
  "details": {
    "scope": "ip",
    "limit": 5,
    "windowSeconds": 900,
    "retryAfter": 123
  }
}
```

---

## 6. CAPTCHA

### 6.1 정책

```
기본: 비활성화
활성화 조건:
  - Tenant 정책 captchaEnabled = true
  - 또는 연속 실패가 captchaTriggerAfterFailures 초과 시

지원 Provider:
  - hCaptcha
  - reCAPTCHA v2/v3
  - Cloudflare Turnstile
```

### 6.2 흐름

```
1. Use Case 진입
2. captchaRequired 체크 (정책 OR 실패 횟수)
3. 필요 시 captchaToken 검증 (Provider API 호출)
4. 실패 시 → IDENTITY_CAPTCHA_FAILED + audit
5. 성공 시 → 다음 단계
```

---

## 7. Account Lockout

### 7.1 정책

```
트리거: loginMaxFailures (기본 5) 연속 실패
잠금: lockDurationMinutes (기본 30)
해제:
  - 시간 경과
  - 관리자 unlock
  - 비밀번호 재설정 완료

부수 효과:
  - 모든 활성 세션 revoke
  - 새 로그인 시도 거부 (올바른 비밀번호여도)
  - Audit log 기록
```

### 7.2 응답

```json
{
  "code": "IDENTITY_ACCOUNT_LOCKED",
  "messageId": "auth.account.locked",
  "details": {
    "lockedUntil": "2026-07-11T08:30:00Z",
    "reason": "max_failures"
  }
}
```

---

## 8. Session Security

### 8.1 정책

```
생성: 로그인 성공 후 (2FA 통과 후)
TTL: sessionTimeoutMinutes (기본 60) OR rememberMeDays (기본 30)
동시 세션: maxConcurrentSessions (null = 무제한)
비활성: lastActiveAt 갱신 (사용 시마다)
만료: expiresAt < now OR lastActiveAt < now - idle_timeout
```

### 8.2 Session Hijacking 방지

```
- HttpOnly Cookie (XSS 방어)
- Secure Cookie (HTTPS만)
- SameSite=Lax/Strict (CSRF 방어)
- IP 변경 감지 → isSuspicious = true (강제 종료 X, 추가 검증만)
- User-Agent 변경 감지 → isSuspicious = true
- Country 변경 감지 → isSuspicious = true + 알림 발송
```

### 8.3 Concurrent Session Control

```
maxConcurrentSessions 초과 시:
  - 가장 오래된 세션 revoke
  - 또는 새 로그인 거부 (정책에 따라)
```

---

## 9. Audit Log 무결성

### 9.1 Append-Only

```
DB 트리거: UPDATE/DELETE 시 EXCEPTION 발생
권한: application role만 INSERT 가능
```

### 9.2 Hash Chain

```
hash_n = SHA-256(
  tenantId || eventType || result || createdAt || prevHash_n-1
)
```

검증:
```
- 정방향: 각 로그의 hash 재계산 → 일치 확인
- 역방향: 각 로그의 prevHash가 이전 로그의 hash와 일치 확인
- 주기적 검증: cron job이 매일 chain integrity 검사
- 불일치 발견: 알림 + incident response
```

### 9.3 Retention

```
audit_retention_days:
  - null = 무기한
  - 정수 N = N일 후 삭제 (법적 요구 우선)
GDPR Right-to-be-Forgotten:
  - User 행 삭제 시 audit_logs.user_id를 NULL로 설정
  - 단, hash chain 무결성을 위해 prev_hash로 연결 유지
  - 또는 event에 "user_erased" 표시 후 user_id NULL
```

---

## 10. 인증 헤더 (호스트용)

### 10.1 Session Token

```
X-Session-Token: sts_<base64url>
또는 Authorization: Bearer sts_<base64url>
또는 Cookie: session=sts_<base64url>; HttpOnly; Secure
```

### 10.2 JWT

```
Authorization: Bearer <jwt>
```

### 10.3 Tenant Resolution

```
X-Tenant-Id: <uuid>
또는 서브도메인 (acme.example.com → tenant "acme")
또는 JWT 클레임 (tenant)
```

---

## 11. SQL Injection 방어

### 11.1 원칙

```
✅ ORM 또는 prepared statements 사용
✅ 모든 입력 zod 검증
✅ 화이트리스트 기반 쿼리 (Raw SQL 금지)
✅ 테이블명/컬럼명은 enum으로 제한
```

### 11.2 금지 패턴

```
❌ String concatenation in queries
❌ Dynamic table/column names from user input
❌ "WHERE id = " + userInput
❌ exec(userInput)
```

---

## 12. XSS 방어

### 12.1 입력 검증

```
- Email: 정규식 검증
- Username: [a-z0-9_-] only
- Display Name: 엔진이 저장 안 함 (호스트 책임)
- 코드/토큰: 4-10자리 alphanumeric
```

### 12.2 출력

```
- 엔진은 사용자 친화적 메시지 ID만 반환
- 호스트가 자기 i18n + 출력 인코딩 (React는 기본 escape)
```

---

## 13. CSRF 방어

### 13.1 정책

```
- SameSite=Lax Cookie (기본 방어)
- State-changing 요청은 CSRF token 요구 (호스트 책임)
- OAuth callback은 state 검증 (Identity Engine 책임)
```

---

## 14. Penetration Testing (주기)

| 주기 | 종류 | 도구 |
|---|---|---|
| PR마다 | 정적 분석 (SAST) | ESLint security plugin, Semgrep |
| 주 1회 | 의존성 취약점 스캔 | npm audit, Snyk, Dependabot |
| 분기 1회 | 동적 분석 (DAST) | OWASP ZAP, Burp Suite |
| 연 1회 | 침투 테스트 (외부) | 전문가 |
| 연 1회 | 보안 감사 (감사 로그 검토) | 내부 |

---

## 15. Incident Response

### 15.1 탐지

```
- Audit log 패턴 분석 (실패 급증, 새 지역 다수 로그인)
- 메트릭 알림 (failed_login_rate > threshold)
- 의존성 CVE 알림
```

### 15.2 대응

```
1. 영향 범위 특정 (tenantId, userId, time range)
2. 해당 세션 강제 종료
3. 해당 사용자 계정 lock
4. Credentials rotate (JWT 키, OAuth client secret 등)
5. Audit log에 incident 기록
6. 사용자/관리자 알림
```

### 15.3 사후

```
- Post-mortem (사장님 확립: ADR 기록)
- 재발 방지 테스트 추가
- 정책 업데이트
```

---

## 16. [TBD: 사장님 확립 필요]

| 항목 | 기본 제안 |
|---|---|
| Argon2id 파라미터 | m=64MiB, t=3, p=1 |
| JWT 서명 알고리즘 | RS256 |
| JWT 만료 | 15분 |
| Refresh Token 만료 | 30일 |
| Audit Log 보존 | 무기한 |
| 침투 테스트 주기 | 연 1회 (외부) |

---

**End of Security Policy v1.0**