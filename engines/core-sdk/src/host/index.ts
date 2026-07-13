/**
 * host/ — BFF / Host Gateway Architecture
 *
 * 사장님 Host Layer 확립 (2026-07-13):
 * "BFF는 Platform Engine이 아닙니다. Host Layer입니다.
 *  Pure Presentation API — 비즈니스 로직, 도메인 소유권, 영속성을 갖지 않습니다.
 *  오직 Aggregation, Batching, Caching, Streaming을 통한 Presentation 최적화만 책임집니다."
 *
 * 본 모듈은 Backend-for-Frontend(BFF) Gateway의 표현 타입과 쿼리 헬퍼를 정의합니다.
 * Platform Engine들이 비즈니스 로직을 소유하며, Host Gateway는 이들을 orchestration만 합니다.
 */

import { randomUUID } from 'node:crypto';

/**
 * BFFProtocol — Host Gateway가 지원하는 프로토콜.
 */
export type BFFProtocol =
  | 'rest'
  | 'graphql'
  | 'server-actions'
  | 'edge-functions';

/**
 * FrontendFramework — Host Gateway가 서빙하는 프론트엔드 프레임워크.
 */
export type FrontendFramework =
  | 'nextjs'
  | 'react'
  | 'vue'
  | 'flutter'
  | 'native';

/**
 * HostGatewayConfig — Host Gateway 인스턴스 설정.
 * streaming, caching, batch query, aggregation 토글을 포함합니다.
 */
export interface HostGatewayConfig {
  /** 사용 프로토콜 */
  readonly protocol: BFFProtocol;
  /** 지원 프론트엔드 프레임워크 목록 */
  readonly frameworks: readonly FrontendFramework[];
  /** 응답 streaming 활성화 */
  readonly streamingEnabled: boolean;
  /** 응답 caching 활성화 */
  readonly cachingEnabled: boolean;
  /** batch query 활성화 (여러 쿼리를 단일 라운드트립으로) */
  readonly batchQueryEnabled: boolean;
  /** aggregation 활성화 (여러 Engine 결과 병합) */
  readonly aggregationEnabled: boolean;
}

/**
 * BFFQuery — Host Gateway를 통한 단일 Engine 쿼리 표현.
 * 비즈니스 로직을 포함하지 않으며, 대상 Engine의 operation을 선언적으로 참조합니다.
 */
export interface BFFQuery {
  /** 쿼리 ID (traceability) */
  readonly id: string;
  /** tenant ID (Multi-tenancy) */
  readonly tenantId: string;
  /** 대상 Platform Engine (예: 'identity', 'content', 'discovery') */
  readonly engine: string;
  /** 수행 operation (예: 'getProfile', 'listContent') */
  readonly operation: string;
  /** operation 파라미터 */
  readonly params: Record<string, unknown>;
  /** locale (optional — exactOptionalPropertyTypes 호환) */
  readonly locale?: string | undefined;
  /** projection fields (optional) */
  readonly fields?: readonly string[] | undefined;
}

/**
 * BFFQueryResult — 단일 BFFQuery의 실행 결과.
 * cacheHit, latencyMs, traceId를 포함하여 관측성(observability)을 보장합니다.
 */
export interface BFFQueryResult {
  /** 원본 쿼리 ID */
  readonly queryId: string;
  /** 결과 데이터 (Host는 도메인을 모르므로 unknown) */
  readonly data: unknown;
  /** cache hit 여부 */
  readonly cacheHit: boolean;
  /** 실행 지연 (ms) */
  readonly latencyMs: number;
  /** 분산 추적 ID */
  readonly traceId: string;
}

/**
 * BFFBatchQuery — 여러 BFFQuery를 단일 라운드트립으로 묶은 배치 요청.
 */
export interface BFFBatchQuery {
  /** tenant ID (배치 전체 공통) */
  readonly tenantId: string;
  /** 개별 쿼리 목록 */
  readonly queries: readonly BFFQuery[];
  /** locale (optional — 배치 전체 공통) */
  readonly locale?: string | undefined;
}

/**
 * BFFBatchResult — 배치 쿼리 실행 결과.
 */
export interface BFFBatchResult {
  /** 개별 쿼리 결과 목록 (입력 순서 보존) */
  readonly results: readonly BFFQueryResult[];
  /** 배치 전체 지연 (가장 느린 쿼리 기준) */
  readonly totalLatencyMs: number;
}

/**
 * AggregationPattern — 여러 Engine 쿼리 결과를 병합하는 패턴 선언.
 * Host Gateway는 비즈니스 로직 없이 선언된 transform(spec)만 실행합니다.
 * transform은 Engine 구현체가 아닌 Host가 해석하는 표현식(예: JSONPath, JMESPath)입니다.
 */
export interface AggregationPattern {
  /** aggregation 이름 (예: 'landingPageFeed') */
  readonly name: string;
  /** 소스 쿼리 참조 (BFFQuery.id 또는 operation label) */
  readonly sourceQueries: readonly string[];
  /** transform 표현식 (Host가 해석) */
  readonly transform: string;
  /** aggregation 결과 cache TTL (seconds) */
  readonly cacheTtl: number;
}

/**
 * CachingStrategy — Host Gateway 캐싱 전략.
 * Multi-tier(l1-memory / l2-redis / l3-cdn)와 invalidation key를 지원합니다.
 */
export interface CachingStrategy {
  /** 캐시 tier */
  readonly tier: 'l1-memory' | 'l2-redis' | 'l3-cdn';
  /** TTL (seconds) */
  readonly ttlSeconds: number;
  /** invalidation key 목록 (예: ['tenant:123', 'profile:456']) */
  readonly invalidationKeys: readonly string[];
  /** stale-while-revalidate 허용 여부 */
  readonly staleWhileRevalidate: boolean;
}

/**
 * StreamingStrategy — 응답 streaming 전략.
 * chunkSize, flushIntervalMs로 제어되며, 실패 시 buffered 응답으로 폴백합니다.
 */
export interface StreamingStrategy {
  /** streaming 활성화 */
  readonly enabled: boolean;
  /** chunk 크기 (bytes) */
  readonly chunkSize: number;
  /** flush 주기 (ms) */
  readonly flushIntervalMs: number;
  /** streaming 실패 시 buffered 응답 폴백 */
  readonly fallbackToBuffered: boolean;
}

/**
 * HostGatewaySpec — Host Gateway의 완전한 명세.
 * 엔드포인트 목록, 캐싱/스트리밍/aggregation 전략을 하나의 declarative spec으로 표현합니다.
 */
export interface HostGatewaySpec {
  /** 사용 프로토콜 */
  readonly protocol: BFFProtocol;
  /** 엔드포인트 목록 (path, method, engine, operation, auth) */
  readonly endpoints: readonly HostGatewayEndpoint[];
  /** 캐싱 전략 목록 */
  readonly caching: readonly CachingStrategy[];
  /** streaming 전략 */
  readonly streaming: StreamingStrategy;
  /** aggregation 패턴 목록 */
  readonly aggregations: readonly AggregationPattern[];
}

/**
 * HostGatewayEndpoint — 단일 엔드포인트 명세.
 * (HostGatewaySpec.endpoints의 원소 타입)
 */
export interface HostGatewayEndpoint {
  /** URL path (예: '/api/profile/:id') */
  readonly path: string;
  /** HTTP method */
  readonly method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** 위임 대상 Platform Engine */
  readonly engine: string;
  /** 수행 operation */
  readonly operation: string;
  /** 인증 요구사항 (예: 'session', 'api-key', 'public') */
  readonly auth: string;
}

/**
 * DEFAULT_BFF_CONFIG — nextjs 기반, streaming + caching + batch 활성화 기본 설정.
 * 신규 Host Gateway 인스턴스의 sensible default로 사용합니다.
 */
export const DEFAULT_BFF_CONFIG: HostGatewayConfig = {
  protocol: 'rest',
  frameworks: ['nextjs'],
  streamingEnabled: true,
  cachingEnabled: true,
  batchQueryEnabled: true,
  aggregationEnabled: false,
} as const;

/**
 * createBFFQuery — BFFQuery 팩토리 헬퍼.
 * UUID v7(가능한 경우) 또는 randomUUID로 쿼리 ID를 생성하고,
 * exactOptionalPropertyTypes 호환을 위해 optional 필드를 conditional spread 합니다.
 *
 * @param tenantId tenant ID
 * @param engine 대상 Engine
 * @param operation 수행 operation
 * @param params operation 파라미터 (기본값: 빈 객체)
 * @returns BFFQuery
 */
export function createBFFQuery(
  tenantId: string,
  engine: string,
  operation: string,
  params?: Record<string, unknown>,
): BFFQuery {
  const base = {
    id: randomUUID(),
    tenantId,
    engine,
    operation,
    params: params ?? {},
  } satisfies Pick<BFFQuery, 'id' | 'tenantId' | 'engine' | 'operation' | 'params'>;

  // exactOptionalPropertyTypes: true 호환 — undefined를 값으로 가지는 prop을 만들지 않습니다.
  return base;
}

/**
 * READ_OPERATIONS_PREFIXES — shouldCache가 캐싱 대상으로 간주하는 read operation 접두사.
 * 사장님 확립: "read operation(get/find/list)만 캐싱하고, write operation은 캐싱하지 마세요."
 */
const READ_OPERATION_PREFIXES = ['get', 'find', 'list'] as const;

/**
 * shouldCache — operation 이름이 read operation인지 판별하여 캐싱 여부 반환.
 * get*, find*, list* 접두사를 가진 operation만 캐싱합니다.
 * create/update/delete/patch 등 write operation은 항상 false를 반환합니다.
 *
 * @example
 * shouldCache('getProfile') // true
 * shouldCache('listContent') // true
 * shouldCache('updateProfile') // false
 */
export function shouldCache(operation: string): boolean {
  if (!operation || operation.length === 0) {
    return false;
  }
  const normalized = operation.toLowerCase();
  for (const prefix of READ_OPERATION_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      return true;
    }
  }
  return false;
}
