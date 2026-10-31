import { Router } from "express";
import { chatbotController } from "./index.js";
import { AuthMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

// Chatbot replies consume LLM credits, so require a signed-in user.
router.use(AuthMiddleware.requireSession);

router.route("/message").post(chatbotController.sendMessage);

export default router;
