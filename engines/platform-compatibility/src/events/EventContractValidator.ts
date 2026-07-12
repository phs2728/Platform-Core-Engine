/**
 * Event Contract Validator
 *
 * Verifies that every event emitted by an engine has a valid publisher,
 * and every event subscribed to by an engine actually exists somewhere
 * in the platform (no orphan subscribers).
 */

import type {
  EngineManifest,
  EventContractResult,
  EventContract,
} from '../interfaces/index.js';

/**
 * Build a map of eventType → publisher engine IDs.
 */
export function buildEventPublisherMap(
  manifests: EngineManifest[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const m of manifests) {
    for (const evt of m.events_emitted) {
      const existing = map.get(evt) ?? [];
      existing.push(m.id);
      map.set(evt, existing);
    }
  }
  return map;
}

/**
 * Build a map of eventType → subscriber engine IDs.
 */
export function buildEventSubscriberMap(
  manifests: EngineManifest[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const m of manifests) {
    for (const evt of m.events_subscribed) {
      const existing = map.get(evt) ?? [];
      existing.push(m.id);
      map.set(evt, existing);
    }
  }
  return map;
}

/**
 * Validate all event contracts across the platform.
 */
export function validateEventContracts(
  manifests: EngineManifest[],
): EventContractResult[] {
  const publisherMap = buildEventPublisherMap(manifests);
  const subscriberMap = buildEventSubscriberMap(manifests);
  const allEventTypes = new Set<string>([
    ...publisherMap.keys(),
    ...subscriberMap.keys(),
  ]);

  const results: EventContractResult[] = [];

  for (const eventType of allEventTypes) {
    const publishers = publisherMap.get(eventType) ?? [];
    const subscribers = subscriberMap.get(eventType) ?? [];
    const hasPublisher = publishers.length > 0;
    const hasSubscribers = subscribers.length > 0;

    const orphanedSubscribers = hasSubscribers && !hasPublisher
      ? subscribers
      : [];

    let status: 'pass' | 'fail' | 'warning' = 'pass';
    if (!hasPublisher && hasSubscribers) {
      status = 'fail';
    } else if (hasPublisher && !hasSubscribers) {
      status = 'warning'; // event emitted but nobody listens — not critical
    }

    results.push({
      eventType,
      publisher: publishers[0] ?? '',
      subscribers,
      hasPublisher,
      hasSubscribers,
      orphanedSubscribers,
      status,
    });
  }

  // Sort by eventType for deterministic output
  results.sort((a, b) => a.eventType.localeCompare(b.eventType));
  return results;
}

/**
 * Extract EventContract objects from manifests for the compatibility matrix.
 */
export function extractEventContracts(
  manifests: EngineManifest[],
): EventContract[] {
  const subscriberMap = buildEventSubscriberMap(manifests);
  const contracts: EventContract[] = [];

  for (const m of manifests) {
    for (const evt of m.events_emitted) {
      contracts.push({
        eventType: evt,
        engineId: m.id,
        version: m.version,
        schemaRef: `${evt}.v1`,
        subscribers: subscriberMap.get(evt) ?? [],
      });
    }
  }

  return contracts.sort((a, b) => a.eventType.localeCompare(b.eventType));
}
