"use client";

import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { ingestFile, ingestUrl } from "@/lib/api";

export function Sidebar() {
  const { mode, setMode, knowledgeScore, clearChat } = useStore();
  const [urlInput, setUrlInput] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [lastIngested, setLastIngested] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIngesting(true);
    try {
      const res = await ingestFile(file);
      setLastIngested(`${file.name} — ${res.chunks} chunks`);
    } finally {
      setIngesting(false);
    }
  };

  const handleUrl = async () => {
    if (!urlInput.trim()) return;
    setIngesting(true);
    try {
      const res = await ingestUrl(urlInput.trim());
      setLastIngested(`URL — ${res.chunks} chunks`);
      setUrlInput("");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <aside className="flex flex-col w-64 border-r border-border/50 bg-background/95 p-4 gap-4 h-screen">
      {/* Logo */}
      <div className="pt-2">
        <h1 className="text-base font-semibold tracking-tight">Omni-RAG</h1>
        <p className="text-xs text-muted-foreground">Learning Hub</p>
      </div>

      <Separator />

      {/* Knowledge Score */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2">
        <p className="text-xs text-muted-foreground">Knowledge Score</p>
        <motion.p
          key={knowledgeScore}
          initial={{ scale: 1.2 }}
          animate={{ scale: 1 }}
          className="text-2xl font-bold text-primary"
        >
          {knowledgeScore}
        </motion.p>
      </div>

      {/* Provider Toggle */}
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Provider
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(["local", "cloud"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-2 py-1.5 text-xs font-medium transition-all ${
                mode === m
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "local" ? "🔒 Privacy" : "⚡ Power"}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {mode === "local" ? "Ollama / LM Studio" : "Gemini / OpenAI"}
        </p>
      </div>

      <Separator />

      {/* Document Ingestion */}
      <div className="space-y-2 flex-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Documents
        </p>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="hidden"
          onChange={handleFile}
        />
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => fileRef.current?.click()}
          disabled={ingesting}
        >
          {ingesting ? "Ingesting…" : "Upload File"}
        </Button>

        <div className="flex gap-1">
          <input
            type="url"
            placeholder="https://..."
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUrl()}
            className="flex-1 min-w-0 rounded-md border border-input bg-transparent px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button size="sm" variant="outline" onClick={handleUrl} disabled={ingesting}>
            +
          </Button>
        </div>

        {lastIngested && (
          <Badge variant="secondary" className="text-[10px] w-full justify-center">
            ✓ {lastIngested}
          </Badge>
        )}
      </div>

      <Separator />

      <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clearChat}>
        Clear Chat
      </Button>
    </aside>
  );
}
