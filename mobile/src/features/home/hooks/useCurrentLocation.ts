import { useCallback, useEffect, useRef, useState } from "react";
import { Linking } from "react-native";
import * as Location from "expo-location";

/** How long a fresh GPS fix may take before we settle for a cached one. */
const POSITION_TIMEOUT_MS = 12_000;

/** Accept a cached fix up to this old, so the label can appear instantly. */
const LAST_KNOWN_MAX_AGE_MS = 10 * 60_000;

export type LocatedPlace = {
  latitude: number;
  longitude: number;
  /** Human-readable place name, e.g. "Cabanatuan, Nueva Ecija, PH". */
  label: string;
  /** ISO timestamp of the fix this label belongs to. */
  resolvedAt: string;
};

export type LocationStatus = "loading" | "ready" | "denied" | "unavailable";

export type CurrentLocation = {
  status: LocationStatus;
  place: LocatedPlace | null;
  /**
   * False once the OS stops showing the prompt. `refresh` then sends the user
   * to Settings instead of asking again.
   */
  canAskAgain: boolean;
  /** Short, user-facing explanation for the non-ready states. */
  message: string | null;
  /** Re-checks permission and resolves the place name again. */
  refresh: () => void;
};

/** Resolves to `null` instead of rejecting when the promise takes too long. */
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
 * Builds a compact "locality, region, country" label from a geocoded address.
 * Returns `null` when the geocoder gave us nothing usable.
 */
const formatPlaceLabel = (
  address: Location.LocationGeocodedAddress | null | undefined,
): string | null => {
  if (!address) return null;

  const parts: string[] = [];

  const push = (value: string | null | undefined) => {
    const trimmed = value?.trim();
    if (!trimmed) return;
    if (parts.some((part) => part.toLowerCase() === trimmed.toLowerCase())) return;
    parts.push(trimmed);
  };

  push(address.city ?? address.district ?? address.subregion ?? address.name);
  push(address.region);
  push(address.isoCountryCode);

  if (parts.length === 0) push(address.formattedAddress ?? address.street);

  return parts.length > 0 ? parts.join(", ") : null;
};

/**
 * One-shot fix, falling back to the last known position. Indoor GPS can take
 * a while, so we stop waiting after `POSITION_TIMEOUT_MS`.
 */
const locatePosition = async (): Promise<Location.LocationObject | null> => {
  const current = await withTimeout(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
    POSITION_TIMEOUT_MS,
  );

  if (current) return current;

  try {
    return await Location.getLastKnownPositionAsync({
      maxAge: LAST_KNOWN_MAX_AGE_MS,
    });
  } catch {
    return null;
  }
};

/**
 * Foreground location + reverse geocoding for the home dashboard.
 *
 * The permission prompt is shown once on mount (a no-op when the user already
 * granted it). Every later attempt happens only when the user taps the badge,
 * so SIPAT never nags. When the OS no longer allows a prompt, `refresh` opens
 * the Settings app instead.
 */
export const useCurrentLocation = (): CurrentLocation => {
  const [status, setStatus] = useState<LocationStatus>("loading");
  const [place, setPlace] = useState<LocatedPlace | null>(null);
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  /** Prevents overlapping fixes from the mount effect and a tap. */
  const busy = useRef(false);

  const load = useCallback(
    async (options: { request: boolean; openSettings: boolean }) => {
      if (busy.current) return;
      busy.current = true;

      try {
        let permission = await Location.getForegroundPermissionsAsync();

        if (!permission.granted && options.request && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }

        setCanAskAgain(permission.canAskAgain);

        if (!permission.granted) {
          setStatus("denied");
          setPlace(null);
          setMessage(
            permission.canAskAgain
              ? "Turn on location to see where you are."
              : "Location is off for SIPAT. Enable it in Settings.",
          );

          if (options.openSettings && !permission.canAskAgain) {
            /* Settings is the only route left; a failure here shouldn't
               overwrite the denied state with a location error. */
            await Linking.openSettings().catch(() => undefined);
          }

          return;
        }

        if (!(await Location.hasServicesEnabledAsync())) {
          setStatus("unavailable");
          setMessage("Device location is off. Turn it on to see your place.");
          return;
        }

        setStatus("loading");
        setMessage(null);

        const position = await locatePosition();

        if (!position) {
          setStatus("unavailable");
          setPlace(null);
          setMessage("Couldn't get a location fix. Tap to try again.");
          return;
        }

        const { latitude, longitude } = position.coords;
        let label = `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`;

        try {
          const [address] = await Location.reverseGeocodeAsync({
            latitude,
            longitude,
          });
          label = formatPlaceLabel(address) ?? label;
        } catch {
          /* No geocoder (offline / emulator): coordinates still beat nothing. */
        }

        setPlace({
          latitude,
          longitude,
          label,
          resolvedAt: new Date(position.timestamp).toISOString(),
        });
        setStatus("ready");
        setMessage(null);
      } catch {
        setStatus("unavailable");
        setMessage("Couldn't read your location. Tap to try again.");
      } finally {
        busy.current = false;
      }
    },
    [],
  );

  /** Ask on first mount; already-granted users just see the place name. */
  useEffect(() => {
    void load({ request: true, openSettings: false });
  }, [load]);

  const refresh = useCallback(() => {
    void load({ request: true, openSettings: true });
  }, [load]);

  return { status, place, canAskAgain, message, refresh };
};
