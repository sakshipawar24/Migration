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


def parse_source_step(query: str) -> Dict[str, Any]:
    """Parse first source invocation in M query into structured parts."""
    text = query or ""
    invocation = re.search(r"([A-Za-z0-9_.]+)\s*\((.*)\)", text, re.IGNORECASE | re.DOTALL)
    if not invocation:
        return {
            "connector_type": detect_connector_type(text),
            "function": "",
            "arguments": [],
            "raw": text,
        }

    function_name = invocation.group(1)
    args = _split_top_level_arguments(invocation.group(2))
    return {
        "connector_type": detect_connector_type(text),
        "function": function_name,
        "arguments": args,
        "raw": text,
    }


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
