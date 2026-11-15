/** Open-Meteo forecast endpoint. The API is keyless and needs no billing setup. */
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Give up on the upstream after this long so a home-screen request never hangs. */
const REQUEST_TIMEOUT_MS = 20_000;

/** Variables pulled from the `current` block. */
const CURRENT_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "is_day",
  "precipitation",
  "weather_code",
  "wind_speed_10m",
  "wind_direction_10m",
].join(",");

/** WMO weather interpretation codes → human labels. */
const WEATHER_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// 1. Raw response from Open-Meteo (only the fields we request are typed).
export interface OpenMeteoCurrent {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  is_day: number;
  precipitation: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

export interface OpenMeteoHourly {
  time: string[];
  precipitation_probability: (number | null)[];
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  current: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
}

// 2. Clean reading returned by this client (and shaped into the API response).
export interface WeatherReading {
  latitude: number;
  longitude: number;
  timezone: string;
  /** ISO timestamp in UTC, built from the provider's local time + UTC offset. */
  observedAt: string;
  temperatureC: number;
  feelsLikeC: number;
  humidityPct: number;
  precipitationMm: number;
  precipitationChancePct: number | null;
  windKph: number;
  windDirectionDeg: number;
  weatherCode: number;
  condition: string;
  isDay: boolean;
}

/**
 * Open-Meteo reports local times without an offset ("2026-11-13T14:15"), so we
 * reinterpret them as UTC and subtract the offset to get a real instant.
 */
const toIsoTimestamp = (localTime: string, offsetSeconds: number): string => {
  const asUtc = Date.parse(`${localTime}Z`);

  if (Number.isNaN(asUtc)) return new Date().toISOString();

  return new Date(asUtc - offsetSeconds * 1000).toISOString();
};

/**
 * Probability for the hour the current reading falls into. Open-Meteo only
 * exposes `precipitation_probability` on the hourly block, not on `current`.
 */
const pickPrecipitationChance = (
  hourly: OpenMeteoHourly | undefined,
  currentTime: string,
): number | null => {
  if (!hourly?.time?.length) return null;

  const hour = currentTime.slice(0, 13);
  const index = hourly.time.findIndex((time) => time.startsWith(hour));

  if (index < 0) return null;

  const chance = hourly.precipitation_probability?.[index];

  return typeof chance === "number" ? chance : null;
};

export class WeatherClient {
  /**
   * Fetches current conditions for a coordinate.
   *
   * Resolves `null` on any upstream/transport failure so callers can return a
   * clean `502` instead of leaking fetch/abort errors to the client.
   */
  async getCurrentWeather({
    latitude,
    longitude,
  }: {
    latitude: number;
    longitude: number;
  }): Promise<WeatherReading | null> {
    const params = new URLSearchParams({
      latitude: latitude.toFixed(4),
      longitude: longitude.toFixed(4),
      current: CURRENT_FIELDS,
      hourly: "precipitation_probability",
      timezone: "auto",
      forecast_days: "1",
      temperature_unit: "celsius",
      wind_speed_unit: "kmh",
      precipitation_unit: "mm",
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${FORECAST_URL}?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        console.log(`[Open-Meteo] request failed with status ${response.status}`);
        return null;
      }

      const data = (await response.json()) as OpenMeteoResponse;
      const current = data.current;

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        observedAt: toIsoTimestamp(current.time, data.utc_offset_seconds),
        temperatureC: current.temperature_2m,
        feelsLikeC: current.apparent_temperature,
        humidityPct: current.relative_humidity_2m,
        precipitationMm: current.precipitation,
        precipitationChancePct: pickPrecipitationChance(
          data.hourly,
          current.time,
        ),
        windKph: current.wind_speed_10m,
        windDirectionDeg: current.wind_direction_10m,
        weatherCode: current.weather_code,
        condition: WEATHER_DESCRIPTIONS[current.weather_code] ?? "Unknown",
        isDay: current.is_day === 1,
      };
    } catch (error) {
      console.log("[Open-Meteo] weather request error:", error);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

export const weatherClient = new WeatherClient();
