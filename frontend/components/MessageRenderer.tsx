"use client";

import { motion } from "framer-motion";
import type { Message } from "@/lib/store";
import { MCQCard } from "./MCQCard";
import { FlashcardDeck } from "./FlashcardDeck";

interface Props {
  msg: Message;
  isLast?: boolean;
  streaming?: boolean;
}

export function MessageRenderer({ msg, isLast, streaming }: Props) {
  const isUser = msg.role === "user";

  if (msg.component?.type === "mcq") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl"
      >
        <p className="text-xs font-mono mb-3 tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
          Quiz Generated
        </p>
        <MCQCard payload={msg.component} />
      </motion.div>
    );
  }

  if (msg.component?.type === "flashcard") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md"
      >
        <p className="text-xs font-mono mb-3 tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
          Flashcard Deck
        </p>
        <FlashcardDeck payload={msg.component} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
    >
      <p
        className="text-xs font-mono mb-1.5 tracking-widest uppercase"
        style={{ color: isUser ? "var(--amber)" : "var(--parchment-3)" }}
      >
        {isUser ? "You" : "Omni"}
      </p>
      <div
        className={`max-w-[80%] px-4 py-3 text-sm font-mono leading-relaxed rounded-sm ${
          isLast && streaming && !isUser ? "streaming-cursor" : ""
        }`}
        style={{
          background: isUser ? "var(--amber-dim)" : "var(--surface)",
          border: `1px solid ${isUser ? "rgba(212,168,83,0.3)" : "var(--border)"}`,
          color: isUser ? "var(--parchment)" : "var(--parchment)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {msg.content || (isLast && streaming ? "" : "…")}
      </div>
    </motion.div>
  );
}
