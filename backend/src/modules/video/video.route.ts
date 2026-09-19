import { Router } from "express";

import {
  createVideoUpload,
  updateVideoUploadStatus,
} from "./video.controller.js";
import { AuthMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

router.use(AuthMiddleware.requireSession);
// router.use(AuthMiddleware.requireRole("user"));

router.route("/upload").post(createVideoUpload);
router.route("/:videoId/uploaded").patch(updateVideoUploadStatus);

export default router;
