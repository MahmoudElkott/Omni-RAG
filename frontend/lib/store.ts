import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ProviderMode = "local" | "cloud";
export type Theme = "emerald" | "cyber" | "terminal" | "oled";

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

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
}

const DEFAULT_SESSION: ChatSession = {
  id: "session-default",
  title: "Session 01",
  createdAt: 0,
  updatedAt: 0,
  messages: [],
};

const themeCycle: Theme[] = ["emerald", "cyber", "terminal", "oled"];

const buildSessionTitle = (content: string) => {
  const normalized = content.replace(/^\/(mcq|flash)\s+/i, "").trim();
  if (!normalized) return "New session";
  const title = normalized.split(/\s+/).slice(0, 5).join(" ");
  return title.length > 28 ? `${title.slice(0, 28).trimEnd()}…` : title;
};

const cloneDefaultSession = (): ChatSession => ({ ...DEFAULT_SESSION, messages: [] });

interface AppState {
  sessions: ChatSession[];
  activeSessionId: string;
  messages: Message[];
  mode: ProviderMode;
  knowledgeScore: number;
  isStreaming: boolean;
  theme: Theme;

  addMessage: (msg: Omit<Message, "id" | "timestamp">) => void;
  startNewSession: () => void;
  selectSession: (sessionId: string) => void;
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
  root.dataset.theme = t;
  root.classList.toggle("dark", t !== "emerald");
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      sessions: [cloneDefaultSession()],
      activeSessionId: DEFAULT_SESSION.id,
      messages: [],
      mode: "cloud",
      knowledgeScore: 0,
      isStreaming: false,
      theme: "emerald",

      addMessage: (msg) =>
        set((state) => {
          const message = {
            ...msg,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
          };

          const sessions = state.sessions.length ? state.sessions : [cloneDefaultSession()];
          const activeSessionId = state.activeSessionId || DEFAULT_SESSION.id;

          const nextSessions = sessions.map((session) => {
            if (session.id !== activeSessionId) {
              return session;
            }

            const nextMessages = [...session.messages, message];
            return {
              ...session,
              title: session.messages.length === 0 && msg.role === "user" ? buildSessionTitle(msg.content) : session.title,
              messages: nextMessages,
              updatedAt: message.timestamp,
            };
          });

          return {
            sessions: nextSessions,
            messages: [...state.messages, message],
          };
        }),

      startNewSession: () => {
        const now = Date.now();
        const session: ChatSession = {
          id: crypto.randomUUID(),
          title: "New session",
          createdAt: now,
          updatedAt: now,
          messages: [],
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: session.id,
          messages: [],
        }));
      },

      selectSession: (sessionId) => {
        const session = get().sessions.find((item) => item.id === sessionId);
        if (!session) return;
        set({ activeSessionId: sessionId, messages: session.messages });
      },

      setMode: (mode) => set({ mode }),
      incrementScore: (by = 10) =>
        set((s) => ({ knowledgeScore: s.knowledgeScore + by })),
      setStreaming: (v) => set({ isStreaming: v }),
      clearChat: () => get().startNewSession(),

      setTheme: (t) => {
        applyTheme(t);
        set({ theme: t });
      },
      toggleTheme: () => {
        const currentIndex = themeCycle.indexOf(get().theme);
        const next: Theme = themeCycle[(currentIndex + 1) % themeCycle.length];
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: "omni-rag-store",
      partialize: (s) => ({
        sessions: s.sessions,
        activeSessionId: s.activeSessionId,
        knowledgeScore: s.knowledgeScore,
        theme: s.theme,
        mode: s.mode,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) {
          applyTheme(state.theme);
        }
        if (state && (!state.sessions || state.sessions.length === 0)) {
          state.sessions = [cloneDefaultSession()];
          state.activeSessionId = DEFAULT_SESSION.id;
          state.messages = [];
        }
        if (state && state.activeSessionId) {
          const activeSession = state.sessions?.find((item) => item.id === state.activeSessionId) ?? state.sessions?.[0];
          if (activeSession) {
            state.activeSessionId = activeSession.id;
            state.messages = activeSession.messages;
          }
        }
      },
    }
  )
);
