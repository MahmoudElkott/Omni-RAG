from __future__ import annotations

from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, MutableMapping

BASE_STATE: dict[str, Any] = {
    "source_material": "",
    "source_notes": [],
    "generated_payload": None,
    "generated_mode": "",
    "mcq_results": {},
    "flashcard_mastered": [],
    "failed_items": [],
    "history": [],
    "xp": 0,
    "streak": 0,
    "correct_answers": 0,
    "incorrect_answers": 0,
    "attempts_by_mode": {"mcq": 0, "flashcard": 0},
    "pomodoro": {
        "running": False,
        "duration_minutes": 25,
        "end_timestamp": 0.0,
        "paused_remaining": 0.0,
        "completed_sessions": 0,
    },
}


def init_state(state: MutableMapping[str, Any]) -> None:
    for key, value in BASE_STATE.items():
        if key not in state:
            state[key] = deepcopy(value)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def add_failed_item(state: MutableMapping[str, Any], item: dict[str, Any]) -> None:
    failed_items = state["failed_items"]
    item_key = f"{item.get('type', 'item')}::{item.get('id', '')}"
    for existing in failed_items:
        existing_key = f"{existing.get('type', 'item')}::{existing.get('id', '')}"
        if existing_key == item_key:
            return
    failed_items.append(item)


def remove_failed_item(state: MutableMapping[str, Any], item_type: str, item_id: str) -> None:
    state["failed_items"] = [
        item
        for item in state["failed_items"]
        if not (str(item.get("type")) == str(item_type) and str(item.get("id")) == str(item_id))
    ]


def record_attempt(
    state: MutableMapping[str, Any],
    *,
    mode: str,
    item_id: str,
    prompt: str,
    correct: bool,
    detail: str = "",
) -> int:
    attempts_by_mode = state["attempts_by_mode"]
    attempts_by_mode[mode] = attempts_by_mode.get(mode, 0) + 1

    xp_delta = 0
    if correct:
        state["correct_answers"] += 1
        state["streak"] += 1
        xp_delta = 10
        if state["streak"] % 5 == 0:
            xp_delta += 5
        state["xp"] += xp_delta
    else:
        state["incorrect_answers"] += 1
        state["streak"] = 0
        xp_delta = -2
        state["xp"] = max(0, state["xp"] + xp_delta)

    state["history"].append(
        {
            "time": _now_iso(),
            "mode": mode,
            "item_id": item_id,
            "prompt": prompt,
            "correct": correct,
            "xp_delta": xp_delta,
            "detail": detail,
        }
    )

    # Keep memory footprint bounded.
    if len(state["history"]) > 250:
        state["history"] = state["history"][-250:]

    return xp_delta


def mark_flashcard_mastered(state: MutableMapping[str, Any], card_id: str) -> bool:
    mastered = set(state.get("flashcard_mastered", []))
    if card_id in mastered:
        return False
    mastered.add(card_id)
    state["flashcard_mastered"] = sorted(mastered)
    return True


def progress_snapshot(state: MutableMapping[str, Any]) -> dict[str, Any]:
    total_attempts = state["correct_answers"] + state["incorrect_answers"]
    accuracy = (state["correct_answers"] / total_attempts * 100.0) if total_attempts else 0.0

    return {
        "xp": int(state["xp"]),
        "streak": int(state["streak"]),
        "correct_answers": int(state["correct_answers"]),
        "incorrect_answers": int(state["incorrect_answers"]),
        "failed_queue": len(state["failed_items"]),
        "accuracy": round(accuracy, 2),
        "attempts_by_mode": dict(state["attempts_by_mode"]),
        "pomodoro_sessions": int(state["pomodoro"].get("completed_sessions", 0)),
    }
