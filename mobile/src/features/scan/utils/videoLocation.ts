import * as Location from "expo-location";

import type { VideoLocation } from "../../../types/video";

/** How long a fresh GPS fix may take before we give up and omit the location. */
const FIX_TIMEOUT_MS = 6_000;

/** A recent cached fix is accurate enough for weather (the API buckets ~1 km). */
const LAST_KNOWN_MAX_AGE_MS = 5 * 60_000;

/** Resolves to `null` instead of rejecting when the fix takes too long. */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
  new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);

    const settle = (value: T | null) => {
      clearTimeout(timer);
      resolve(value);
    };

    promise.then(settle, () => settle(null));
  });

/**
 * Best-effort capture coordinates for the weather context of an analysis.
 *
 * This never prompts for permission: the Home dashboard already asks for
 * foreground location on mount, so Analyze only uses access the user has
 * already granted. Anything that goes wrong (denied, services off, timeout)
 * resolves to `undefined`, and the backend falls back to the default farm
 * location — an analysis must never be blocked by location.
 */
export async function getVideoLocation(): Promise<VideoLocation | undefined> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();

    if (!permission.granted) return undefined;
    if (!(await Location.hasServicesEnabledAsync())) return undefined;

    // Prefer a recent cached fix so tapping Analyze does not wait for GPS;
    // fall back to a fresh one only when the cache is empty or stale.
    const position =
      (await Location.getLastKnownPositionAsync({
        maxAge: LAST_KNOWN_MAX_AGE_MS,
      })) ??
      (await withTimeout(
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        FIX_TIMEOUT_MS,
      ));

    if (!position) return undefined;

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch {
    return undefined;
  }
}
