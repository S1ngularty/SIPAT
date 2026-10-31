import { groqClient } from "../../integrations/groq/groq.client.js";
import { ChatbotController } from "./chatbot.controller.js";
import { ChatbotService } from "./chatbot.service.js";

export const chatbotService = new ChatbotService(groqClient);
export const chatbotController = new ChatbotController(chatbotService);
