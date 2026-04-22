"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MCQPayload } from "@/lib/store";
import { useStore } from "@/lib/store";

export function MCQCard({ payload }: { payload: MCQPayload }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  const incrementScore = useStore((s) => s.incrementScore);

  const q = payload.data[current];

  const choose = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.correct) incrementScore(10);
  };

  const next = () => {
    if (current + 1 >= payload.data.length) {
      setDone(true);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
  };

  if (done) {
    return (
      <Card className="border-green-500/30 bg-green-950/20">
        <CardContent className="pt-6 text-center">
          <p className="text-lg font-semibold text-green-400">Quiz Complete!</p>
          <p className="text-sm text-muted-foreground mt-1">
            {payload.data.length} questions answered
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">
            {current + 1} / {payload.data.length}
          </Badge>
          <Badge variant="outline" className="text-xs">MCQ</Badge>
        </div>
        <CardTitle className="text-sm font-medium mt-2 leading-relaxed">
          {q.question}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {q.options.map((opt, idx) => {
          const isSelected = selected === idx;
          const isCorrect = idx === q.correct;
          const showResult = selected !== null;

          let variant: "default" | "outline" | "destructive" = "outline";
          if (showResult && isCorrect) variant = "default";
          else if (showResult && isSelected && !isCorrect) variant = "destructive";

          return (
            <motion.div key={idx} whileTap={{ scale: 0.98 }}>
              <Button
                variant={variant}
                className="w-full justify-start text-left h-auto py-2 px-3"
                onClick={() => choose(idx)}
              >
                <span className="mr-2 font-mono text-xs opacity-60">
                  {String.fromCharCode(65 + idx)}.
                </span>
                {opt}
              </Button>
            </motion.div>
          );
        })}

        <AnimatePresence>
          {selected !== null && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground"
            >
              {q.explanation}
            </motion.div>
          )}
        </AnimatePresence>

        {selected !== null && (
          <Button className="w-full mt-2" size="sm" onClick={next}>
            {current + 1 >= payload.data.length ? "Finish" : "Next →"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
