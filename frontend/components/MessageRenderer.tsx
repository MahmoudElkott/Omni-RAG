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

  // ── Special payloads ────────────────────────────────────────────
  if (msg.component?.type === "mcq") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="max-w-xl"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="eyebrow">Quiz Generated</span>
          <span className="h-px flex-1 bg-[var(--rule)]" />
        </div>
        <MCQCard payload={msg.component} />
      </motion.div>
    );
  }

  if (msg.component?.type === "flashcard") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        className="max-w-md"
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="eyebrow">Flashcard Deck</span>
          <span className="h-px flex-1 bg-[var(--rule)]" />
        </div>
        <FlashcardDeck payload={msg.component} />
      </motion.div>
    );
  }

  // ── User message ────────────────────────────────────────────────
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="flex justify-end"
      >
        <div className="max-w-[78%] group">
          <div className="flex items-baseline gap-2 justify-end mb-1.5">
            <span className="eyebrow">You</span>
          </div>
          <div
            className="px-5 py-3 rounded-2xl rounded-tr-md text-[0.92rem] leading-relaxed whitespace-pre-wrap break-words"
            style={{
              background: "var(--clay-wash)",
              border: "1px solid color-mix(in srgb, var(--clay) 22%, transparent)",
              color: "var(--ink)",
            }}
          >
            {msg.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Assistant message (editorial, full-width prose) ─────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex gap-4"
    >
      {/* Avatar glyph */}
      <div className="shrink-0 mt-1">
        <div
          className="w-7 h-7 rounded-full grid place-items-center"
          style={{
            background: "var(--vellum)",
            border: "1px solid var(--rule-2)",
            boxShadow: "var(--shadow-s)",
          }}
        >
          <span className="font-display italic text-clay text-[0.82rem] leading-none">O</span>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="font-display text-[0.92rem] text-ink">Omni</span>
          <span className="flourish text-[0.72rem] text-ink-3">attending</span>
        </div>
        <div
          className={`prose-editorial ${isLast && streaming ? "streaming-cursor" : ""}`}
          style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
        >
          {msg.content || (isLast && streaming ? "" : (
            <span className="text-ink-3 italic font-display">…thinking</span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
