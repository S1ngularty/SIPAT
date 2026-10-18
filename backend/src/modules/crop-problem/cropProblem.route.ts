import { Router } from "express";
import { cropProblemController } from "./index.js";
import { AuthMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

// Reference data is readable by any authenticated session.
router.route("/").get(cropProblemController.getList);

// Specific paths must be declared before the catch-all `/:identifier`.
router.route("/slug/:slug").get(cropProblemController.getBySlug);

router.route("/:identifier").get(cropProblemController.getByIdentifier);

// Mutations are admin-only.
router.use(AuthMiddleware.requireRole("admin"));

router.route("/").post(cropProblemController.create);
router.route("/bulk").post(cropProblemController.bulkUpsert);
router
  .route("/:identifier")
  .patch(cropProblemController.update)
  .delete(cropProblemController.delete);

export default router;
