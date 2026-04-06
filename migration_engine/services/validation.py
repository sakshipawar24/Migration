from typing import Dict, Any, List


SUPPORTED_TARGETS = {
    "SQLServer", "AzureSQL", "Synapse", "FabricLakehouse", "AzureDataLake", "Databricks",
    "Snowflake", "PostgreSQL", "MySQL", "Excel", "CSV", "Parquet", "JSON", "SharePoint", "OneDrive", "OData", "REST"
}


def pre_validate_request(payload: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []

    source_type = payload.get("source_type")
    target_type = payload.get("target_type")
    mapping = payload.get("mapping") or {}

    if not source_type:
        errors.append("source_type is required")
    if not target_type:
        errors.append("target_type is required")
    if target_type and target_type not in SUPPORTED_TARGETS:
        errors.append(f"Unsupported target_type: {target_type}")

    if target_type in {"SQLServer", "AzureSQL", "Synapse"}:
        if not mapping.get("server"):
            warnings.append("server not provided; default value will be used")
        if not mapping.get("database"):
            warnings.append("database not provided; default value will be used")

    if target_type == "FabricLakehouse":
        if not (mapping.get("workspace_id") or mapping.get("server")):
            warnings.append("workspace_id not provided; default value will be used")
        if not (mapping.get("lakehouse_id") or mapping.get("database")):
            warnings.append("lakehouse_id not provided; default value will be used")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }


def post_validate_result(result: Dict[str, Any]) -> Dict[str, Any]:
    errors: List[str] = []
    warnings: List[str] = []

    query = result.get("transformed_query") or ""
    if not query.strip():
        errors.append("transformed query is empty")

    if "not yet implemented" in query.lower():
        warnings.append("target connector generation is currently generic fallback")

    return {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings,
    }
