"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { streamChat, generateMCQ, generateFlashcards } from "@/lib/api";
import { MessageRenderer } from "./MessageRenderer";

const HINTS = [
  "Ask anything from your uploaded documents…",
  "Try  /mcq Neural Networks  to generate a quiz",
  "Try  /flash Photosynthesis  to build a flashcard deck",
  "Upload a PDF from the corpus and start a conversation",
];

const OPENER = [
  "What shall we", "What would you like to", "Where shall we", "What are we",
];

const OPENER_TAIL = [
  "study today?", "learn today?", "begin today?", "exploring today?",
];

export function ChatWorkspace() {
  const { messages, mode, addMessage, isStreaming, setStreaming, sessions, activeSessionId } = useStore();
  const [input, setInput] = useState("");
  // Deterministic initial values to avoid SSR hydration mismatch;
  // randomize on the client after mount.
  const [hint, setHint] = useState(HINTS[0]);
  const [opener, setOpener] = useState({ head: OPENER[0], tail: OPENER_TAIL[0] });
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const activeSessionTitle = sessions.find((session) => session.id === activeSessionId)?.title ?? "A Clean Page";

  useEffect(() => {
    setHint(HINTS[Math.floor(Math.random() * HINTS.length)]);
    setOpener({
      head: OPENER[Math.floor(Math.random() * OPENER.length)],
      tail: OPENER_TAIL[Math.floor(Math.random() * OPENER_TAIL.length)],
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [input]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    addMessage({ role: "user", content: text });

    if (text.startsWith("/mcq ")) {
      const topic = text.slice(5).trim();
      setStreaming(true);
      try {
        const payload = await generateMCQ(topic, 5, mode);
        addMessage({ role: "assistant", content: "", component: payload });
      } catch {
        addMessage({ role: "assistant", content: "Failed to generate quiz." });
      } finally {
        setStreaming(false);
      }
      return;
    }

    if (text.startsWith("/flash ")) {
      const topic = text.slice(7).trim();
      setStreaming(true);
      try {
        const payload = await generateFlashcards(topic, 8, mode);
        addMessage({ role: "assistant", content: "", component: payload });
      } catch {
        addMessage({ role: "assistant", content: "Failed to generate flashcards." });
      } finally {
        setStreaming(false);
      }
      return;
    }

    setStreaming(true);
    const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
    addMessage({ role: "assistant", content: "" });

    try {
      for await (const token of streamChat(text, history, mode)) {
        useStore.setState(s => ({
          messages: s.messages.map((m, i) =>
            i === s.messages.length - 1 ? { ...m, content: m.content + token } : m
          ),
        }));
      }
    } catch {
      useStore.setState(s => ({
        messages: s.messages.map((m, i) =>
          i === s.messages.length - 1 ? { ...m, content: "⚠ Connection error." } : m
        ),
      }));
    } finally {
      setStreaming(false);
    }
  };

  const setCommand = (cmd: string) => {
    setInput(cmd + " ");
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden bg-paper">
      {/* Header */}
      <header
        className="px-10 py-5 flex items-center gap-6 shrink-0"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div className="flex-1">
          <div className="flex items-baseline gap-2.5">
            <span className="font-display italic text-sm text-ink-3">Chapter</span>
            <span className="display-numeral text-xl text-ink-2 leading-none">I</span>
            <span className="text-ink-4">·</span>
            <span className="font-display text-[1.05rem] text-ink leading-none tracking-tight">
              {messages.length === 0 ? "A Clean Page" : activeSessionTitle}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[0.72rem] text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${mode === "local" ? "bg-sage" : "bg-clay"} animate-pulse`} />
              <span className="font-mono text-[0.7rem]">
                {mode === "local" ? "ollama / lm-studio" : "gemini-2.0-flash"}
              </span>
            </span>
            <span className="text-ink-4">·</span>
            <span>{messages.length} {messages.length === 1 ? "message" : "messages"}</span>
          </div>
        </div>

        <div className="hidden md:flex gap-2">
          {[
            { cmd: "/mcq", label: "Quiz" },
            { cmd: "/flash", label: "Flashcards" },
          ].map(({ cmd, label }) => (
            <button
              key={cmd}
              onClick={() => setCommand(cmd)}
              className="group inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-[var(--rule)] bg-vellum hover:border-clay hover:text-clay text-ink-2 transition-all"
            >
              <span className="font-mono text-[0.7rem] text-ink-4 group-hover:text-clay">{cmd}</span>
              <span className="tracking-tight">{label}</span>
            </button>
          ))}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-10 py-10">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="pt-20 pb-10"
            >
              {/* Frontispiece */}
              <div className="eyebrow flex items-center gap-3">
                <span className="h-px flex-1 bg-[var(--rule-2)]" />
                <span>An Invitation</span>
                <span className="h-px flex-1 bg-[var(--rule-2)]" />
              </div>

              <h1 className="mt-8 font-display text-[3.2rem] leading-[1.1] tracking-tight text-ink">
                {opener.head}{" "}
                <span className="font-display italic text-clay">{opener.tail}</span>
              </h1>

              <p className="mt-6 text-[0.95rem] text-ink-2 leading-relaxed max-w-xl">
                Upload a PDF, a text file, or paste a URL into the corpus.
                Then chat, quiz yourself, or turn the material into flashcards —
                whichever way you learn best.
              </p>

              <div className="clay-rule mt-8" />

              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { title: "Ask", desc: "Pose any question grounded in your corpus.", sample: "Explain attention in transformers" },
                  { title: "Quiz", desc: "Generate a five-question multiple-choice test.", sample: "/mcq World War I" },
                  { title: "Drill", desc: "Review ideas with a deck of flashcards.", sample: "/flash Krebs cycle" },
                ].map((card, i) => (
                  <motion.button
                    key={card.title}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08, duration: 0.5 }}
                    onClick={() => setCommand(card.sample.split(" ")[0])}
                    className="group text-left surface-card p-4 hover:border-[var(--rule-2)] lift"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="display-numeral text-xl text-clay">{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-[1.05rem] text-ink">{card.title}</span>
                    </div>
                    <p className="mt-1.5 text-xs text-ink-3 leading-relaxed">{card.desc}</p>
                    <p className="mt-3 font-mono text-[0.7rem] text-ink-4 group-hover:text-clay transition-colors">
                      {card.sample}
                    </p>
                  </motion.button>
                ))}
              </div>

              <p className="mt-10 text-center text-xs text-ink-4 italic font-display">
                {hint}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-8">
              <AnimatePresence initial={false}>
                {messages.map((msg, i) => (
                  <MessageRenderer
                    key={msg.id}
                    msg={msg}
                    isLast={i === messages.length - 1}
                    streaming={isStreaming}
                  />
                ))}
              </AnimatePresence>

              {isStreaming && messages[messages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3"
                >
                  <span className="eyebrow">Omni</span>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-clay animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1 h-1 rounded-full bg-clay animate-bounce" style={{ animationDelay: "120ms" }} />
                    <span className="w-1 h-1 rounded-full bg-clay animate-bounce" style={{ animationDelay: "240ms" }} />
                  </span>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="shrink-0 px-10 pb-7 pt-3" style={{ background: "linear-gradient(to top, var(--paper) 70%, transparent)" }}>
        <div className="max-w-3xl mx-auto">
          <div
            className="relative flex items-end gap-2 p-2 rounded-2xl border bg-vellum focus-within:border-[var(--rule-2)] focus-within:shadow-[var(--shadow-m)] transition-all"
            style={{ borderColor: "var(--rule)" }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder={hint}
              disabled={isStreaming}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-[0.95rem] text-ink placeholder:text-ink-4 focus:outline-none disabled:opacity-40 leading-relaxed"
              style={{ maxHeight: "180px" }}
            />
            <button
              onClick={send}
              disabled={isStreaming || !input.trim()}
              className="shrink-0 h-10 px-4 rounded-xl btn-clay flex items-center gap-1.5 text-sm disabled:cursor-not-allowed"
            >
              {isStreaming ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-vellum/40 border-t-vellum animate-spin" />
                  <span className="hidden sm:inline">Thinking</span>
                </>
              ) : (
                <>
                  <span className="font-display italic text-sm">Send</span>
                  <span className="text-base leading-none">→</span>
                </>
              )}
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between text-[0.68rem] text-ink-4">
            <span>
              <span className="font-mono">Enter</span> to send,{" "}
              <span className="font-mono">Shift+Enter</span> for a new line
            </span>
            <span className="font-display italic">Omni·RAG</span>
          </div>
        </div>
      </div>
    </div>
  );
}
