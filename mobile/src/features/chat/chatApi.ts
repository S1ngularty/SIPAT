import { client } from "../../api/apiClient";
import type { ChatbotContext, ChatbotReply, ChatMessage } from "./chatTypes";

export interface SendChatbotMessageInput {
  /** Full conversation, oldest first. */
  messages: ChatMessage[];
  token?: string | null;
  context?: ChatbotContext;
}

class ChatbotAPI {
  async sendMessage({
    messages,
    token,
    context,
  }: SendChatbotMessageInput): Promise<ChatbotReply> {
    const response = await client.request<ChatbotReply>(
      "/api/v1/chatbot/message",
      {
        method: "POST",
        body: JSON.stringify({
          messages,
          ...(context ? { context } : {}),
        }),
      },
      { token },
    );

    return response.result;
  }
}

export const chatbotApi = new ChatbotAPI();
