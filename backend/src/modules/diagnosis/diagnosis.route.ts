import { Router } from "express";
import { diagnosisController } from "./index.js";

const router = Router();

router
  .route("/")
  .post(diagnosisController.create)
  .get(diagnosisController.getDiagnosisList);

router
  .route("/:videoId")
  .get(diagnosisController.getByVideoId)
  .put(diagnosisController.updateResults)
  .delete(diagnosisController.deleteByVideoId);

router.route("/:videoId").get(diagnosisController.getByVideoId);

export default router;
