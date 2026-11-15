/**
 * Display model for the home weather block.
 *
 * The data now comes from the SIPAT API (`GET /api/v1/weather`), which proxies
 * Open-Meteo. `weatherApi.ts` types the wire format; this module keeps the
 * shape the UI renders, plus the mapping between the two.
 */

import type { WeatherSnapshot } from "./weatherApi";

export interface WeatherData {
  location: string;
  temperatureC: number;
  condition: string;
  /** ISO timestamp of the reading, if the source provides one. */
  observedAt?: string;
  humidityPct?: number;
  precipitationPct?: number;
  windKph?: number;
}

export type WeatherState =
  | { status: "loading" }
  | { status: "unavailable"; location?: string; message?: string }
  | { status: "ready"; data: WeatherData };

/**
 * Maps the API snapshot onto the display model. The place name comes from the
 * device location, because the API only knows coordinates.
 */
export const toWeatherData = (
  snapshot: WeatherSnapshot,
  locationLabel?: string,
): WeatherData => ({
  location: locationLabel?.trim() || "Your area",
  temperatureC: snapshot.temperatureC,
  condition: snapshot.condition,
  observedAt: snapshot.observedAt,
  humidityPct: snapshot.humidityPct,
  precipitationPct: snapshot.precipitationChancePct ?? undefined,
  windKph: snapshot.windKph,
});
