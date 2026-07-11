/**
 * Geohash Encoder/Decoder
 *
 * Geohash converts lat/lng into a short string.
 * Used for spatial indexing and proximity search.
 */

const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

/**
 * Encode latitude/longitude to geohash string
 */
export function encodeGeohash(
  lat: number,
  lng: number,
  precision: number = 9,
): string {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let hash = '';
  let bits = 0;
  let bit = 0;
  let even = true; // true = longitude, false = latitude

  while (hash.length < precision) {
    if (even) {
      const mid = (minLng + maxLng) / 2;
      if (lng >= mid) {
        bits = (bits << 1) | 1;
        minLng = mid;
      } else {
        bits = (bits << 1);
        maxLng = mid;
      }
    } else {
      const mid = (minLat + maxLat) / 2;
      if (lat >= mid) {
        bits = (bits << 1) | 1;
        minLat = mid;
      } else {
        bits = (bits << 1);
        maxLat = mid;
      }
    }

    even = !even;
    bit++;

    if (bit === 5) {
      hash += BASE32[bits];
      bits = 0;
      bit = 0;
    }
  }

  return hash;
}

/**
 * Decode geohash to { latitude, longitude } bounding box center
 */
export function decodeGeohash(hash: string): {
  latitude: number;
  longitude: number;
} {
  let minLat = -90, maxLat = 90;
  let minLng = -180, maxLng = 180;
  let even = true;

  for (const char of hash) {
    const idx = BASE32.indexOf(char);
    if (idx === -1) continue;

    for (let i = 4; i >= 0; i--) {
      const bit = (idx >> i) & 1;
      if (even) {
        const mid = (minLng + maxLng) / 2;
        if (bit === 1) minLng = mid;
        else maxLng = mid;
      } else {
        const mid = (minLat + maxLat) / 2;
        if (bit === 1) minLat = mid;
        else maxLat = mid;
      }
      even = !even;
    }
  }

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
  };
}

/**
 * Calculate distance between two geo points (Haversine formula)
 * Returns meters
 */
export function distanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371000; // Earth radius (m)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
