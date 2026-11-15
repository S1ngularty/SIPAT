import type {
  WeatherClient,
  WeatherReading,
} from "../../integrations/open-mateo/weather.client.js";
import type { WeatherQuery, WeatherSnapshot } from "./weather.types.js";

/**
 * Open-Meteo refreshes its current block roughly every 15 minutes, so caching
 * for a little less than that keeps the home screen cheap without showing
 * stale conditions.
 */
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Used only when the client cannot supply coordinates (e.g. the user denied
 * location access). Cabanatuan City, Nueva Ecija — the app's home region.
 */
export const DEFAULT_LOCATION = {
  latitude: 15.4869,
  longitude: 120.9674,
} as const;

type CacheEntry = {
  expiresAt: number;
  reading: WeatherReading;
};

export class WeatherService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(private readonly weatherClient: WeatherClient) {}

  /**
   * Current conditions for the requested coordinate.
   *
   * Throws when the provider cannot be reached; the controller turns that into
   * a `502` so the client can fall back to its "unavailable" state.
   */
  async getCurrentWeather(query: WeatherQuery = {}): Promise<WeatherSnapshot> {
    const latitude = query.latitude ?? DEFAULT_LOCATION.latitude;
    const longitude = query.longitude ?? DEFAULT_LOCATION.longitude;

    /** ~1 km buckets, so small GPS jitter still hits the cache. */
    const cacheKey = `${latitude.toFixed(2)}:${longitude.toFixed(2)}`;

    const cached = this.readCache(cacheKey);
    if (cached) return this.toSnapshot(cached);

    const reading = await this.weatherClient.getCurrentWeather({
      latitude,
      longitude,
    });

    if (!reading) {
      throw new Error("Weather provider is unavailable");
    }

    this.cache.set(cacheKey, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      reading,
    });

    return this.toSnapshot(reading);
  }

  private readCache(key: string): WeatherReading | null {
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return entry.reading;
  }

  private toSnapshot(reading: WeatherReading): WeatherSnapshot {
    return {
      location: {
        latitude: reading.latitude,
        longitude: reading.longitude,
        timezone: reading.timezone,
      },
      observedAt: reading.observedAt,
      temperatureC: reading.temperatureC,
      feelsLikeC: reading.feelsLikeC,
      humidityPct: reading.humidityPct,
      precipitationMm: reading.precipitationMm,
      precipitationChancePct: reading.precipitationChancePct,
      windKph: reading.windKph,
      windDirectionDeg: reading.windDirectionDeg,
      weatherCode: reading.weatherCode,
      condition: reading.condition,
      isDay: reading.isDay,
    };
  }
}
