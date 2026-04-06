from typing import Dict, Any, List
from datetime import datetime


def run_batch(items: List[Dict[str, Any]], operation):
    results = []
    for item in items or []:
        name = item.get("name") or item.get("reportName") or "Unknown"
        try:
            payload = operation(item)
            results.append({
                "name": name,
                "status": "success",
                "result": payload,
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })
        except Exception as exc:
            results.append({
                "name": name,
                "status": "failed",
                "error": str(exc),
                "timestamp": datetime.utcnow().isoformat() + "Z",
            })

    summary = {
        "total": len(results),
        "success": len([r for r in results if r["status"] == "success"]),
        "failed": len([r for r in results if r["status"] == "failed"]),
    }
    return {"summary": summary, "items": results}
