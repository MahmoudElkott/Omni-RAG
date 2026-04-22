"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { FlashcardPayload } from "@/lib/store";

export function FlashcardDeck({ payload }: { payload: FlashcardPayload }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(0);

  const card = payload.data[index];
  const total = payload.data.length;

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setDirection(dir);
    setTimeout(() => {
      setIndex(i => (i + dir + total) % total);
    }, 180);
  };

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
          Flashcard Deck
        </span>
        <span className="text-xs font-mono" style={{ color: "var(--amber)" }}>
          {index + 1} / {total}
        </span>
      </div>

      {/* Card */}
      <div className="p-5">
        <div
          className="relative h-36 cursor-pointer select-none mb-4"
          style={{ perspective: "1000px" }}
          onClick={() => setFlipped(f => !f)}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            style={{ transformStyle: "preserve-3d", width: "100%", height: "100%" }}
          >
            {/* Front */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 rounded-sm"
              style={{
                backfaceVisibility: "hidden",
                background: "var(--surface-2)",
                border: "1px solid var(--border-2)",
              }}
            >
              <p className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: "var(--parchment-3)" }}>
                Question
              </p>
              <p className="text-sm font-mono text-center leading-relaxed" style={{ color: "var(--parchment)" }}>
                {card.front}
              </p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 rounded-sm"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "var(--amber-dim)",
                border: "1px solid rgba(212,168,83,0.4)",
              }}
            >
              <p className="text-xs font-mono tracking-widest uppercase mb-3" style={{ color: "var(--amber)" }}>
                Answer
              </p>
              <p className="text-sm font-mono text-center leading-relaxed" style={{ color: "var(--parchment)" }}>
                {card.back}
              </p>
            </div>
          </motion.div>
        </div>

        {/* Hint */}
        <p className="text-center text-xs font-mono mb-4" style={{ color: "var(--parchment-3)" }}>
          {flipped ? "Click to flip back" : "Click to reveal answer"}
        </p>

        {/* Navigation */}
        <div className="flex gap-2">
          <button
            onClick={() => go(-1)}
            className="flex-1 py-2 text-xs font-mono tracking-wider uppercase rounded-sm transition-all"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--parchment-2)",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--amber)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            ← Prev
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1 px-3">
            {payload.data.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === index ? "12px" : "4px",
                  height: "4px",
                  background: i === index ? "var(--amber)" : "var(--parchment-3)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => go(1)}
            className="flex-1 py-2 text-xs font-mono tracking-wider uppercase rounded-sm transition-all"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--parchment-2)",
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--amber)")}
            onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}
