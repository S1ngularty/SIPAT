const weatherDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// 1. Raw response from Open-Meteo API
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: CurrentUnits;
  current: CurrentWeather;
}

export interface CurrentUnits {
  time: string;
  interval: string;
  temperature_2m: string;
  relative_humidity_2m: string;
  weather_code: string;
  wind_speed_10m: string;
  wind_direction_10m: string;
}

export interface CurrentWeather {
  time: string;
  interval: number;
  temperature_2m: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
}

// 2. Clean response returned by your Express endpoint
export interface CleanWeatherResponse {
  location: {
    latitude: number;
    longitude: number;
  };
  time: string;
  temperature: string;
  humidity: string;
  windSpeed: string;
  windDirection: string;
  status: string;
}

class WeatherClient {
  async getWeather({ lat, lon }: { lat: string; lon: string }) {
    const latitude = lat || "14.4081";
    const longitude = lon || "121.0412";

    const url = `https://open-meteo.com${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&timezone=Asia%2FManila`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch weather data");
      }

      const data: OpenMeteoResponse = await response.json();
      const current = data.current;

      return {
        location: { latitude: data.latitude, longitude: data.longitude },
        time: current.time,
        temperature: `${current.temperature_2m}°C`,
        humidity: `${current.relative_humidity_2m}%`,
        windSpeed: `${current.wind_speed_10m} km/h`,
        windDirection: `${current.wind_direction_10m}°`,
        status: weatherDescriptions[data.current.weather_code] || "Unknown",
      } as CleanWeatherResponse;
    } catch (error) {
      console.log("[Weather API Error]: ", error);
      return;
    }
  }
}

export const weatherClient = new WeatherClient();
