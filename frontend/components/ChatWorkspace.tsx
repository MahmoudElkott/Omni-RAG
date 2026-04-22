"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { streamChat, generateMCQ, generateFlashcards } from "@/lib/api";
import { MessageRenderer } from "./MessageRenderer";

const HINTS = [
  "Ask anything from your uploaded documents…",
  "Try /mcq Neural Networks to generate a quiz",
  "Try /flash Photosynthesis to create flashcards",
  "Upload a PDF and ask questions about it",
];

export function ChatWorkspace() {
  const { messages, mode, addMessage, isStreaming, setStreaming } = useStore();
  const [input, setInput] = useState("");
  const [hint] = useState(() => HINTS[Math.floor(Math.random() * HINTS.length)]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      {/* Header */}
      <div
        className="px-8 py-4 flex items-center gap-6 shrink-0"
        style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="flex-1">
          <p className="font-mono text-xs tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
            Session
          </p>
          <p className="font-mono text-sm" style={{ color: "var(--parchment)" }}>
            {mode === "local" ? "🔒 Privacy Mode" : "⚡ Power Mode"}
            <span className="ml-2 text-xs" style={{ color: "var(--parchment-3)" }}>
              {mode === "local" ? "— Ollama / LM Studio" : "— Gemini 2.0 Flash"}
            </span>
          </p>
        </div>
        <div className="flex gap-4">
          {["/mcq <topic>", "/flash <topic>"].map(cmd => (
            <span
              key={cmd}
              className="text-xs px-2 py-1 rounded-sm font-mono cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                color: "var(--parchment-3)",
                background: "var(--surface-2)",
              }}
              onClick={() => { setInput(cmd.split(" ")[0] + " "); inputRef.current?.focus(); }}
            >
              {cmd}
            </span>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6" style={{ background: "var(--void)" }}>
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center pt-24 space-y-6"
            >
              <div
                className="inline-block px-4 py-1 text-xs font-mono tracking-widest uppercase rounded-sm"
                style={{ border: "1px solid var(--border)", color: "var(--amber)", background: "var(--amber-glow)" }}
              >
                Ready
              </div>
              <p className="font-display text-2xl" style={{ color: "var(--parchment-2)" }}>
                What would you like to learn today?
              </p>
              <p className="text-sm font-mono" style={{ color: "var(--parchment-3)" }}>{hint}</p>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg, i) => (
              <MessageRenderer key={msg.id} msg={msg} isLast={i === messages.length - 1} streaming={isStreaming} />
            ))}
          </AnimatePresence>

          {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "var(--parchment-3)" }}>Thinking</span>
              <span className="font-mono" style={{ color: "var(--amber)" }}>…</span>
            </motion.div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div
        className="px-8 py-5 shrink-0"
        style={{ borderTop: "1px solid var(--border)", background: "var(--surface)" }}
      >
        <div className="max-w-3xl mx-auto flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
              placeholder={hint}
              disabled={isStreaming}
              className="w-full px-4 py-3 text-sm font-mono rounded-sm glow-focus disabled:opacity-40 transition-all"
              style={{
                background: "var(--surface-2)",
                border: "1px solid var(--border-2)",
                color: "var(--parchment)",
              }}
            />
          </div>
          <button
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className="px-6 py-3 text-xs font-mono tracking-widest uppercase rounded-sm transition-all duration-200 disabled:opacity-30"
            style={{
              background: isStreaming || !input.trim() ? "var(--surface-3)" : "var(--amber)",
              color: isStreaming || !input.trim() ? "var(--parchment-3)" : "var(--void)",
              border: "1px solid var(--border-2)",
            }}
          >
            {isStreaming ? "…" : "Send →"}
          </button>
        </div>
      </div>
    </div>
  );
}
