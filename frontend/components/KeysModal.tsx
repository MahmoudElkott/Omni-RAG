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
  const [keys, setKeys] = useState<KeysData>({ gemini_api_key: "", openai_api_key: "", lm_studio_base_url: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetch(`${BASE}/api/settings/keys`)
      .then(r => r.json())
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
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="fixed z-50 top-1/2 left-1/2 w-full max-w-md"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <div
              className="rounded-sm p-6"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border-2)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "1rem" }}>
                <div>
                  <p className="font-display text-lg" style={{ color: "var(--amber)" }}>API Keys</p>
                  <p className="text-xs font-mono mt-0.5" style={{ color: "var(--parchment-3)" }}>
                    Keys are stored in memory for this session only
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="text-xs font-mono px-2 py-1 rounded-sm transition-colors"
                  style={{ color: "var(--parchment-3)", border: "1px solid var(--border)" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "var(--parchment)")}
                  onMouseLeave={e => (e.currentTarget.style.color = "var(--parchment-3)")}
                >
                  ✕
                </button>
              </div>

              {/* Fields */}
              <div className="space-y-4">
                {[
                  { label: "Gemini API Key", key: "gemini_api_key" as const, placeholder: "AIzaSy…", hint: "google.ai" },
                  { label: "OpenAI API Key", key: "openai_api_key" as const, placeholder: "sk-…", hint: "platform.openai.com" },
                  { label: "LM Studio URL", key: "lm_studio_base_url" as const, placeholder: "http://localhost:1234/v1", hint: "local" },
                ].map(({ label, key, placeholder, hint }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-mono tracking-wider uppercase" style={{ color: "var(--parchment-2)" }}>
                        {label}
                      </label>
                      <span className="text-xs font-mono" style={{ color: "var(--parchment-3)" }}>{hint}</span>
                    </div>
                    <input
                      type={key.includes("url") ? "text" : "password"}
                      value={keys[key]}
                      onChange={e => setKeys(k => ({ ...k, [key]: e.target.value }))}
                      placeholder={keys[key] ? `Current: ${keys[key]}` : placeholder}
                      className="w-full px-3 py-2 text-xs font-mono rounded-sm glow-focus"
                      style={{
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        color: "var(--parchment)",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-mono tracking-wider uppercase rounded-sm transition-all"
                  style={{ border: "1px solid var(--border)", color: "var(--parchment-3)", background: "transparent" }}
                >
                  Cancel
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="flex-1 py-2 text-xs font-mono tracking-wider uppercase rounded-sm transition-all disabled:opacity-40"
                  style={{ background: saved ? "var(--emerald)" : "var(--amber)", color: "var(--void)", border: "none" }}
                >
                  {saved ? "✓ Saved" : saving ? "Saving…" : "Save Keys"}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
