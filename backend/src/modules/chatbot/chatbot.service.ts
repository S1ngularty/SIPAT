import type { GroqClient } from "../../integrations/groq/groq.client.js";
import type { ChatbotReply, SendChatbotMessageInput } from "./chatbot.types.js";

/** Keep only the latest turns; older history is not needed for the reply. */
const MAX_HISTORY = 20;

/** Guard against oversized prompts being sent to Groq. */
const MAX_MESSAGE_LENGTH = 4000;

export class ChatbotService {
  constructor(private readonly groqClient: GroqClient) {}

  /**
   * Sends the conversation to Groq and returns the assistant's reply.
   *
   * Conversation history is normalized here (trimmed, empty turns dropped,
   * capped) so the controller only has to validate the request shape.
   */
  async sendMessage(input: SendChatbotMessageInput): Promise<ChatbotReply> {
    const messages = input.messages
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }))
      .filter((message) => message.content !== "")
      .slice(-MAX_HISTORY);

    if (messages.length === 0) {
      throw new Error("At least one non-empty message is required");
    }

    if (messages.some((message) => message.content.length > MAX_MESSAGE_LENGTH)) {
      throw new Error(
        `Each message must be at most ${MAX_MESSAGE_LENGTH} characters`,
      );
    }

    const content = await this.groqClient.getChatbotCompletion({
      messages,
      ...(input.context ? { context: input.context } : {}),
      ...(input.temperature !== undefined
        ? { temperature: input.temperature }
        : {}),
      ...(input.maxCompletionTokens !== undefined
        ? { maxCompletionTokens: input.maxCompletionTokens }
        : {}),
    });

    if (!content) {
      throw new Error("Chatbot failed to generate a response");
    }

    return {
      role: "assistant",
      content: content.message,
      highlightTerms: content.highlightTerms,
      boldTexts: content.boldTexts,
    };
  }
}
