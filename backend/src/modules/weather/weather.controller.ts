import type { Request, Response } from "express";
import { wrapResponse } from "../../core/utils/response.util.js";
import type { WeatherService } from "./weather.service.js";
import { weatherQuerySchema } from "./weather.validation.js";

export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  /**
   * `GET /weather` — current conditions for `lat`/`lon` (both optional).
   *
   * Public on purpose: local weather carries no user data, so the home screen
   * can load it without waiting on a session token.
   */
  getCurrentWeather = async (req: Request, res: Response): Promise<void> => {
    const parsed = weatherQuerySchema.safeParse(req.query);

    if (!parsed.success) {
      wrapResponse(
        parsed.error.issues[0]?.message ?? "Invalid weather query",
        400,
        res,
        null,
      );
      return;
    }

    try {
      const snapshot = await this.weatherService.getCurrentWeather({
        ...(parsed.data.lat !== undefined ? { latitude: parsed.data.lat } : {}),
        ...(parsed.data.lon !== undefined ? { longitude: parsed.data.lon } : {}),
      });

      // The service already caches; let clients/proxies reuse it too.
      res.set("Cache-Control", "public, max-age=600");

      wrapResponse("Weather retrieved successfully", 200, res, snapshot);
    } catch (error) {
      console.log("Weather error:", error);
      wrapResponse("Weather data is currently unavailable", 502, res, null);
    }
  };
}
