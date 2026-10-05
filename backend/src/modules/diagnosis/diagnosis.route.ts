import { Router } from "express";
import { diagnosisController } from "./index.js";

const router = Router();

router.route("/").post(diagnosisController.create);

router.route("/list").get(diagnosisController.getDiagnosisList);

router
  .route("/:diagnosisId")
  .get(diagnosisController.getById)
  .put(diagnosisController.updateResults)
  .patch(diagnosisController.renameDiagnosis);

router
  .route("/video/:videoId")
  .get(diagnosisController.getByVideoId)
  .delete(diagnosisController.deleteByVideoId);

export default router;
