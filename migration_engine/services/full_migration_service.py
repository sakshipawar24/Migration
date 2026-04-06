from pathlib import Path
from typing import Dict, Any, List
import json

from migration_engine.services.metadata_classifier import classify_rows
from migration_engine.services.transformation_engine import TransformationEngine
from migration_engine.services.validation import pre_validate_request, post_validate_result


class FullMigrationService:
    """End-to-end migration service for metadata -> detect -> transform -> validate."""

    def __init__(self, transformation_engine: TransformationEngine):
        self.transformation_engine = transformation_engine

    def run_full_migration(self, file_path: str, target_config: Dict[str, Any]) -> Dict[str, Any]:
        rows = self._extract_rows(file_path)
        if not rows:
            return {
                "success": False,
                "error": "No metadata rows found for migration.",
                "steps": {
                    "extract": {"success": False, "count": 0},
                    "detect": {"success": False},
                    "transform": {"success": False},
                    "validate": {"success": False},
                },
            }

        source_type = target_config.get("source_type") or "Unknown"
        target_type = target_config.get("target_type") or ""
        mapping = target_config.get("mapping") or {}

        pre = pre_validate_request({
            "source_type": source_type,
            "target_type": target_type,
            "mapping": mapping,
        })
        if not pre.get("valid"):
            return {
                "success": False,
                "error": "Validation failed",
                "validation": pre,
            }

        detected = classify_rows(rows)
        transformed_rows = self.transformation_engine.transform_rows(rows, target_type, mapping)

        post_errors: List[str] = []
        post_warnings: List[str] = []
        for row in transformed_rows:
            check = post_validate_result({"transformed_query": row.get("mQuery", "")})
            post_errors.extend(check.get("errors", []))
            post_warnings.extend(check.get("warnings", []))

        return {
            "success": len(post_errors) == 0,
            "steps": {
                "extract": {"success": True, "count": len(rows)},
                "detect": {"success": True, "summary": detected.get("summary", {})},
                "transform": {"success": True, "count": len(transformed_rows)},
                "validate": {
                    "success": len(post_errors) == 0,
                    "warnings": list(dict.fromkeys(post_warnings)),
                    "errors": list(dict.fromkeys(post_errors)),
                },
            },
            "detected": detected,
            "transformed_rows": transformed_rows,
        }

    def _extract_rows(self, file_path: str) -> List[Dict[str, Any]]:
        if not file_path:
            return []

        path = Path(file_path)
        if not path.exists() or not path.is_file():
            return []

        payload = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(payload, list):
            return payload

        if isinstance(payload, dict):
            if isinstance(payload.get("after"), list) and payload.get("after"):
                return payload.get("after")
            if isinstance(payload.get("before"), list):
                return payload.get("before")
            if isinstance(payload.get("rows"), list):
                return payload.get("rows")

        return []
