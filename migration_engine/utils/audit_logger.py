from datetime import datetime
import json
from pathlib import Path
from typing import Dict, Any


AUDIT_LOG_PATH = Path("migration_audit.log")


def write_audit_event(event_type: str, payload: Dict[str, Any]) -> None:
    event = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "event_type": event_type,
        "payload": payload or {},
    }
    with AUDIT_LOG_PATH.open("a", encoding="utf-8") as handle:
        handle.write(json.dumps(event) + "\n")


def read_audit_events(limit: int = 200):
    if not AUDIT_LOG_PATH.exists():
        return []

    lines = AUDIT_LOG_PATH.read_text(encoding="utf-8").splitlines()
    records = []
    for line in lines[-max(limit, 1):]:
        try:
            records.append(json.loads(line))
        except Exception:
            continue
    return records
