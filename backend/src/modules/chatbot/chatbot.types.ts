import type {
  ChatbotContext,
  ChatbotMessage,
  ChatbotRole,
} from "../../integrations/groq/groq.client.js";

export type { ChatbotContext, ChatbotMessage, ChatbotRole };

/** Body of `POST /chatbot/message`. */
export interface SendChatbotMessageInput {
  /** Conversation history, oldest first. The last turn should be the user's. */
  messages: ChatbotMessage[];

  /** Optional diagnosis snapshot the bot can reference in its answer. */
  context?: ChatbotContext;

  /** Sampling temperature, 0–2. Defaults to 0.6. */
  temperature?: number;

  /** Upper bound on the reply length, in tokens. */
  maxCompletionTokens?: number;
}

/** A single assistant turn returned to the client. */
export interface ChatbotReply {
  role: "assistant";
  /** Plain conversational text, safe for the client to render. */
  content: string;
  /** Agricultural terms the client should visually highlight. */
  highlightTerms: string[];
  /** Section titles / important sentences the client should bold. */
  boldTexts: string[];
}
