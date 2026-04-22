"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FlashcardPayload } from "@/lib/store";

export function FlashcardDeck({ payload }: { payload: FlashcardPayload }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const card = payload.data[index];

  const next = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => (i + 1) % payload.data.length), 150);
  };
  const prev = () => {
    setFlipped(false);
    setTimeout(() => setIndex((i) => (i - 1 + payload.data.length) % payload.data.length), 150);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-xs">Flashcards</Badge>
        <span className="text-xs text-muted-foreground">
          {index + 1} / {payload.data.length}
        </span>
      </div>

      <div
        className="relative h-40 cursor-pointer select-none"
        style={{ perspective: 1000 }}
        onClick={() => setFlipped((f) => !f)}
      >
        <motion.div
          className="absolute inset-0"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-xl border border-border/60 bg-card flex items-center justify-center p-5 backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            <p className="text-center text-sm font-medium leading-relaxed">{card.front}</p>
          </div>
          {/* Back */}
          <div
            className="absolute inset-0 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center p-5"
            style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
          >
            <p className="text-center text-sm leading-relaxed text-primary">{card.back}</p>
          </div>
        </motion.div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {flipped ? "Click to flip back" : "Click card to reveal answer"}
      </p>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1" onClick={prev}>← Prev</Button>
        <Button variant="outline" size="sm" className="flex-1" onClick={next}>Next →</Button>
      </div>
    </div>
  );
}
