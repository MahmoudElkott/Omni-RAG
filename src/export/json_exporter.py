from __future__ import annotations

import json
from datetime import datetime
from typing import Any


def build_export_payload(mode: str, generated_payload: dict[str, Any], extra: dict[str, Any] | None = None) -> dict[str, Any]:
    payload = {
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "mode": mode,
        "payload": generated_payload,
    }
    if extra:
        payload["extra"] = extra
    return payload


def to_json_bytes(data: dict[str, Any]) -> bytes:
    return json.dumps(data, ensure_ascii=False, indent=2).encode("utf-8")
