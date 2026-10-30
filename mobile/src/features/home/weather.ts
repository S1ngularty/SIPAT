/**
 * Weather source for the dashboard.
 *
 * TEMPORARY MOCK: SIPAT does not yet ship a weather provider (the backend
 * exposes no weather endpoint and no third-party key is configured). While
 * that is missing, the dashboard is fed the fixed sample reading below so the
 * hero sheet renders its full state.
 *
 * Replace `MOCK_WEATHER` (or the body of `getWeatherState`) with a real source
 * — backend endpoint or third-party API — and the sheet keeps working
 * unchanged. Nothing else in the app reads this file.
 */

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

const MOCK_WEATHER: Omit<WeatherData, "observedAt"> = {
  location: "Nueva Ecija, PH",
  temperatureC: 31,
  condition: "Partly cloudy",
  humidityPct: 68,
  precipitationPct: 20,
  windKph: 12,
};

export const getWeatherState = (): WeatherState => ({
  status: "ready",
  data: { ...MOCK_WEATHER, observedAt: new Date().toISOString() },
});
