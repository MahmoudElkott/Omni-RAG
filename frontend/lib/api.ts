const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export async function* streamChat(
  message: string,
  history: { role: string; content: string }[],
  mode: "local" | "cloud"
): AsyncGenerator<string> {
  const resp = await fetch(`${BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, mode }),
  });
  if (!resp.ok || !resp.body) throw new Error("Stream failed");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      const parsed = JSON.parse(data);
      if (parsed.token) yield parsed.token;
    }
  }
}

export async function generateMCQ(topic: string, count: number, mode: string) {
  const r = await fetch(`${BASE}/api/generate/mcq`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, count, mode }),
  });
  return r.json();
}

export async function generateFlashcards(topic: string, count: number, mode: string) {
  const r = await fetch(`${BASE}/api/generate/flashcards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, count, mode }),
  });
  return r.json();
}

export async function ingestFile(file: File) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${BASE}/api/ingest/file`, { method: "POST", body: form });
  return r.json();
}

export async function ingestUrl(url: string) {
  const r = await fetch(`${BASE}/api/ingest/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return r.json();
}

export async function checkHealth() {
  const r = await fetch(`${BASE}/api/health`);
  return r.json();
}
