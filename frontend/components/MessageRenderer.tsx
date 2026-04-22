"use client";

import { motion } from "framer-motion";
import type { Message } from "@/lib/store";
import { MCQCard } from "./MCQCard";
import { FlashcardDeck } from "./FlashcardDeck";
import { cn } from "@/lib/utils";

export function MessageRenderer({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  if (msg.component?.type === "mcq") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg"
      >
        <MCQCard payload={msg.component} />
      </motion.div>
    );
  }

  if (msg.component?.type === "flashcard") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md"
      >
        <FlashcardDeck payload={msg.component} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}
