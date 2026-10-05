import { Router } from "express";

import { videoController } from "./index.js";
import { AuthMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(AuthMiddleware.requireSession);
// router.use(AuthMiddleware.requireRole("user"));

router.route("/upload").post(videoController.createVideoUpload);
router
  .route("/:videoId/uploaded")
  .patch(videoController.updateVideoUploadStatus);

export default router;
