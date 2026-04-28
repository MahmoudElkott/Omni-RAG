"use client";

import { useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Theme, useStore } from "@/lib/store";
import { ingestFile, ingestUrl } from "@/lib/api";
import { KeysModal } from "./KeysModal";
import { ChunksDrawer } from "./ChunksDrawer";

// ── Inline SVG icons (keeps us independent of icon library quirks) ──
const Icon = {
  Upload: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v12"/><path d="m6 10 6-6 6 6"/><path d="M4 20h16"/>
    </svg>
  ),
  Link: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 1 0-7.07-7.07l-1 1"/>
      <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1-1"/>
    </svg>
  ),
  Key: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="15.5" r="4"/><path d="m10.5 12.5 10-10"/><path d="m17 5 3 3"/><path d="m14 8 3 3"/>
    </svg>
  ),
  Erase: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4l10-10a1 1 0 0 1 1.4 0l5.3 5.3a1 1 0 0 1 0 1.4L13 21"/>
      <path d="M22 21H7"/>
    </svg>
  ),
  Sun: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4"/>
      <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>
      <path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.93 19.07 1.41-1.41"/><path d="m17.66 6.34 1.41-1.41"/>
    </svg>
  ),
  Moon: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  ),
  Shield: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  ),
  Bolt: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
    </svg>
  ),
  Plus: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  ),
  Layers: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 9 5-9 5-9-5 9-5z" />
      <path d="m3 13 9 5 9-5" />
      <path d="m3 18 9 5 9-5" />
    </svg>
  ),
};

const THEMES: Array<{ value: Theme; label: string; note: string; swatch: string }> = [
  { value: "emerald", label: "Emerald / Snow", note: "Clean, professional solid fills", swatch: "linear-gradient(90deg, #2B8C67, #F7FAF6)" },
  { value: "cyber", label: "Cyber", note: "Neon glow and electric contrast", swatch: "linear-gradient(90deg, #4EF2D4, #FF7CA6)" },
  { value: "terminal", label: "Terminal", note: "Amber phosphor and retro glow", swatch: "linear-gradient(90deg, #FFB34D, #1D160F)" },
  { value: "oled", label: "OLED", note: "High contrast, pure color edges", swatch: "linear-gradient(90deg, #4DA3FF, #050505)" },
];

export function Sidebar() {
  const { mode, setMode, knowledgeScore, sessions, activeSessionId, startNewSession, selectSession, theme, setTheme } = useStore();
  const [urlInput, setUrlInput] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [keysOpen, setKeysOpen] = useState(false);
  const [chunksOpen, setChunksOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions]
  );

  const showToast = (ok: boolean, text: string) => {
    setToast({ ok, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIngesting(true);
    try {
      const res = await ingestFile(file);
      showToast(true, `${file.name} — ${res.chunks} chunks indexed`);
    } catch {
      showToast(false, "Upload failed");
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
      showToast(true, `URL indexed — ${res.chunks} chunks`);
      setUrlInput("");
    } catch {
      showToast(false, "Failed to fetch URL");
    } finally {
      setIngesting(false);
    }
  };

  return (
    <aside className="flex flex-col w-72 shrink-0 h-screen overflow-y-auto relative bg-vellum/60 backdrop-blur-[2px]"
           style={{ borderRight: "1px solid var(--rule)" }}>
      {/* Masthead */}
      <header className="px-7 pt-8 pb-6 relative">
        <div className="flex items-baseline gap-1">
          <span className="font-display text-[1.55rem] leading-none tracking-tight text-ink font-medium">Omni</span>
          <span className="font-display text-[1.55rem] leading-none text-ink-3">·</span>
          <span className="font-display italic text-[1.55rem] leading-none text-clay font-medium">RAG</span>
        </div>
        <p className="eyebrow mt-3">A Learning Hub</p>
        <div className="clay-rule mt-4" />
      </header>

      {/* Knowledge Score — the editorial showpiece */}
      <section className="px-7 pb-7">
        <div className="flex items-center justify-between mb-2">
          <span className="eyebrow">Knowledge Score</span>
          <span className="font-mono text-[0.65rem] text-ink-4 tracking-wider">VOL. I</span>
        </div>
        <motion.div
          key={knowledgeScore}
          initial={{ scale: 1.05, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
          className="flex items-baseline gap-2"
        >
          <span className="display-numeral text-6xl text-clay leading-none">
            {String(knowledgeScore).padStart(2, "0")}
          </span>
          <span className="flourish text-sm text-ink-3">points</span>
        </motion.div>
        <p className="text-xs text-ink-3 mt-3 leading-relaxed">
          Earn ten points for every correct answer in a generated quiz.
        </p>
      </section>

      <div className="hairline mx-7" />

      {/* Provider */}
      <section className="px-7 py-6">
        <span className="eyebrow">Provider</span>
        <div className="mt-3 relative p-1 rounded-xl bg-paper-2/80 border border-[var(--rule)]">
          <motion.span
            layout
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            className="absolute top-1 bottom-1 w-[calc(50%-0.25rem)] rounded-lg bg-vellum shadow-[var(--shadow-s)]"
            style={{ left: mode === "local" ? "0.25rem" : "calc(50% + 0rem)" }}
          />
          <div className="relative grid grid-cols-2 text-[0.78rem]">
            {(["local", "cloud"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`relative py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors duration-200 ${
                  mode === m ? "text-ink font-medium" : "text-ink-3 hover:text-ink-2"
                }`}
              >
                {m === "local" ? <Icon.Shield/> : <Icon.Bolt/>}
                <span className="tracking-tight">{m === "local" ? "Privacy" : "Power"}</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-[0.72rem] text-ink-3 mt-2.5 leading-relaxed">
          {mode === "local"
            ? "Ollama & LM Studio — kept on your machine."
            : "Gemini 2.0 Flash, with OpenAI on standby."}
        </p>
      </section>

      <div className="hairline mx-7" />

      {/* History */}
      <section className="px-7 py-6">
        <div className="flex items-center justify-between gap-3">
          <span className="eyebrow">History</span>
          <button
            onClick={startNewSession}
            className="group inline-flex items-center gap-1.5 text-[0.7rem] text-ink-3 hover:text-clay transition-colors"
          >
            <Icon.Plus />
            <span>New session</span>
          </button>
        </div>

        <div className="mt-3 space-y-2 max-h-44 overflow-y-auto pr-1">
          {sortedSessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <button
                key={session.id}
                onClick={() => selectSession(session.id)}
                className={`w-full text-left rounded-xl border px-3 py-3 transition-all ${
                  active
                    ? "border-[var(--rule-2)] bg-[var(--vellum)] shadow-[var(--shadow-s)]"
                    : "border-[var(--rule)] bg-paper-2/50 hover:border-[var(--rule-2)] hover:bg-[var(--vellum)]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-[0.92rem] text-ink truncate">
                      {session.title}
                    </p>
                    <p className="mt-1 text-[0.68rem] text-ink-4">
                      {session.messages.length} message{session.messages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className={`font-mono text-[0.62rem] uppercase tracking-[0.18em] ${active ? "text-clay" : "text-ink-4"}`}>
                    {active ? "Active" : "Saved"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="hairline mx-7" />

      {/* Theme */}
      <section className="px-7 py-6">
        <span className="eyebrow">Theme</span>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {THEMES.map((option) => {
            const active = theme === option.value;
            return (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`text-left rounded-xl border p-3 transition-all ${
                  active
                    ? "border-[var(--rule-2)] bg-[var(--vellum)] shadow-[var(--shadow-s)]"
                    : "border-[var(--rule)] bg-paper-2/50 hover:border-[var(--rule-2)] hover:bg-[var(--vellum)]"
                }`}
              >
                <div className="h-1.5 rounded-full" style={{ background: option.swatch }} />
                <p className="mt-2 font-display text-[0.86rem] leading-tight text-ink">
                  {option.label}
                </p>
                <p className="mt-1 text-[0.67rem] leading-snug text-ink-3">
                  {option.note}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="hairline mx-7" />

      {/* Documents */}
      <section className="px-7 py-6 flex-1 flex flex-col">
        <span className="eyebrow">Corpus</span>

        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md,.docx"
          className="hidden"
          onChange={handleFile}
        />

        <button
          onClick={() => fileRef.current?.click()}
          disabled={ingesting}
          className="mt-3 w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 btn-ghost text-sm disabled:opacity-40"
        >
          <Icon.Upload />
          <span>{ingesting ? "Indexing…" : "Upload document"}</span>
        </button>

        <div className="mt-2 flex gap-1.5">
          <div className="relative flex-1 min-w-0">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-4">
              <Icon.Link />
            </span>
            <input
              type="url"
              placeholder="https://…"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUrl()}
              className="w-full pl-8 pr-2 py-2 text-[0.8rem] rounded-lg bg-paper-2/70 border border-[var(--rule)] text-ink placeholder:text-ink-4 clay-focus transition-colors"
            />
          </div>
          <button
            onClick={handleUrl}
            disabled={ingesting || !urlInput.trim()}
            aria-label="Ingest URL"
            className="shrink-0 w-9 rounded-lg btn-clay grid place-items-center disabled:opacity-40"
          >
            <span className="font-display italic text-sm leading-none">→</span>
          </button>
        </div>

        <button
          onClick={() => setChunksOpen(true)}
          className="mt-3 inline-flex items-center gap-1.5 text-[0.72rem] text-ink-3 hover:text-clay transition-colors"
        >
          <Icon.Layers />
          <span>View chunks</span>
        </button>

        <p className="text-[0.7rem] text-ink-4 mt-2.5 leading-relaxed">
          Accepts <span className="font-mono text-[0.68rem]">pdf · txt · md · docx</span> or any URL.
        </p>

        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="mt-4 px-3 py-2 rounded-lg text-[0.72rem] leading-snug"
              style={{
                background: toast.ok ? "var(--sage-soft)" : "var(--rust-soft)",
                border: `1px solid ${toast.ok ? "color-mix(in srgb, var(--sage) 35%, transparent)" : "color-mix(in srgb, var(--rust) 35%, transparent)"}`,
                color: toast.ok ? "var(--sage)" : "var(--rust)",
              }}
            >
              <span className="font-display italic mr-1">{toast.ok ? "✓" : "✗"}</span>
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="hairline mx-7" />

      {/* Footer */}
      <footer className="px-7 py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setKeysOpen(true)}
            className="group flex items-center gap-1.5 text-[0.72rem] text-ink-3 hover:text-clay transition-colors"
          >
            <Icon.Key />
            <span>Keys</span>
          </button>
          <span className="text-ink-4 mx-1.5">·</span>
          <button
            onClick={startNewSession}
            className="group flex items-center gap-1.5 text-[0.72rem] text-ink-3 hover:text-rust transition-colors"
          >
            <Icon.Plus />
            <span>New</span>
          </button>
        </div>
      </footer>

      <KeysModal open={keysOpen} onClose={() => setKeysOpen(false)} />
      <ChunksDrawer open={chunksOpen} onClose={() => setChunksOpen(false)} />
    </aside>
  );
}
