import type { IGeoRepository, GeoPoint, Address } from '../interfaces/index.js';
import { encodeGeohash } from '../domain/geohash.js';

/**
 * In-Memory Geo Repository — 개발/테스트용.
 *
 * 실제 운영 환경에서는 Google Maps, MapBox, OpenStreetMap Nominatim 등으로 교체.
 * 이 구현은 좌표가 있으면 geohash를 계산해서 반환한다.
 */
export class InMemoryGeoRepository implements IGeoRepository {
  /** Known coordinates (address string → GeoPoint) */
  private readonly geocodeCache = new Map<string, GeoPoint>();

  /**
   * Forward geocode: address string → coordinates
   *
   * 실제 구현에서는 외부 API 호출.
   * 여기서는 캐시된 데이터 또는 null 반환.
   */
  async forward(address: string): Promise<GeoPoint | null> {
    const key = address.toLowerCase().trim();
    const cached = this.geocodeCache.get(key);
    if (cached) return { ...cached };

    // Default: return null (no external API in dev mode)
    return null;
  }

  /**
   * Reverse geocode: coordinates → address
   *
   * 실제 구현에서는 외부 API 호출.
   * 여기서는 geohash만 계산해서 반환.
   */
  async reverse(lat: number, lng: number): Promise<Partial<Address> | null> {
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }

    return {
      geo: {
        latitude: lat,
        longitude: lng,
        altitude: null,
        accuracy: null,
        geohash: encodeGeohash(lat, lng, 9),
      },
    };
  }

  /**
   * Add known address → coordinate mapping (테스트용)
   */
  addKnown(address: string, lat: number, lng: number): void {
    this.geocodeCache.set(address.toLowerCase().trim(), {
      latitude: lat,
      longitude: lng,
      altitude: null,
      accuracy: null,
      geohash: encodeGeohash(lat, lng, 9),
    });
  }
}
