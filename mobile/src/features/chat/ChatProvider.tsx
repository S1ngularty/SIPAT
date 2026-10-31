import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@clerk/expo";
import { chatbotApi } from "./chatApi";
import type { ChatbotContext, ChatMessage } from "./chatTypes";

const GENERIC_ERROR = "Couldn't reach Flora right now. Please try again.";

export type ChatContextValue = {
  messages: ChatMessage[];
  isSending: boolean;
  error: string | null;
  send: (content: string, context?: ChatbotContext) => Promise<void>;
  retry: () => Promise<void>;
  reset: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

/**
 * Keeps one conversation alive for the signed-in session. Mounted above the
 * user stack so navigating Home → Chat → Home → Chat preserves the history
 * instead of starting over each time.
 */
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesRef = useRef<ChatMessage[]>([]);
  const contextRef = useRef<ChatbotContext | undefined>(undefined);
  const inFlightRef = useRef(false);

  // `getToken` changes identity between renders; keep it in a ref so the
  // callbacks below stay stable.
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const requestReply = useCallback(
    async (history: ChatMessage[], context?: ChatbotContext) => {
      if (inFlightRef.current) return;

      inFlightRef.current = true;
      setIsSending(true);
      setError(null);

      try {
        const token = await getTokenRef.current();
        const reply = await chatbotApi.sendMessage({
          messages: history,
          token,
          context,
        });

        const next = [...history, reply];
        messagesRef.current = next;
        setMessages(next);
      } catch (requestError) {
        console.error("Chatbot request failed:", requestError);
        setError(GENERIC_ERROR);
      } finally {
        inFlightRef.current = false;
        setIsSending(false);
      }
    },
    [],
  );

  const send = useCallback(
    async (content: string, context?: ChatbotContext) => {
      const question = content.trim();

      if (!question || inFlightRef.current) return;

      contextRef.current = context;

      const history: ChatMessage[] = [
        ...messagesRef.current,
        { role: "user", content: question },
      ];

      messagesRef.current = history;
      setMessages(history);

      await requestReply(history, context);
    },
    [requestReply],
  );

  /** Re-sends the last user turn after a failure (no duplicate turn added). */
  const retry = useCallback(async () => {
    const history = messagesRef.current;

    if (history.length === 0) return;
    if (history[history.length - 1]?.role !== "user") return;

    await requestReply(history, contextRef.current);
  }, [requestReply]);

  const reset = useCallback(() => {
    messagesRef.current = [];
    contextRef.current = undefined;
    setMessages([]);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({ messages, isSending, error, send, retry, reset }),
    [messages, isSending, error, send, retry, reset],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChatbot = (): ChatContextValue => {
  const context = useContext(ChatContext);

  if (!context) {
    throw new Error("useChatbot must be used inside a ChatProvider");
  }

  return context;
};
