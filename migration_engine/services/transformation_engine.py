from typing import Dict, Any, List

from migration_engine.connectors.registry import ConnectorRegistry
from migration_engine.models import TransformationRequest, TransformationResult
from migration_engine.parser.m_query_parser import detect_connector_type, parse_source_step
from migration_engine.services.validation import pre_validate_request, post_validate_result


class TransformationEngine:
    def __init__(self):
        self.registry = ConnectorRegistry()

    def transform_query(self, request: TransformationRequest) -> TransformationResult:
        pre = pre_validate_request({
            "source_type": request.source_type,
            "target_type": request.target_type,
            "mapping": request.mapping,
        })
        if not pre["valid"]:
            return TransformationResult(
                success=False,
                source_type=request.source_type,
                target_type=request.target_type,
                transformed_query="",
                warnings=pre["warnings"],
                errors=pre["errors"],
            )

        connector = self.registry.get(request.target_type)
        transformed_query = connector.generate_m_query(request.mapping)

        post = post_validate_result({"transformed_query": transformed_query})
        return TransformationResult(
            success=post["valid"],
            source_type=request.source_type,
            target_type=request.target_type,
            transformed_query=transformed_query,
            warnings=pre["warnings"] + post["warnings"],
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
            transformed.append(next_row)
        return transformed
