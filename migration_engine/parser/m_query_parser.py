import re
from typing import Dict, Any, List


CONNECTOR_PATTERNS = [
    ("SQLServer", r"Sql\.Database\s*\("),
    ("AzureDataLake", r"AzureStorage\.DataLake\s*\("),
    ("SharePoint", r"SharePoint\.Files\s*\("),
    ("OData", r"OData\.Feed\s*\("),
    ("Databricks", r"Databricks\.Contents\s*\("),
    ("FabricLakehouse", r"Lakehouse\.Contents\s*\("),
    ("PostgreSQL", r"PostgreSQL\.Database\s*\("),
    ("MySQL", r"MySql\.Database\s*\("),
    ("Snowflake", r"Snowflake\.Databases\s*\("),
    ("Excel", r"Excel\.Workbook\s*\("),
    ("CSV", r"Csv\.Document\s*\("),
    ("JSON", r"Json\.Document\s*\("),
    ("Parquet", r"Parquet\.Document\s*\("),
    ("REST", r"Web\.Contents\s*\(")
]


def detect_connector_type(query: str) -> str:
    text = query or ""
    for connector_type, pattern in CONNECTOR_PATTERNS:
        if re.search(pattern, text, re.IGNORECASE):
            return connector_type
    return "Unknown"


def parse_connector_metadata(query: str) -> Dict[str, Any]:
    """Extract connector-specific metadata from a query using structured parsing."""
    source = parse_source_step(query)
    connector_type = source.get("connector_type", "Unknown")
    args = source.get("arguments", [])

    if connector_type in {"SQLServer", "AzureSQL", "Synapse"}:
        return {
            "connector_type": connector_type,
            "server": _parse_m_value(args[0]) if len(args) > 0 else "",
            "database": _parse_m_value(args[1]) if len(args) > 1 else "",
        }

    if connector_type == "FabricLakehouse":
        record = _parse_record(args[0]) if len(args) > 0 else {}
        return {
            "connector_type": connector_type,
            "workspace_id": _parse_m_value(record.get("WorkspaceId", "")),
            "lakehouse_id": _parse_m_value(record.get("LakehouseId", "")),
        }

    if connector_type == "Excel":
        return {
            "connector_type": connector_type,
            "path": _parse_m_value(args[0]) if len(args) > 0 else "",
        }

    if connector_type == "SharePoint":
        return {
            "connector_type": connector_type,
            "site_url": _parse_m_value(args[0]) if len(args) > 0 else "",
        }

    if connector_type == "OData":
        return {
            "connector_type": connector_type,
            "feed_url": _parse_m_value(args[0]) if len(args) > 0 else "",
        }

    return {
        "connector_type": connector_type,
        "arguments": args,
    }


def parse_source_step(query: str) -> Dict[str, Any]:
    """Parse first source invocation in M query into structured parts."""
    text = query or ""
    source_expr = _extract_source_expression(text)
    invocation = re.search(r"([A-Za-z0-9_.]+)\s*\((.*)\)\s*$", source_expr, re.IGNORECASE | re.DOTALL)
    if not invocation:
        return {
            "connector_type": detect_connector_type(text),
            "function": "",
            "arguments": [],
            "raw": source_expr,
        }

    function_name = invocation.group(1)
    args = _split_top_level_arguments(invocation.group(2))
    return {
        "connector_type": detect_connector_type(text),
        "function": function_name,
        "arguments": args,
        "raw": source_expr,
    }


def _extract_source_expression(query: str) -> str:
    text = query or ""
    source_match = re.search(
        r"Source\s*=\s*(.*?)(?:,\s*[A-Za-z_][A-Za-z0-9_\s]*=|\s+in\b)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if source_match:
        return source_match.group(1).strip()
    return text.strip()


def _split_top_level_arguments(text: str) -> List[str]:
    args = []
    current = []
    depth = 0
    in_string = False
    quote = ""

    for ch in text:
        if in_string:
            current.append(ch)
            if ch == quote:
                in_string = False
            continue

        if ch in ('"', "'"):
            in_string = True
            quote = ch
            current.append(ch)
            continue

        if ch == '(':
            depth += 1
            current.append(ch)
            continue

        if ch == ')':
            depth = max(depth - 1, 0)
            current.append(ch)
            continue

        if ch == ',' and depth == 0:
            token = ''.join(current).strip()
            if token:
                args.append(token)
            current = []
            continue

        current.append(ch)

    token = ''.join(current).strip()
    if token:
        args.append(token)
    return args


def _parse_m_value(value: str) -> str:
    token = str(value or "").strip()
    if not token:
        return ""

    quoted = re.match(r'^["\'](.+)["\']$', token)
    if quoted:
        return quoted.group(1)

    hash_quoted = re.match(r'^#"(.+)"$', token)
    if hash_quoted:
        return hash_quoted.group(1)

    return token


def _parse_record(value: str) -> Dict[str, str]:
    token = str(value or "").strip()
    if not token.startswith('[') or not token.endswith(']'):
        return {}

    body = token[1:-1].strip()
    if not body:
        return {}

    result: Dict[str, str] = {}
    for part in _split_top_level_arguments(body):
        if '=' not in part:
            continue
        key, raw_value = part.split('=', 1)
        result[key.strip()] = raw_value.strip()
    return result
