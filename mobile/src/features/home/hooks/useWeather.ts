import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toWeatherData, type WeatherState } from "../weather";
import { weatherApi, type WeatherSnapshot } from "../weatherApi";

/** Open-Meteo refreshes its current block roughly every 15 minutes. */
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const DEFAULT_UNAVAILABLE_MESSAGE =
  "Local conditions can't be shown right now. This won't affect your crop diagnosis.";

export type WeatherCoordinates = {
  latitude: number;
  longitude: number;
};

export type UseWeatherOptions = {
  /** `null` until the device location resolves (or when it is unavailable). */
  coordinates: WeatherCoordinates | null;
  /** Place name shown in the block; usually the reverse-geocoded GPS label. */
  locationLabel?: string;
  /** True while the caller is still resolving coordinates (e.g. the GPS fix). */
  pending?: boolean;
  /** Shown when coordinates never arrive. */
  unavailableMessage?: string;
  refreshIntervalMs?: number;
};

export type UseWeatherResult = {
  state: WeatherState;
  /** Re-fetches now; shows the loading state while it runs. */
  refresh: () => void;
};

type RawWeatherState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "ready"; snapshot: WeatherSnapshot };

/**
 * Fetches the current weather for the farm's coordinates and keeps it fresh.
 *
 * Behaviour:
 * - Waits for coordinates; while they are pending it reports `loading`, and if
 *   they never arrive it reports `unavailable` with a caller-supplied message.
 * - Re-fetches every `refreshIntervalMs` (15 minutes by default).
 * - A failed background refresh keeps the last good reading instead of
 *   blanking the block; only a failure with nothing cached shows `unavailable`.
 * - Stale responses are dropped, so two quick refreshes can't paint out of
 *   order.
 */
export const useWeather = ({
  coordinates,
  locationLabel,
  pending = false,
  unavailableMessage = DEFAULT_UNAVAILABLE_MESSAGE,
  refreshIntervalMs = REFRESH_INTERVAL_MS,
}: UseWeatherOptions): UseWeatherResult => {
  const [raw, setRaw] = useState<RawWeatherState>({ status: "loading" });

  // Primitive deps: a fresh `coordinates` object each render must not restart
  // the interval or trigger a refetch.
  const latitude = coordinates?.latitude;
  const longitude = coordinates?.longitude;

  // Read through a ref so changing the wording never invalidates `load` and
  // restarts the refresh timer.
  const unavailableMessageRef = useRef(unavailableMessage);

  useEffect(() => {
    unavailableMessageRef.current = unavailableMessage;
  }, [unavailableMessage]);

  /** Increments per request so a slow response can't overwrite a newer one. */
  const requestId = useRef(0);

  const load = useCallback(
    async (showLoading: boolean) => {
      if (latitude === undefined || longitude === undefined) return;

      const id = ++requestId.current;

      if (showLoading) setRaw({ status: "loading" });

      try {
        const snapshot = await weatherApi.current({ latitude, longitude });

        if (id !== requestId.current) return;

        setRaw({ status: "ready", snapshot });
      } catch (error) {
        if (id !== requestId.current) return;

        console.log("Failed to fetch weather:", error);

        setRaw((previous) =>
          previous.status === "ready"
            ? previous
            : { status: "unavailable", message: unavailableMessageRef.current },
        );
      }
    },
    [latitude, longitude],
  );

  /** Keep the block honest while there is nothing to fetch. */
  useEffect(() => {
    if (latitude !== undefined && longitude !== undefined) return;

    setRaw(
      pending
        ? { status: "loading" }
        : { status: "unavailable", message: unavailableMessage },
    );
  }, [latitude, longitude, pending, unavailableMessage]);

  /** Fetch on arrival, then on every refresh interval. */
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return undefined;

    void load(true);

    const timer = setInterval(() => {
      void load(false);
    }, refreshIntervalMs);

    return () => clearInterval(timer);
  }, [latitude, longitude, load, refreshIntervalMs]);

  /** Map at render time so a new place name applies without another fetch. */
  const state = useMemo<WeatherState>(() => {
    if (raw.status === "ready") {
      return {
        status: "ready",
        data: toWeatherData(raw.snapshot, locationLabel),
      };
    }

    if (raw.status === "unavailable") {
      return { status: "unavailable", message: raw.message };
    }

    return { status: "loading" };
  }, [raw, locationLabel]);

  const refresh = useCallback(() => {
    void load(true);
  }, [load]);

  return { state, refresh };
};
