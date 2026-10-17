import type { WeatherState } from "./components/WeatherSummaryCard";

/**
 * Weather source for the dashboard.
 *
 * SIPAT does not currently ship a weather provider (the backend exposes no
 * weather endpoint and no third-party key is configured). Rather than show
 * invented readings, the dashboard renders the card's explicit "unavailable"
 * state. Wire a real source here and return `{ status: "ready", data }` to
 * light up the card — no screen changes are required.
 */
export const getWeatherState = (): WeatherState => ({ status: "unavailable" });
