import { weatherClient } from "../../integrations/open-mateo/weather.client.js";
import { WeatherController } from "./weather.controller.js";
import { WeatherService } from "./weather.service.js";

export const weatherService = new WeatherService(weatherClient);
export const weatherController = new WeatherController(weatherService);
