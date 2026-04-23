"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { FlashcardPayload } from "@/lib/store";

export function FlashcardDeck({ payload }: { payload: FlashcardPayload }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = payload.data[index];
  const total = payload.data.length;

  const go = (dir: 1 | -1) => {
    setFlipped(false);
    setTimeout(() => {
      setIndex((i) => (i + dir + total) % total);
    }, 180);
  };

  return (
    <div className="surface-card overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <span className="eyebrow">Recto & Verso</span>
        <span className="flex items-baseline gap-1 font-mono text-[0.72rem] text-ink-3 tabular-nums">
          <span className="text-clay">{String(index + 1).padStart(2, "0")}</span>
          <span>/</span>
          <span>{String(total).padStart(2, "0")}</span>
        </span>
      </div>

      {/* Card */}
      <div className="p-5">
        <div
          className="relative h-44 cursor-pointer select-none"
          style={{ perspective: "1400px" }}
          onClick={() => setFlipped((f) => !f)}
        >
          <motion.div
            animate={{ rotateY: flipped ? 180 : 0 }}
            transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
            style={{
              transformStyle: "preserve-3d",
              width: "100%",
              height: "100%",
              position: "relative",
            }}
          >
            {/* Front — Recto */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 rounded-xl"
              style={{
                backfaceVisibility: "hidden",
                background: "var(--vellum)",
                border: "1px solid var(--rule-2)",
                boxShadow: "var(--shadow-m)",
              }}
            >
              <span className="eyebrow mb-3">Recto · question</span>
              <p className="font-display text-[1.15rem] leading-snug text-center text-ink max-w-sm">
                {card.front}
              </p>
              <span className="absolute bottom-3 right-4 font-display italic text-[0.7rem] text-ink-4">
                click to reveal
              </span>
            </div>

            {/* Back — Verso */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center px-6 rounded-xl"
              style={{
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                background: "linear-gradient(135deg, var(--clay-wash) 0%, var(--paper-2) 100%)",
                border: "1px solid color-mix(in srgb, var(--clay) 25%, transparent)",
                boxShadow: "var(--shadow-m)",
              }}
            >
              <span className="eyebrow mb-3" style={{ color: "var(--clay)" }}>
                Verso · answer
              </span>
              <p className="text-[0.95rem] leading-relaxed text-center text-ink max-w-sm">
                {card.back}
              </p>
              <span className="absolute bottom-3 right-4 font-display italic text-[0.7rem] text-ink-4">
                click to flip back
              </span>
            </div>
          </motion.div>
        </div>

        {/* Navigation */}
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => go(-1)}
            aria-label="Previous card"
            className="group flex items-center gap-1.5 px-3 py-2 rounded-lg btn-ghost text-sm"
          >
            <span className="font-display text-sm leading-none transition-transform group-hover:-translate-x-0.5">←</span>
            <span className="font-display italic text-[0.82rem]">Prev</span>
          </button>

          {/* Dot indicator */}
          <div className="flex-1 flex items-center justify-center gap-1.5">
            {payload.data.map((_, i) => (
              <button
                key={i}
                onClick={() => { setFlipped(false); setIndex(i); }}
                aria-label={`Go to card ${i + 1}`}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === index ? "18px" : "5px",
                  height: "5px",
                  background: i === index ? "var(--clay)" : "var(--rule-2)",
                }}
              />
            ))}
          </div>

          <button
            onClick={() => go(1)}
            aria-label="Next card"
            className="group flex items-center gap-1.5 px-3 py-2 rounded-lg btn-ghost text-sm"
          >
            <span className="font-display italic text-[0.82rem]">Next</span>
            <span className="font-display text-sm leading-none transition-transform group-hover:translate-x-0.5">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}
