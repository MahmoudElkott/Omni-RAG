from __future__ import annotations

import contextlib

import requests
from bs4 import BeautifulSoup

from .files import normalize_text

DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def _clean_html_to_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")

    for tag in soup(["script", "style", "noscript", "svg", "header", "footer", "nav", "aside", "form"]):
        tag.decompose()

    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    body = soup.get_text("\n", strip=True)
    body = normalize_text(body)

    if title:
        return normalize_text(f"{title}\n\n{body}")
    return body


def _extract_with_playwright(url: str, timeout_ms: int = 15000) -> str:
    from playwright.sync_api import sync_playwright

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="networkidle", timeout=timeout_ms)
        html = page.content()
        browser.close()
    return _clean_html_to_text(html)


def extract_text_from_url(url: str, allow_js_fallback: bool = True, timeout_seconds: int = 15) -> tuple[str, list[str]]:
    notes: list[str] = []

    try:
        response = requests.get(
            url,
            timeout=timeout_seconds,
            headers={"User-Agent": DEFAULT_USER_AGENT},
        )
        response.raise_for_status()
    except Exception as exc:  # noqa: BLE001
        raise ValueError(f"URL fetch failed: {exc}") from exc

    static_text = _clean_html_to_text(response.text)
    if len(static_text) >= 800 or not allow_js_fallback:
        notes.append("Static extraction completed.")
        return static_text, notes

    with contextlib.suppress(Exception):
        rendered_text = _extract_with_playwright(url)
        if len(rendered_text) > len(static_text):
            notes.append("Used JavaScript-rendered extraction fallback.")
            return rendered_text, notes

    notes.append("JavaScript fallback unavailable; using static extraction.")
    return static_text, notes
