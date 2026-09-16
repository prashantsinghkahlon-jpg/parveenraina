import { ValidationFlag, Geofence, LocationRecord } from '../types';

/**
 * Calculates Great-Circle distance between two coordinates in meters using the Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates speed in km/h between two timestamped coordinates
 */
export function calculateSpeedKmh(
  lat1: number,
  lon1: number,
  time1: string | number,
  lat2: number,
  lon2: number,
  time2: string | number
): number {
  const t1 = typeof time1 === 'string' ? new Date(time1).getTime() : time1;
  const t2 = typeof time2 === 'string' ? new Date(time2).getTime() : time2;
  const deltaSeconds = Math.abs(t2 - t1) / 1000;

  if (deltaSeconds <= 0) return 0;

  const distanceMeters = calculateDistanceMeters(lat1, lon1, lat2, lon2);
  const speedMps = distanceMeters / deltaSeconds;
  return speedMps * 3.6; // Convert m/s to km/h
}

/**
 * Checks if a point is within a geofence radius
 */
export function isWithinGeofence(
  lat: number,
  lng: number,
  geofence: Geofence
): { inside: boolean; distanceMeters: number } {
  const dist = calculateDistanceMeters(lat, lng, geofence.latitude, geofence.longitude);
  return {
    inside: dist <= geofence.radiusMeters,
    distanceMeters: dist,
  };
}

/**
 * Validates a newly captured GPS location against historical context & rules
 */
export function validateGpsRecord(
  current: {
    latitude: number;
    longitude: number;
    accuracy: number;
    capturedAt: string;
  },
  previousRecord: LocationRecord | null,
  geofence: Geofence | null,
  thresholds: {
    maxAcceptableAccuracy: number;
    suspiciousSpeedLimitKmh: number;
  }
): ValidationFlag[] {
  const flags: ValidationFlag[] = [];

  // 1. Accuracy Check
  if (current.accuracy > thresholds.maxAcceptableAccuracy) {
    flags.push('LOW_GPS_ACCURACY');
  }

  // 2. Velocity & Jump Check relative to previous point
  if (previousRecord) {
    const distMeters = calculateDistanceMeters(
      previousRecord.latitude,
      previousRecord.longitude,
      current.latitude,
      current.longitude
    );
    const speedKmh = calculateSpeedKmh(
      previousRecord.latitude,
      previousRecord.longitude,
      previousRecord.capturedAt,
      current.latitude,
      current.longitude,
      current.capturedAt
    );

    const prevTime = new Date(previousRecord.capturedAt).getTime();
    const currTime = new Date(current.capturedAt).getTime();
    const deltaMinutes = (currTime - prevTime) / 60000;

    // Suspicious speed
    if (speedKmh > thresholds.suspiciousSpeedLimitKmh) {
      flags.push('SUSPICIOUS_SPEED');
    }

    // Unusual jump (> 5km in under 2 minutes)
    if (distMeters > 5000 && deltaMinutes < 2 && speedKmh > 150) {
      flags.push('UNUSUAL_LOCATION_JUMP');
    }
  }

  // 3. Geofence Check
  if (geofence) {
    const check = isWithinGeofence(current.latitude, current.longitude, geofence);
    if (!check.inside) {
      flags.push('OUTSIDE_GEOFENCE');
    }
  }

  // 4. If any flags present, tag as requiring manual review
  if (flags.length > 0) {
    flags.push('MANUAL_REVIEW_REQUIRED');
  } else {
    flags.push('NORMAL');
  }

  return Array.from(new Set(flags));
}

/**
 * High-accuracy Geolocation promise with timeout and fallback
 */
export function getCurrentPositionPromise(
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 12000,
    maximumAge: 0,
  }
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}
