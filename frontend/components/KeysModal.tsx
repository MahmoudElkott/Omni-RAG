"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface KeysData {
  gemini_api_key: string;
  openai_api_key: string;
  lm_studio_base_url: string;
}

export function KeysModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [keys, setKeys] = useState<KeysData>({
    gemini_api_key: "",
    openai_api_key: "",
    lm_studio_base_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`${BASE}/api/settings/keys`)
      .then((r) => r.json())
      .then(setKeys)
      .catch(() => {});
  }, [open]);

  const save = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/api/settings/keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gemini_api_key: keys.gemini_api_key || null,
          openai_api_key: keys.openai_api_key || null,
          lm_studio_base_url: keys.lm_studio_base_url || null,
        }),
      });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    { label: "Gemini", key: "gemini_api_key" as const, placeholder: "AIzaSy…", hint: "google.ai", type: "password" },
    { label: "OpenAI", key: "openai_api_key" as const, placeholder: "sk-…", hint: "platform.openai.com", type: "password" },
    { label: "LM Studio URL", key: "lm_studio_base_url" as const, placeholder: "http://localhost:1234/v1", hint: "local", type: "text" },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "color-mix(in srgb, var(--ink) 55%, transparent)", backdropFilter: "blur(6px)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="fixed z-50 top-1/2 left-1/2 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2"
          >
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--vellum)",
                border: "1px solid var(--rule-2)",
                boxShadow: "var(--shadow-l)",
              }}
            >
              {/* Header */}
              <div className="px-7 pt-6 pb-4 flex items-start justify-between" style={{ borderBottom: "1px solid var(--rule)" }}>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="eyebrow">Settings</span>
                  </div>
                  <h2 className="mt-1 font-display text-[1.4rem] text-ink leading-tight">
                    Your <span className="italic text-clay">keys</span>, in confidence
                  </h2>
                  <p className="text-[0.78rem] text-ink-3 mt-1 leading-relaxed max-w-xs">
                    Held only for this session — nothing written to disk.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="shrink-0 w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink hover:bg-[var(--paper-2)] transition-colors"
                >
                  <span className="text-lg font-display leading-none">×</span>
                </button>
              </div>

              {/* Fields */}
              <div className="px-7 py-6 space-y-4">
                {fields.map(({ label, key, placeholder, hint, type }) => (
                  <div key={key}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="font-display text-[0.92rem] text-ink">
                        {label}
                      </label>
                      <span className="font-mono text-[0.68rem] text-ink-4">{hint}</span>
                    </div>
                    <input
                      type={type}
                      value={keys[key]}
                      onChange={(e) => setKeys((k) => ({ ...k, [key]: e.target.value }))}
                      placeholder={keys[key] ? "••• currently set •••" : placeholder}
                      className="w-full px-3.5 py-2.5 text-[0.85rem] rounded-xl bg-[var(--paper-2)] border border-[var(--rule)] text-ink placeholder:text-ink-4 clay-focus transition-all focus:bg-[var(--vellum)]"
                      style={{ fontFamily: type === "password" ? "var(--font-mono)" : "var(--font-sans)" }}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-7 pb-6 pt-2 flex gap-2.5">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl btn-ghost text-sm"
                >
                  <span className="font-display italic">Cancel</span>
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl btn-clay text-sm flex items-center justify-center gap-1.5"
                  style={saved ? { background: "var(--sage)", borderColor: "var(--sage)" } : undefined}
                >
                  {saved ? (
                    <>
                      <span className="font-display italic">Saved</span>
                      <span className="leading-none">✓</span>
                    </>
                  ) : saving ? (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-vellum/40 border-t-vellum animate-spin" />
                      <span>Saving</span>
                    </>
                  ) : (
                    <>
                      <span className="font-display italic">Save</span>
                      <span className="leading-none">→</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
