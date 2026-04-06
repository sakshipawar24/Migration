import json
import sys
from pathlib import Path

CONNECTORS = [
    ("Sql.Database", "SQL Server"),
    ("Lakehouse.Contents", "Fabric Lakehouse"),
    ("Databricks.", "Databricks"),
    ("Oracle.Database", "Oracle"),
    ("PostgreSQL.Database", "PostgreSQL"),
    ("MySql.Database", "MySQL"),
    ("Odbc.DataSource", "ODBC"),
    ("Web.Contents", "Web"),
    ("AzureStorage.", "Azure Storage"),
    ("Excel.Workbook", "Excel"),
    ("Csv.Document", "CSV"),
]


def resolve_model_paths(pbip_path: Path):
    candidates = [pbip_path / "Model", pbip_path / "definition", pbip_path]
    for candidate in candidates:
        database_file = candidate / "database.tmdl"
        model_file = candidate / "model.tmdl"
        tables_dir = candidate / "tables"
        if database_file.exists() or model_file.exists() or tables_dir.exists():
            return {
                "database_file": database_file if database_file.exists() else None,
                "model_file": model_file if model_file.exists() else None,
                "tables_dir": tables_dir if tables_dir.exists() else None,
            }
    raise FileNotFoundError(f"Unable to locate PBIP model folder for path: {pbip_path}")


def read_text(file_path: Path):
    if not file_path or not file_path.exists():
        return ""
    return file_path.read_text(encoding="utf-8", errors="ignore")


def match_key_value(content: str, key: str) -> str:
    import re
    pattern = re.compile(rf"{key}\s*[:=]\s*[\"']?([^\"'\r\n]+)[\"']?", re.IGNORECASE)
    match = pattern.search(content)
    return match.group(1).strip() if match else ""


def parse_model_name(content: str) -> str:
    import re
    match = re.search(r"^model\s+([^\r\n]+)", content, re.IGNORECASE | re.MULTILINE)
    if not match:
        return ""
    return match.group(1).strip().strip("\"")


def extract_m_query(content: str) -> str:
    lines = content.splitlines()
    capture = False
    buffer = []
    for line in lines:
        trimmed = line.strip()
        lower = trimmed.lower()
        if not capture and lower.startswith("source"):
            import re
            match = re.match(r"^source\s*=\s*(.*)$", trimmed, re.IGNORECASE)
            if match:
                capture = True
                inline_expression = (match.group(1) or "").strip()
                if inline_expression:
                    buffer.append(inline_expression)
                continue
        if lower == "source =":
            capture = True
            continue
        if capture:
            if lower.startswith("annotation"):
                break
            buffer.append(line)
    return "\n".join(buffer).strip()


def detect_connector(m_query: str):
    if not m_query:
        return "Unknown", ""
    for key, source in CONNECTORS:
        if key in m_query:
            return source, key
    return "Unknown", ""


def extract_connection_details(m_query: str):
    import re
    if not m_query:
        return "", ""
    sql_match = re.search(r'Sql\.Database\s*\(\s*\"([^\"]+)\"\s*,\s*\"([^\"]+)\"', m_query, re.IGNORECASE)
    if sql_match:
        return sql_match.group(1), sql_match.group(2)

    sql_param_match = re.search(r'Sql\.Database\s*\(\s*([^,\)\r\n]+)\s*,\s*([^,\)\r\n]+)', m_query, re.IGNORECASE)
    if sql_param_match:
        return normalize_sql_arg(sql_param_match.group(1)), normalize_sql_arg(sql_param_match.group(2))

    lakehouse_match = re.search(r'WorkspaceId\s*=\s*\"([^\"]+)\"[\s\S]*?LakehouseId\s*=\s*\"([^\"]+)\"', m_query, re.IGNORECASE)
    if lakehouse_match:
        return lakehouse_match.group(1), lakehouse_match.group(2)

    return "", ""


def normalize_sql_arg(value: str) -> str:
    token = (value or "").strip()
    if not token:
        return ""

    import re
    hash_quoted = re.match(r'^#"([^"]+)"$', token)
    if hash_quoted:
        return hash_quoted.group(1).strip()

    quoted = re.match(r'^["\'](.+)["\']$', token)
    if quoted:
        return quoted.group(1).strip()

    return token


def parse_storage_mode(content: str) -> str:
    if "mode: directquery" in content.lower():
        return "DirectQuery"
    if "mode: import" in content.lower():
        return "Import"
    return "Unknown"


def parse_table_name(content: str, fallback: str) -> str:
    import re
    match = re.search(r"^table\s+([^\r\n]+)", content, re.IGNORECASE | re.MULTILINE)
    if not match:
        return fallback
    return match.group(1).strip().strip("'")


def collect_metadata(pbip_path: Path):
    paths = resolve_model_paths(pbip_path)
    database_content = read_text(paths["database_file"]) if paths.get("database_file") else ""
    model_content = read_text(paths["model_file"]) if paths.get("model_file") else ""

    database_meta = {
        "server": match_key_value(database_content, "server"),
        "database": match_key_value(database_content, "database"),
        "protocol": match_key_value(database_content, "protocol"),
        "provider": match_key_value(database_content, "provider"),
        "connectionType": match_key_value(database_content, "connectionType"),
        "dataSourceType": match_key_value(database_content, "dataSourceType"),
    }

    tables = []
    tables_dir = paths.get("tables_dir")
    if tables_dir and tables_dir.exists():
        for tmdl_file in tables_dir.glob("*.tmdl"):
            content = read_text(tmdl_file)
            table_name = parse_table_name(content, tmdl_file.stem)
            mode = parse_storage_mode(content)
            m_query = extract_m_query(content)
            source, connection_type = detect_connector(m_query)
            server, database = extract_connection_details(m_query)

            tables.append({
                "name": table_name,
                "mode": mode,
                "source": source,
                "connectionType": connection_type,
                "server": server or database_meta.get("server", ""),
                "database": database or database_meta.get("database", ""),
                "mQuery": m_query,
            })

    return {
        "modelName": parse_model_name(model_content),
        "protocol": database_meta.get("protocol", ""),
        "provider": database_meta.get("provider", ""),
        "dataSourceType": database_meta.get("dataSourceType", ""),
        "connectionType": database_meta.get("connectionType", ""),
        "server": database_meta.get("server", ""),
        "database": database_meta.get("database", ""),
        "tables": tables,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("Usage: python extract_metadata.py <pbip_path>")

    pbip_path = Path(sys.argv[1])
    metadata = collect_metadata(pbip_path)
    print(json.dumps(metadata))
