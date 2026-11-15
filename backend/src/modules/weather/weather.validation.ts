import { z } from "zod";

/**
 * `GET /weather?lat=..&lon=..`
 *
 * Both coordinates are optional (the service falls back to a default farm
 * location), but they must always be supplied together so we never mix a real
 * latitude with a default longitude.
 */
export const weatherQuerySchema = z
  .object({
    lat: z.coerce
      .number()
      .min(-90, "lat must be between -90 and 90")
      .max(90, "lat must be between -90 and 90")
      .optional(),
    lon: z.coerce
      .number()
      .min(-180, "lon must be between -180 and 180")
      .max(180, "lon must be between -180 and 180")
      .optional(),
  })
  .refine((query) => (query.lat === undefined) === (query.lon === undefined), {
    message: "lat and lon must be provided together",
    path: ["lat"],
  });

export type WeatherQueryInput = z.infer<typeof weatherQuerySchema>;
