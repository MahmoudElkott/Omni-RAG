from __future__ import annotations

import io
import re
from typing import Iterable


def normalize_text(text: str) -> str:
    cleaned = text.replace("\x00", " ").replace("\r\n", "\n").replace("\r", "\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages: list[str] = []
    for page in reader.pages:
        pages.append(page.extract_text() or "")
    return normalize_text("\n\n".join(pages))


def extract_text_from_docx(file_bytes: bytes) -> str:
    from docx import Document

    document = Document(io.BytesIO(file_bytes))
    paragraphs = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
    return normalize_text("\n\n".join(paragraphs))


def extract_text_from_txt(file_bytes: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "cp1256", "latin-1"):
        try:
            return normalize_text(file_bytes.decode(encoding))
        except UnicodeDecodeError:
            continue
    return normalize_text(file_bytes.decode("utf-8", errors="ignore"))


def extract_text_from_upload(uploaded_file: object) -> tuple[str, str]:
    file_name = str(getattr(uploaded_file, "name", "uploaded-file")).strip()
    raw_bytes = getattr(uploaded_file, "getvalue")()
    lowered_name = file_name.lower()

    if lowered_name.endswith(".pdf"):
        return extract_text_from_pdf(raw_bytes), file_name
    if lowered_name.endswith(".docx"):
        return extract_text_from_docx(raw_bytes), file_name
    if lowered_name.endswith(".txt"):
        return extract_text_from_txt(raw_bytes), file_name

    raise ValueError(f"Unsupported file type for {file_name}.")


def combine_material_chunks(chunks: Iterable[str]) -> str:
    return normalize_text("\n\n".join(chunk for chunk in chunks if chunk and chunk.strip()))
