import csv
from pathlib import Path
import json
import os
import sys


def extract_m_block_from_partition(text):
    """
    Extract full M query from source block
    """
    lines = text.splitlines()
    capture = False
    buffer = []

    for line in lines:
        stripped = line.strip().lower()

        if stripped == "source =":
            capture = True
            continue

        if capture:
            if stripped.startswith("annotation"):
                break
            buffer.append(line)

    return "\n".join(buffer).strip()


def find_connections(m_query):
    connectors = {
        "Sql.Database": "SQL Server",
        "Web.Contents": "Web",
        "Odbc.DataSource": "ODBC",
        "Oracle.Database": "Oracle",
        "PostgreSQL.Database": "PostgreSQL",
        "MySql.Database": "MySQL",
        "Databricks.": "Databricks",
        "Lakehouse.Contents": "Fabric Lakehouse",
        "AzureStorage.": "Azure Storage",
        "Excel.Workbook": "Excel",
        "Csv.Document": "CSV",
    }

    for key, value in connectors.items():
        if key in m_query:
            return value, key

    return "No explicit connector", "NA"


def extract_connection_details(m_query):
    """
    Extract actual server and database from M Query
    """
    import re
    
    server = None
    database = None
    
    # Pattern for Sql.Database("server", "database"
    sql_pattern = r'Sql\.Database\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"'
    match = re.search(sql_pattern, m_query)
    if match:
        server = match.group(1)
        database = match.group(2)
        return server, database
    
    # Pattern for Lakehouse.Contents with WorkspaceId and LakehouseId
    lakehouse_pattern = r'WorkspaceId\s*=\s*"([^"]+)".*?LakehouseId\s*=\s*"([^"]+)"'
    match = re.search(lakehouse_pattern, m_query, re.DOTALL)
    if match:
        server = match.group(1)  # workspace ID
        database = match.group(2)  # lakehouse ID
        return server, database
    
    return None, None


def collect_metadata(pbip_path, mode='before'):
    """
    Collect metadata from PBIP semantic model
    Args:
        pbip_path: Path to .SemanticModel folder
        mode: 'before' or 'after'
    """
    BASE = Path(pbip_path) / "definition"
    OUTPUT_CSV = f"pbip_{mode}_metadata.csv"

    # ===== TARGET UPDATED =====
    TARGET_SOURCE = "Microsoft Fabric"
    TARGET_CONNECTION = "Fabric Lakehouse"

    rows = []
    tables_dir = BASE / "tables"
    print(f"Scanning tables folder: {tables_dir}")
    print(f"PBIP Path: {pbip_path}")
    print(f"Base Path: {BASE}")
    print(f"Tables Dir exists: {tables_dir.exists()}")
    
    # Debug: List what's in the path
    if Path(pbip_path).exists():
        print(f"Contents of {pbip_path}: {list(Path(pbip_path).iterdir())}")
    if BASE.exists():
        print(f"Contents of {BASE}: {list(BASE.iterdir())}")

    if not tables_dir.exists():
        raise FileNotFoundError(f"Tables directory not found: {tables_dir}. Base path: {BASE}")

    for tmdl in tables_dir.glob("*.tmdl"):
        table_name = tmdl.stem
        text = tmdl.read_text(encoding="utf-8", errors="ignore")

        storage_mode = "DirectQuery" if "mode: directquery" in text.lower() else "Import"
        m_query = extract_m_block_from_partition(text)

        # Extract actual connection details from M Query
        actual_server, actual_database = extract_connection_details(m_query)
        source, conn = find_connections(m_query)

        if mode == 'before':
            # Before mode - show original values from M Query
            before_server = actual_server if actual_server else "N/A"
            before_database = actual_database if actual_database else "N/A"
            after_server = "dummy_server"  # Will be filled by user
            after_database = "dummy_database"  # Will be filled by user
            after_source = "Pending"
            after_conn = "Pending"
        else:
            # After mode - show both original and updated values
            before_server = actual_server if actual_server else "N/A"
            before_database = actual_database if actual_database else "N/A"
            after_server = actual_server if actual_server else "fabric_server"
            after_database = actual_database if actual_database else "fabric_lakehouse"
            after_source = source
            after_conn = conn

        rows.append({
            "Type": "Table",
            "Name": table_name,
            "Before": storage_mode,
            "After": storage_mode,
            "Before_Source": source if mode == 'before' else "Original",
            "Before_Conn": conn if mode == 'before' else "Original",
            "After_Source": after_source if mode == 'after' else TARGET_SOURCE,
            "After_Conn": after_conn if mode == 'after' else TARGET_CONNECTION,
            "Notes": f"{mode.capitalize()} metadata collection",
            "File_Name": f"tables/{tmdl.name}",
            "Connection_Type": conn if conn != "NA" else "Lakehouse.Contents",
            "Server": before_server,
            "After_Server": after_server,
            "Database_Name": before_database,
            "After_Database": after_database,
            "Connection_String": "dummy_connection",
            "M_Query_Preview": m_query[:500]
        })

    print(f"Tables processed: {len(rows)}")

    if rows:
        with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        
        print(f"[OK] Metadata saved to {OUTPUT_CSV}")
        return OUTPUT_CSV
    else:
        print("[WARNING] No tables found")
        return None


if __name__ == "__main__":
    # Command line usage: python metadatacollection.py <pbip_path> <mode>
    if len(sys.argv) > 1:
        pbip_path = sys.argv[1]
        mode = sys.argv[2] if len(sys.argv) > 2 else 'before'
        collect_metadata(pbip_path, mode)
    else:
        # Default behavior for backward compatibility
        BASE = Path("Synapse 01 (Self-Serve).SemanticModel/definition")
        collect_metadata(str(BASE.parent), 'before')

