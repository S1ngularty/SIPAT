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

// Preview image: POST mints a presigned PUT, PATCH records the uploaded key.
router
  .route("/:videoId/thumbnail")
  .post(videoController.createThumbnailUpload)
  .patch(videoController.attachThumbnail);

export default router;
