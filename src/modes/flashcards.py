from __future__ import annotations

from typing import Any


def normalize_flashcard_payload(payload: dict[str, Any]) -> dict[str, Any]:
    cards = payload.get("content", {}).get("cards", [])
    for idx, card in enumerate(cards, start=1):
        card.setdefault("id", f"card-{idx}")
    return payload


def to_failed_flashcard_item(card: dict[str, Any]) -> dict[str, Any]:
    return {
        "type": "flashcard",
        "id": str(card.get("id")),
        "front": card.get("front", ""),
        "back": card.get("back", ""),
        "hint": card.get("hint", ""),
    }
