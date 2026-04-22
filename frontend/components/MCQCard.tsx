"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MCQPayload } from "@/lib/store";
import { useStore } from "@/lib/store";

export function MCQCard({ payload }: { payload: MCQPayload }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const incrementScore = useStore(s => s.incrementScore);

  const q = payload.data[current];
  const total = payload.data.length;

  const choose = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) {
      incrementScore(10);
      setScore(s => s + 1);
    }
  };

  const next = () => {
    if (current + 1 >= total) { setDone(true); return; }
    setCurrent(c => c + 1);
    setSelected(null);
  };

  if (done) {
    return (
      <div
        className="p-6 rounded-sm text-center"
        style={{ background: "var(--surface)", border: "1px solid var(--border-2)" }}
      >
        <p className="font-display text-2xl mb-1" style={{ color: "var(--amber)" }}>
          {score}/{total}
        </p>
        <p className="text-xs font-mono tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
          Quiz Complete
        </p>
        <div
          className="mt-3 text-xs font-mono"
          style={{ color: score === total ? "var(--emerald)" : "var(--parchment-2)" }}
        >
          {score === total ? "Perfect score!" : score >= total / 2 ? "Good work." : "Keep studying."}
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Progress bar */}
      <div className="h-px" style={{ background: "var(--surface-3)" }}>
        <motion.div
          className="h-full"
          style={{ background: "var(--amber)" }}
          animate={{ width: `${((current) / total) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
            {current + 1} / {total}
          </span>
          <span className="text-xs font-mono" style={{ color: "var(--amber)" }}>
            +{score * 10} pts
          </span>
        </div>

        {/* Question */}
        <p className="font-mono text-sm leading-relaxed mb-5" style={{ color: "var(--parchment)" }}>
          {q.question}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt, idx) => {
            const isSelected = selected === idx;
            const isCorrect = idx === q.correct;
            const showResult = selected !== null;

            let bg = "transparent";
            let borderColor = "var(--border)";
            let textColor = "var(--parchment-2)";

            if (showResult && isCorrect) {
              bg = "rgba(39,174,96,0.1)";
              borderColor = "var(--emerald)";
              textColor = "var(--emerald)";
            } else if (showResult && isSelected && !isCorrect) {
              bg = "rgba(192,57,43,0.1)";
              borderColor = "var(--crimson)";
              textColor = "var(--crimson)";
            } else if (!showResult) {
              bg = "transparent";
            }

            return (
              <motion.button
                key={idx}
                whileTap={{ scale: 0.99 }}
                onClick={() => choose(idx)}
                disabled={selected !== null}
                className="w-full text-left px-4 py-2.5 rounded-sm text-xs font-mono transition-all duration-200"
                style={{
                  background: bg,
                  border: `1px solid ${borderColor}`,
                  color: textColor,
                  cursor: selected !== null ? "default" : "pointer",
                }}
                onMouseEnter={e => {
                  if (selected === null) (e.currentTarget as HTMLElement).style.background = "var(--amber-dim)";
                }}
                onMouseLeave={e => {
                  if (selected === null) (e.currentTarget as HTMLElement).style.background = "transparent";
                }}
              >
                <span className="mr-2 opacity-50">{String.fromCharCode(65 + idx)}.</span>
                {opt}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {selected !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-4 overflow-hidden"
            >
              <div
                className="px-4 py-3 rounded-sm text-xs font-mono leading-relaxed"
                style={{ background: "var(--surface-2)", border: "1px solid var(--border)", color: "var(--parchment-2)" }}
              >
                <span className="mr-1" style={{ color: "var(--amber)" }}>※</span>
                {q.explanation}
              </div>
              <button
                onClick={next}
                className="mt-3 w-full py-2 text-xs font-mono tracking-wider uppercase rounded-sm transition-all duration-200"
                style={{
                  background: "var(--amber)",
                  color: "var(--void)",
                  border: "none",
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")}
                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
              >
                {current + 1 >= total ? "Finish" : "Next →"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
