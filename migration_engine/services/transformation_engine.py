from typing import Dict, Any, List
import re

from migration_engine.connectors.registry import ConnectorRegistry
from migration_engine.models import TransformationRequest, TransformationResult
from migration_engine.parser.m_query_parser import detect_connector_type, parse_source_step
from migration_engine.services.validation import pre_validate_request, post_validate_result


class TransformationEngine:
    def __init__(self):
        self.registry = ConnectorRegistry()

    def transform_query(self, request: TransformationRequest) -> TransformationResult:
        detected_source_type = detect_connector_type(request.query or "") if request.query else request.source_type
        source_type = detected_source_type or request.source_type or "Unknown"

        pre = pre_validate_request({
            "source_type": source_type,
            "target_type": request.target_type,
            "mapping": request.mapping,
        })
        if not pre["valid"]:
            return TransformationResult(
                success=False,
                source_type=source_type,
                target_type=request.target_type,
                transformed_query="",
                warnings=pre["warnings"],
                errors=pre["errors"],
            )

        connector = self.registry.get(request.target_type)
        source_expression = _get_source_expression_for_target(connector, request.mapping)
        transformed_query = _replace_source_expression(request.query, source_expression)
        if not transformed_query:
            transformed_query = connector.generate_m_query(request.mapping)

        warnings = list(pre["warnings"])
        if source_type == "SQLServer" and request.target_type in {"FabricLakehouse", "Synapse", "AzureSQL"}:
            warnings.append(f"Applied {source_type} to {request.target_type} transformation.")
        elif source_type not in {"Unknown", request.target_type}:
            warnings.append(f"Source connector {source_type} transformed to {request.target_type}.")

        post = post_validate_result({"transformed_query": transformed_query})
        return TransformationResult(
            success=post["valid"],
            source_type=source_type,
            target_type=request.target_type,
            transformed_query=transformed_query,
            warnings=warnings + post["warnings"],
            errors=post["errors"],
        )

    def detect_query_source(self, query: str) -> Dict[str, Any]:
        return {
            "connector_type": detect_connector_type(query or ""),
            "parsed": parse_source_step(query or ""),
        }

    def transform_rows(self, rows: List[Dict[str, Any]], target_type: str, mapping: Dict[str, Any]) -> List[Dict[str, Any]]:
        transformed = []
        for row in rows or []:
            query = row.get("mQuery") or row.get("M_Query_Preview") or row.get("query") or ""
            detected = detect_connector_type(query)
            req = TransformationRequest(
                source_type=detected,
                target_type=target_type,
                mapping=mapping,
                query=query,
            )
            result = self.transform_query(req)

            next_row = dict(row)
            next_row["sourceConnectorType"] = detected
            next_row["targetConnectorType"] = target_type
            next_row["mQuery"] = result.transformed_query
            next_row["M_Query_Preview"] = result.transformed_query
            if "query" in next_row:
                next_row["query"] = result.transformed_query
            next_row["transformationWarnings"] = result.warnings
            next_row["transformationErrors"] = result.errors
            next_row["detectedSourceType"] = result.source_type
            transformed.append(next_row)
        return transformed


def _get_source_expression_for_target(connector, mapping: Dict[str, Any]) -> str:
    generated = connector.generate_m_query(mapping)
    source_match = re.search(r"Source\s*=\s*(.*?)(?:\n\s*in\b)", generated, re.IGNORECASE | re.DOTALL)
    if source_match:
        return source_match.group(1).strip()
    return generated.strip()


def _replace_source_expression(query: str, replacement_source: str) -> str:
    text = query or ""
    if not text.strip() or not replacement_source:
        return ""

    source_line = re.search(
        r"(Source\s*=\s*)(.*?)(?=(,\s*[A-Za-z_][A-Za-z0-9_\s]*=|\s+in\b))",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if source_line:
        return text[:source_line.start(2)] + replacement_source + text[source_line.end(2):]

    return ""
