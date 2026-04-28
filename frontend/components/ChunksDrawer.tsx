"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { fetchChunks } from "@/lib/api";

interface ChunkItem {
  id: string;
  source: string;
  chunk: number;
  content: string;
}

export function ChunksDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [chunks, setChunks] = useState<ChunkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchChunks()
      .then((data) => {
        if (cancelled) return;
        setChunks(Array.isArray(data?.chunks) ? data.chunks : []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load chunks.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const filteredChunks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return chunks;
    return chunks.filter((chunk) => {
      const haystack = `${chunk.source} ${chunk.chunk} ${chunk.content}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [chunks, query]);

  const sourceCount = useMemo(() => new Set(chunks.map((chunk) => chunk.source)).size, [chunks]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 backdrop-blur-[4px]"
            style={{ background: "color-mix(in srgb, var(--ink) 35%, transparent)" }}
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            transition={{ duration: 0.28, ease: [0.2, 0, 0, 1] }}
            className="fixed z-[60] top-1/2 left-1/2 h-[min(88vh,58rem)] w-[min(94vw,72rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[var(--paper)] shadow-[var(--shadow-l)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex h-full flex-col">
              <header className="px-6 pt-6 pb-4 border-b border-[var(--rule)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="eyebrow">Corpus chunks</span>
                    <h2 className="mt-1 font-display text-[1.35rem] leading-tight text-ink">
                      Every indexed chunk, in one place
                    </h2>
                    <p className="mt-1 text-[0.8rem] leading-relaxed text-ink-3 max-w-md">
                      Browse the raw chunks backing retrieval. Search by source name or by text inside a chunk.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close chunks drawer"
                    className="w-8 h-8 rounded-full grid place-items-center text-ink-3 hover:text-ink hover:bg-[var(--paper-2)] transition-colors"
                  >
                    <span className="text-lg font-display leading-none">×</span>
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.68rem] text-ink-4">
                  <span className="inline-flex items-center rounded-full border border-[var(--rule)] bg-[var(--vellum)] px-2.5 py-1">
                    {chunks.length} chunks
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[var(--rule)] bg-[var(--vellum)] px-2.5 py-1">
                    {sourceCount} sources
                  </span>
                </div>

                <div className="mt-4">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search source or text"
                    className="w-full rounded-xl border border-[var(--rule)] bg-[var(--vellum)] px-3.5 py-2.5 text-[0.85rem] text-ink placeholder:text-ink-4 clay-focus transition-colors focus:bg-[var(--paper-2)]"
                  />
                </div>
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
                {loading ? (
                  <div className="flex h-full items-center justify-center text-[0.82rem] text-ink-3">
                    Loading chunks...
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-[var(--rule)] bg-[var(--vellum)] px-4 py-4 text-sm text-rust">
                    {error}
                  </div>
                ) : filteredChunks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[var(--rule)] bg-[var(--vellum)] px-5 py-8 text-center">
                    <p className="font-display text-[1rem] text-ink">No chunks found</p>
                    <p className="mt-1 text-[0.78rem] leading-relaxed text-ink-3">
                      Upload a file or ingest a URL to populate the corpus.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredChunks.map((chunk) => (
                      <article key={chunk.id} className="rounded-2xl border border-[var(--rule)] bg-[var(--vellum)] p-4 shadow-[var(--shadow-s)]">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-display text-[0.95rem] text-ink truncate">
                              {chunk.source}
                            </p>
                            <p className="mt-1 font-mono text-[0.66rem] uppercase tracking-[0.18em] text-ink-4">
                              Chunk {String(chunk.chunk + 1).padStart(2, "0")}
                            </p>
                          </div>
                          <span className="rounded-full border border-[var(--rule)] bg-[var(--paper-2)] px-2.5 py-1 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ink-3">
                            {chunk.content.split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>

                        <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-[var(--rule)] bg-[var(--paper-2)] p-3 text-[0.8rem] leading-relaxed text-ink-2 whitespace-pre-wrap">
                          {chunk.content}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
