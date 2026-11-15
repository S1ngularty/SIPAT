/** Coordinates supplied by the client. Both are optional; see `DEFAULT_LOCATION`. */
export interface WeatherQuery {
  latitude?: number;
  longitude?: number;
}

export interface WeatherLocation {
  latitude: number;
  longitude: number;
  /** IANA timezone name reported by the provider (e.g. `Asia/Manila`). */
  timezone: string;
}

/** Weather snapshot returned by `GET /api/v1/weather`. */
export interface WeatherSnapshot {
  location: WeatherLocation;
  /** ISO timestamp of the reading. */
  observedAt: string;
  temperatureC: number;
  feelsLikeC: number;
  humidityPct: number;
  precipitationMm: number;
  /** Chance of rain for the current hour, when the provider gives one. */
  precipitationChancePct: number | null;
  windKph: number;
  windDirectionDeg: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
}
