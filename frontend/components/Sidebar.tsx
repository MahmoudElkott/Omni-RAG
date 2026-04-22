"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { ingestFile, ingestUrl } from "@/lib/api";

export function Sidebar() {
  const { mode, setMode, knowledgeScore, clearChat } = useStore();
  const [urlInput, setUrlInput] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIngesting(true);
    try {
      const res = await ingestFile(file);
      showToast(`✓ ${file.name} — ${res.chunks} chunks indexed`);
    } catch {
      showToast("✗ Upload failed");
    } finally {
      setIngesting(false);
      e.target.value = "";
    }
  };

  const handleUrl = async () => {
    if (!urlInput.trim()) return;
    setIngesting(true);
    try {
      const res = await ingestUrl(urlInput.trim());
      showToast(`✓ URL indexed — ${res.chunks} chunks`);
      setUrlInput("");
    } catch {
      showToast("✗ Failed to fetch URL");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <aside
      className="flex flex-col w-60 shrink-0 h-screen"
      style={{
        background: "var(--surface)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div
        className="px-6 py-5"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <p className="font-display text-xl font-semibold tracking-wide" style={{ color: "var(--amber)" }}>
          Omni<span style={{ color: "var(--parchment)" }}>RAG</span>
        </p>
        <p className="text-xs mt-0.5 tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
          Learning Hub
        </p>
      </div>

      {/* Knowledge Score */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs tracking-widest uppercase mb-2" style={{ color: "var(--parchment-3)" }}>
          Knowledge Score
        </p>
        <motion.div
          key={knowledgeScore}
          initial={{ scale: 1.15, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="flex items-baseline gap-1"
        >
          <span
            className="font-display text-4xl font-bold"
            style={{ color: "var(--amber)" }}
          >
            {knowledgeScore}
          </span>
          <span className="text-xs" style={{ color: "var(--parchment-3)" }}>pts</span>
        </motion.div>
      </div>

      {/* Provider Mode */}
      <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <p className="text-xs tracking-widest uppercase mb-3" style={{ color: "var(--parchment-3)" }}>
          Provider
        </p>
        <div
          className="flex rounded-sm overflow-hidden"
          style={{ border: "1px solid var(--border-2)" }}
        >
          {(["local", "cloud"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2 text-xs font-mono tracking-wider uppercase transition-all duration-200"
              style={{
                background: mode === m ? "var(--amber)" : "transparent",
                color: mode === m ? "var(--void)" : "var(--parchment-2)",
                fontWeight: mode === m ? 500 : 300,
              }}
            >
              {m === "local" ? "🔒 Local" : "⚡ Cloud"}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--parchment-3)" }}>
          {mode === "local" ? "Ollama / LM Studio" : "Gemini 2.0 / GPT-4o"}
        </p>
      </div>

      {/* Document Ingestion */}
      <div className="px-6 py-5 flex-1 flex flex-col gap-3">
        <p className="text-xs tracking-widest uppercase" style={{ color: "var(--parchment-3)" }}>
          Documents
        </p>

        <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.docx" className="hidden" onChange={handleFile} />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={ingesting}
          className="w-full py-2 text-xs tracking-wider uppercase transition-all duration-200 rounded-sm"
          style={{
            border: "1px solid var(--border-2)",
            color: ingesting ? "var(--parchment-3)" : "var(--parchment)",
            background: "transparent",
          }}
          onMouseEnter={e => (e.currentTarget.style.background = "var(--amber-dim)")}
          onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
        >
          {ingesting ? "Indexing…" : "+ Upload File"}
        </button>

        <div className="flex gap-1">
          <input
            type="url"
            placeholder="https://…"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleUrl()}
            className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-sm glow-focus"
            style={{
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              color: "var(--parchment)",
            }}
          />
          <button
            onClick={handleUrl}
            disabled={ingesting}
            className="px-3 py-1.5 text-xs rounded-sm transition-colors"
            style={{
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              color: "var(--amber)",
            }}
          >
            →
          </button>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-xs px-2 py-1.5 rounded-sm"
              style={{
                background: "var(--amber-glow)",
                border: "1px solid var(--border)",
                color: "var(--amber)",
              }}
            >
              {toast}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-6 py-4" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={clearChat}
          className="text-xs tracking-wider uppercase w-full text-left transition-colors"
          style={{ color: "var(--parchment-3)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--crimson)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--parchment-3)")}
        >
          Clear Session
        </button>
      </div>
    </aside>
  );
}
