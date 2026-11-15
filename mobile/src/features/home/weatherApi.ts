import { client } from "../../api/apiClient";

/** Snapshot returned by `GET /api/v1/weather`. */
export interface WeatherSnapshot {
  location: {
    latitude: number;
    longitude: number;
    /** IANA timezone name, e.g. `Asia/Manila`. */
    timezone: string;
  };
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

class WeatherAPI {
  /**
   * Current conditions for the farm's coordinates.
   *
   * The endpoint is public, so no Clerk token is needed. Coordinates are
   * optional on the server; the app always sends the device location so the
   * reading matches the place shown on the home screen.
   */
  async current({
    latitude,
    longitude,
  }: {
    latitude?: number;
    longitude?: number;
  } = {}): Promise<WeatherSnapshot> {
    const params = new URLSearchParams();

    if (latitude !== undefined) params.append("lat", latitude.toFixed(4));
    if (longitude !== undefined) params.append("lon", longitude.toFixed(4));

    const query = params.toString();

    const response = await client.request<WeatherSnapshot>(
      `/api/v1/weather${query ? `?${query}` : ""}`,
      { method: "GET" },
    );

    return response.result;
  }
}

export const weatherApi = new WeatherAPI();
