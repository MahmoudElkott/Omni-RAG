"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useStore, type Message } from "@/lib/store";
import { streamChat, generateMCQ, generateFlashcards } from "@/lib/api";
import { MessageRenderer } from "./MessageRenderer";

const COMMANDS = {
  "/mcq": { label: "Generate MCQ quiz", hint: "/mcq <topic>" },
  "/flash": { label: "Generate flashcards", hint: "/flash <topic>" },
};

export function ChatWorkspace() {
  const { messages, mode, addMessage, isStreaming, setStreaming } = useStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");

    addMessage({ role: "user", content: text });

    // Handle slash commands
    if (text.startsWith("/mcq ")) {
      const topic = text.slice(5).trim();
      setStreaming(true);
      try {
        const payload = await generateMCQ(topic, 5, mode);
        addMessage({ role: "assistant", content: "", component: payload });
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
      } finally {
        setStreaming(false);
      }
      return;
    }

    // Regular chat with streaming
    setStreaming(true);
    const history = messages.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let accumulated = "";
    const tempId = crypto.randomUUID();
    addMessage({ role: "assistant", content: "" });

    try {
      for await (const token of streamChat(text, history, mode)) {
        accumulated += token;
        useStore.setState((s) => ({
          messages: s.messages.map((m) =>
            m.id === s.messages[s.messages.length - 1].id
              ? { ...m, content: accumulated }
              : m
          ),
        }));
      }
    } catch {
      useStore.setState((s) => ({
        messages: s.messages.map((m, i) =>
          i === s.messages.length - 1
            ? { ...m, content: "Error: could not connect to backend." }
            : m
        ),
      }));
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-screen overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">Chat</p>
          <p className="text-xs text-muted-foreground">
            {mode === "local" ? "🔒 Privacy Mode — Local AI" : "⚡ Power Mode — Cloud AI"}
          </p>
        </div>
        <div className="text-xs text-muted-foreground space-x-2">
          <span className="opacity-50">/mcq</span>
          <span className="opacity-50">/flash</span>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm pt-16 space-y-2">
              <p className="text-2xl">📚</p>
              <p>Upload a document or paste a URL to start learning.</p>
              <p className="text-xs opacity-60">
                Use <code>/mcq topic</code> or <code>/flash topic</code> for interactive study tools.
              </p>
            </div>
          )}
          <AnimatePresence>
            {messages.map((msg) => (
              <MessageRenderer key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="border-t border-border/50 px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask anything… or try /mcq Neural Networks"
            disabled={isStreaming}
            className="flex-1 rounded-xl border border-input bg-muted/30 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <Button
            onClick={send}
            disabled={isStreaming || !input.trim()}
            className="rounded-xl px-5"
          >
            {isStreaming ? "…" : "Send"}
          </Button>
        </div>
      </div>
    </div>
  );
}
