export type ChatRole = "user" | "assistant";

/** One turn in the conversation, oldest first. */
export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Assistant turns only: agricultural terms to visually highlight. */
  highlightTerms?: string[];
  /** Assistant turns only: section titles / sentences to render bold. */
  boldTexts?: string[];
}

/** Optional diagnosis snapshot the assistant can reference. */
export interface ChatbotContext {
  crop?: string;
  condition?: string;
  summary?: string;
  recommendations?: string[];
}

/** The assistant's reply, as returned by `POST /api/v1/chatbot/message`. */
export interface ChatbotReply {
  role: "assistant";
  content: string;
  highlightTerms: string[];
  boldTexts: string[];
}
