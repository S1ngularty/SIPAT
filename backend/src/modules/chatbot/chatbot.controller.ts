import type { NextFunction, Request, Response } from "express";
import { wrapResponse } from "../../core/utils/response.util.js";
import type { ChatbotService } from "./chatbot.service.js";
import type {
  ChatbotContext,
  ChatbotMessage,
  SendChatbotMessageInput,
} from "./chatbot.types.js";

const isChatbotMessage = (value: unknown): value is ChatbotMessage => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    (record.role === "user" || record.role === "assistant") &&
    typeof record.content === "string" &&
    record.content.trim() !== ""
  );
};

const isOptionalString = (value: unknown): value is string | undefined =>
  value === undefined || typeof value === "string";

const isChatbotContext = (value: unknown): value is ChatbotContext => {
  if (value === undefined) return true;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    isOptionalString(record.crop) &&
    isOptionalString(record.condition) &&
    isOptionalString(record.summary) &&
    (record.recommendations === undefined ||
      (Array.isArray(record.recommendations) &&
        record.recommendations.every((item) => typeof item === "string")))
  );
};

export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * `POST /chatbot/message` — answer the latest turn using the supplied
   * conversation history and, optionally, the current diagnosis as context.
   */
  sendMessage = async (
    req: Request<{}, {}, Partial<SendChatbotMessageInput>>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { messages, context, temperature, maxCompletionTokens } =
        req.body ?? {};

      if (!Array.isArray(messages) || messages.length === 0) {
        wrapResponse(
          "At least one message with a valid role and content is required",
          400,
          res,
          null,
        );
        return;
      }

      if (!messages.every(isChatbotMessage)) {
        wrapResponse(
          "Each message must have a role of 'user' or 'assistant' and non-empty content",
          400,
          res,
          null,
        );
        return;
      }

      if (!isChatbotContext(context)) {
        wrapResponse("Invalid diagnosis context", 400, res, null);
        return;
      }

      if (
        temperature !== undefined &&
        (typeof temperature !== "number" || temperature < 0 || temperature > 2)
      ) {
        wrapResponse("temperature must be a number between 0 and 2", 400, res, null);
        return;
      }

      if (
        maxCompletionTokens !== undefined &&
        (!Number.isInteger(maxCompletionTokens) || maxCompletionTokens <= 0)
      ) {
        wrapResponse(
          "maxCompletionTokens must be a positive integer",
          400,
          res,
          null,
        );
        return;
      }

      const reply = await this.chatbotService.sendMessage({
        messages,
        ...(context !== undefined ? { context } : {}),
        ...(temperature !== undefined ? { temperature } : {}),
        ...(maxCompletionTokens !== undefined ? { maxCompletionTokens } : {}),
      });

      wrapResponse("Chatbot replied successfully", 200, res, reply);
    } catch (error) {
      console.log("Chatbot message error:", error);
      next(error);
    }
  };
}
