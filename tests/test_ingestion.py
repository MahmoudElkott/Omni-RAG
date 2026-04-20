from __future__ import annotations

from src.ingestion.files import combine_material_chunks, extract_text_from_txt, normalize_text


def test_normalize_text_cleans_spacing() -> None:
    raw = "Hello   world\n\n\nThis\tis\ta test"
    cleaned = normalize_text(raw)
    assert "  " not in cleaned
    assert "\n\n\n" not in cleaned


def test_extract_text_from_txt_utf8() -> None:
    data = "مرحبا بالعالم".encode("utf-8")
    text = extract_text_from_txt(data)
    assert "مرحبا" in text


def test_combine_material_chunks() -> None:
    combined = combine_material_chunks(["Part one", "", "Part two"])
    assert "Part one" in combined
    assert "Part two" in combined
