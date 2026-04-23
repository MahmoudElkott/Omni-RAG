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
  const incrementScore = useStore((s) => s.incrementScore);

  const q = payload.data[current];
  const total = payload.data.length;

  const choose = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) {
      incrementScore(10);
      setScore((s) => s + 1);
    }
  };

  const next = () => {
    if (current + 1 >= total) { setDone(true); return; }
    setCurrent((c) => c + 1);
    setSelected(null);
  };

  // ── Result page ────────────────────────────────────────────────
  if (done) {
    const pct = score / total;
    const verdict =
      pct === 1 ? { title: "A perfect performance", body: "Every question answered correctly." } :
      pct >= 0.7 ? { title: "Well judged", body: "A strong command of the material." } :
      pct >= 0.4 ? { title: "Steady progress", body: "Review the ones that slipped; come back tomorrow." } :
                   { title: "The beginning of mastery", body: "Every scholar starts here. Study and return." };

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="surface-card p-8 text-center"
      >
        <span className="eyebrow">Quiz Complete</span>
        <div className="mt-4 flex items-baseline justify-center gap-2">
          <span className="display-numeral text-7xl text-clay leading-none">{score}</span>
          <span className="font-display text-2xl text-ink-3 leading-none">/</span>
          <span className="display-numeral text-3xl text-ink-2 leading-none">{total}</span>
        </div>
        <div className="clay-rule mx-auto mt-6" />
        <p className="font-display text-lg mt-4 text-ink">
          <span className="italic">{verdict.title}</span>
        </p>
        <p className="text-sm text-ink-3 mt-1.5 max-w-xs mx-auto leading-relaxed">
          {verdict.body}
        </p>
        <p className="eyebrow mt-6">+{score * 10} added to your score</p>
      </motion.div>
    );
  }

  // ── Question page ──────────────────────────────────────────────
  return (
    <div className="surface-card overflow-hidden">
      {/* Progress ribbon */}
      <div className="relative h-[3px] bg-[var(--paper-2)]">
        <motion.div
          className="absolute inset-y-0 left-0 bg-clay"
          animate={{ width: `${(current / total) * 100}%` }}
          transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
        />
      </div>

      <div className="p-6">
        {/* Meta */}
        <div className="flex items-center justify-between mb-5">
          <span className="eyebrow">
            Question <span className="text-ink-2">{current + 1}</span> of <span className="text-ink-2">{total}</span>
          </span>
          <span className="inline-flex items-baseline gap-1 text-clay">
            <span className="font-mono text-[0.72rem] tabular-nums">+{score * 10}</span>
            <span className="font-display italic text-[0.72rem]">pts</span>
          </span>
        </div>

        {/* Question */}
        <motion.p
          key={current}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-[1.15rem] leading-snug text-ink mb-5"
        >
          {q.question}
        </motion.p>

        {/* Options */}
        <div className="space-y-2">
          {q.options.map((opt, idx) => {
            const showResult = selected !== null;
            const isSelected = selected === idx;
            const isCorrect = idx === q.correct;

            let cls = "border-[var(--rule-2)] bg-transparent text-ink-2 hover:border-clay/50 hover:bg-clay-wash hover:text-ink";
            if (showResult && isCorrect) cls = "border-[color-mix(in_srgb,var(--sage)_50%,transparent)] bg-[var(--sage-soft)] text-[var(--sage)]";
            else if (showResult && isSelected && !isCorrect) cls = "border-[color-mix(in_srgb,var(--rust)_50%,transparent)] bg-[var(--rust-soft)] text-[var(--rust)]";
            else if (showResult) cls = "border-[var(--rule)] bg-transparent text-ink-3 opacity-60";

            return (
              <motion.button
                key={idx}
                whileTap={selected === null ? { scale: 0.995 } : {}}
                onClick={() => choose(idx)}
                disabled={selected !== null}
                className={`w-full text-left px-4 py-3 rounded-xl text-[0.92rem] leading-snug border transition-all duration-200 flex items-start gap-3 ${cls} ${selected !== null && !isSelected && !(showResult && isCorrect) ? "cursor-default" : selected === null ? "cursor-pointer" : "cursor-default"}`}
              >
                <span className="shrink-0 mt-[0.05rem] w-6 h-6 rounded-full border border-current flex items-center justify-center font-display text-[0.72rem] font-medium">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{opt}</span>
                {showResult && isCorrect && (
                  <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} className="shrink-0 font-display italic">✓</motion.span>
                )}
                {showResult && isSelected && !isCorrect && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="shrink-0 font-display italic">✗</motion.span>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Explanation & next */}
        <AnimatePresence>
          {selected !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-5 pt-4" style={{ borderTop: "1px solid var(--rule)" }}>
                <div className="flex gap-3">
                  <span className="font-display italic text-clay text-lg leading-none shrink-0">¶</span>
                  <p className="text-[0.88rem] leading-relaxed text-ink-2">
                    {q.explanation}
                  </p>
                </div>
                <button
                  onClick={next}
                  className="mt-4 w-full py-2.5 rounded-xl btn-clay text-sm flex items-center justify-center gap-1.5"
                >
                  <span className="font-display italic">{current + 1 >= total ? "Finish" : "Next question"}</span>
                  <span className="leading-none">→</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
