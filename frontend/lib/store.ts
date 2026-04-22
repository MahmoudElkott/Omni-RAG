import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderMode = "local" | "cloud";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  component?: MCQPayload | FlashcardPayload;
  timestamp: number;
}

export interface MCQItem {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export interface MCQPayload {
  type: "mcq";
  data: MCQItem[];
}

export interface FlashcardItem {
  front: string;
  back: string;
}

export interface FlashcardPayload {
  type: "flashcard";
  data: FlashcardItem[];
}

interface AppState {
  messages: Message[];
  mode: ProviderMode;
  knowledgeScore: number;
  isStreaming: boolean;

  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  setMode: (mode: ProviderMode) => void;
  incrementScore: (by?: number) => void;
  setStreaming: (v: boolean) => void;
  clearChat: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      messages: [],
      mode: "cloud",
      knowledgeScore: 0,
      isStreaming: false,

      addMessage: (msg) =>
        set((s) => ({
          messages: [
            ...s.messages,
            { ...msg, id: crypto.randomUUID(), timestamp: Date.now() },
          ],
        })),

      setMode: (mode) => set({ mode }),
      incrementScore: (by = 10) =>
        set((s) => ({ knowledgeScore: s.knowledgeScore + by })),
      setStreaming: (v) => set({ isStreaming: v }),
      clearChat: () => set({ messages: [] }),
    }),
    { name: "omni-rag-store", partialize: (s) => ({ knowledgeScore: s.knowledgeScore }) }
  )
);
