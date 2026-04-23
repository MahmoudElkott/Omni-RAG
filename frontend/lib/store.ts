import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderMode = "local" | "cloud";
export type Theme = "light" | "dark";

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
  theme: Theme;

  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  setMode: (mode: ProviderMode) => void;
  incrementScore: (by?: number) => void;
  setStreaming: (v: boolean) => void;
  clearChat: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
}

const applyTheme = (t: Theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      messages: [],
      mode: "cloud",
      knowledgeScore: 0,
      isStreaming: false,
      theme: "light",

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

      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },
      toggleTheme: () => {
        const next: Theme = get().theme === "dark" ? "light" : "dark";
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: "omni-rag-store",
      partialize: (s) => ({ knowledgeScore: s.knowledgeScore, theme: s.theme, mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyTheme(state.theme);
      },
    }
  )
);
