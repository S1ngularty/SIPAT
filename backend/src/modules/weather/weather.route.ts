import { Router } from "express";
import { weatherController } from "./index.js";

const router = Router();

// Public: weather is not user data, so no session is required.
router.route("/").get(weatherController.getCurrentWeather);

export default router;
