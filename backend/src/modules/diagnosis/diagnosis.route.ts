import { Router } from "express";
import { diagnosisController } from "./index.js";

const router = Router();

router.route("/diagnosis").post(diagnosisController.create);

router
  .route("/diagnosis/:videoId")
  .get(diagnosisController.getByVideoId)
  .put(diagnosisController.updateResults)
  .delete(diagnosisController.deleteByVideoId);

router.route("/diagnosis/:videoId").get(diagnosisController.getByVideoId);

export default router;
