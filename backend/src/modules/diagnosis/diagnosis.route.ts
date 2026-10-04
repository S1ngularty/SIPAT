import { Router } from "express";
import { diagnosisController } from "./index.js";

const router = Router();

router.route("/").post(diagnosisController.create);

router.route("/list").get(diagnosisController.getDiagnosisList);

router
  .route("/:diagnosisId")
  .get(diagnosisController.getById)
  .put(diagnosisController.updateResults)
  .patch(diagnosisController.renameDiagnosis)
  .delete(diagnosisController.deleteByVideoId);

router.route("/video/:videoId").get(diagnosisController.getByVideoId);

export default router;
