from __future__ import annotations

import io
import re
from dataclasses import dataclass
from pathlib import Path
from typing import BinaryIO

import requests
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter


@dataclass
class Document:
    content: str
    source: str
    metadata: dict


_SPLITTER = RecursiveCharacterTextSplitter(
    chunk_size=800,
    chunk_overlap=120,  # ~15%
    separators=["\n\n", "\n", ". ", " ", ""],
)


def _clean_to_markdown(raw: str) -> str:
    text = re.sub(r"\r\n|\r", "\n", raw)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]+", " ", text)
    return text.strip()


def _split(text: str, source: str) -> list[Document]:
    chunks = _SPLITTER.split_text(text)
    return [
        Document(content=c, source=source, metadata={"chunk": i})
        for i, c in enumerate(chunks)
    ]


class IngestionEngine:
    """Loads PDF / TXT / DOCX / URL and returns chunked Documents."""

    def ingest_file(self, data: bytes, filename: str) -> list[Document]:
        ext = Path(filename).suffix.lower()
        if ext == ".pdf":
            return self._load_pdf(data, filename)
        if ext in {".txt", ".md"}:
            return self._load_text(data, filename)
        if ext == ".docx":
            return self._load_docx(data, filename)
        raise ValueError(f"Unsupported file type: {ext}")

    def ingest_url(self, url: str) -> list[Document]:
        text = self._fetch_url(url)
        cleaned = _clean_to_markdown(text)
        return _split(cleaned, source=url)

    # ── loaders ──────────────────────────────────────────────────────────

    def _load_pdf(self, data: bytes, filename: str) -> list[Document]:
        import PyPDF2

        reader = PyPDF2.PdfReader(io.BytesIO(data))
        pages = [p.extract_text() or "" for p in reader.pages]
        text = "\n\n".join(pages)
        cleaned = _clean_to_markdown(text)
        return _split(cleaned, source=filename)

    def _load_text(self, data: bytes, filename: str) -> list[Document]:
        text = data.decode("utf-8", errors="replace")
        cleaned = _clean_to_markdown(text)
        return _split(cleaned, source=filename)

    def _load_docx(self, data: bytes, filename: str) -> list[Document]:
        import docx

        doc = docx.Document(io.BytesIO(data))
        text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
        cleaned = _clean_to_markdown(text)
        return _split(cleaned, source=filename)

    def _fetch_url(self, url: str) -> str:
        headers = {"User-Agent": "Mozilla/5.0 (compatible; OmniRAG/1.0)"}
        try:
            resp = requests.get(url, headers=headers, timeout=15)
            resp.raise_for_status()
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            return soup.get_text(separator="\n")
        except requests.RequestException:
            return self._fetch_url_playwright(url)

    def _fetch_url_playwright(self, url: str) -> str:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()
            page.goto(url, wait_until="networkidle", timeout=30_000)
            html = page.content()
            browser.close()
        soup = BeautifulSoup(html, "html.parser")
        for tag in soup(["script", "style", "nav", "footer", "header"]):
            tag.decompose()
        return soup.get_text(separator="\n")
