/**
 * Event Contract Tests (12)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  validateEventContracts,
  buildEventPublisherMap,
  buildEventSubscriberMap,
  extractEventContracts,
  runEventValidationUseCase,
} from '../src/index.js';
import { sampleManifests, brokenEventManifests, makeDeps } from './helpers.js';

describe('Event Contracts', () => {
  let manifests = sampleManifests();

  beforeEach(() => { manifests = sampleManifests(); });

  it('builds publisher map correctly', () => {
    const map = buildEventPublisherMap(manifests);
    expect(map.get('auth.login.success')).toEqual(['identity']);
    expect(map.get('user.created')).toEqual(['user']);
    expect(map.get('policy.created')).toEqual(['policy']);
  });

  it('builds subscriber map correctly', () => {
    const map = buildEventSubscriberMap(manifests);
    expect(map.get('identity.account.created')).toEqual(['user']);
    expect(map.get('organization.archived')).toEqual(['catalog', 'pricing']);
  });

  it('validates clean event contracts as pass', () => {
    const results = validateEventContracts(manifests);
    const cleanManifests = [
      ...manifests,
      {
        id: 'identity-event-fixer', name: 'Fixer', version: '0.1.0', phase: 1,
        depends_on: [], provides: [],
        events_emitted: ['identity.account.created'],
        events_subscribed: [],
      },
    ];
    const results2 = validateEventContracts(cleanManifests);
    const accountCreated = results2.find((r) => r.eventType === 'identity.account.created');
    expect(accountCreated?.hasPublisher).toBe(true);
    expect(accountCreated?.status).toBe('pass');
  });

  it('detects orphaned subscribers (subscribed event with no publisher)', () => {
    const broken = brokenEventManifests();
    const results = validateEventContracts(broken);
    const nonexistent = results.find((r) => r.eventType === 'b.nonexistent');
    expect(nonexistent).toBeDefined();
    expect(nonexistent?.hasPublisher).toBe(false);
    expect(nonexistent?.orphanedSubscribers).toEqual(['engine-a']);
    expect(nonexistent?.status).toBe('fail');
  });

  it('flags events with no subscribers as warning', () => {
    const results = validateEventContracts(manifests);
    const noSubs = results.filter((r) => r.hasPublisher && !r.hasSubscribers);
    expect(noSubs.length).toBeGreaterThan(0);
    expect(noSubs.every((r) => r.status === 'warning')).toBe(true);
  });

  it('correctly identifies publisher and subscriber relationship', () => {
    const results = validateEventContracts(manifests);
    const orgArchived = results.find((r) => r.eventType === 'organization.archived');
    expect(orgArchived?.publisher).toBe('organization');
    expect(orgArchived?.subscribers).toContain('catalog');
    expect(orgArchived?.subscribers).toContain('pricing');
  });

  it('sorts results by eventType', () => {
    const results = validateEventContracts(manifests);
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.eventType.localeCompare(results[i - 1]!.eventType)).toBeGreaterThanOrEqual(0);
    }
  });

  it('extracts structured EventContract objects', () => {
    const contracts = extractEventContracts(manifests);
    expect(contracts.length).toBeGreaterThan(0);
    const authLogin = contracts.find((c) => c.eventType === 'auth.login.success');
    expect(authLogin?.engineId).toBe('identity');
    expect(authLogin?.schemaRef).toBe('auth.login.success.v1');
  });

  it('handles engines with no events', () => {
    const noEventManifests = [{
      id: 'bare', name: 'Bare', version: '0.1.0', phase: 1,
      depends_on: [], provides: ['bare'],
      events_emitted: [], events_subscribed: [],
    }];
    const results = validateEventContracts(noEventManifests);
    expect(results).toHaveLength(0);
  });

  it('runs event validation use case and saves results', async () => {
    const deps = makeDeps(manifests);
    const r = await runEventValidationUseCase(deps);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.length).toBeGreaterThan(0);
    }
    const stored = await deps._resultStore.getEventResults();
    expect(stored.length).toBeGreaterThan(0);
  });

  it('handles multiple publishers of same event', () => {
    const multiPub = [
      ...manifests,
      {
        id: 'org2', name: 'Org2', version: '0.1.0', phase: 3,
        depends_on: [], provides: [],
        events_emitted: ['organization.created'],
        events_subscribed: [],
      },
    ];
    const map = buildEventPublisherMap(multiPub);
    expect(map.get('organization.created')?.length).toBe(2);
  });

  it('returns empty maps for empty manifests', () => {
    const pubMap = buildEventPublisherMap([]);
    const subMap = buildEventSubscriberMap([]);
    expect(pubMap.size).toBe(0);
    expect(subMap.size).toBe(0);
  });
});
