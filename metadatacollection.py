import csv
from pathlib import Path
import json
import os

# =============================
# BASE PATHS
# =============================
BASE = Path("Synapse 01 (Self-Serve).SemanticModel/definition")
OUTPUT_CSV = "pbip_master_metadata.csv"

# ===== TARGET UPDATED =====
TARGET_SOURCE = "Microsoft Fabric"
TARGET_CONNECTION = "Fabric Lakehouse"


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


rows = []

tables_dir = BASE / "tables"
print("Scanning tables folder")

if not tables_dir.exists():
    raise FileNotFoundError(f"Tables directory not found {tables_dir}")

for tmdl in tables_dir.glob("*.tmdl"):
    table_name = tmdl.stem
    text = tmdl.read_text(encoding="utf-8", errors="ignore")

    storage_mode = "DirectQuery" if "mode: directquery" in text.lower() else "Import"
    m_query = extract_m_block_from_partition(text)

    before_source, before_conn = find_connections(m_query)

    rows.append({
        "Type": "Table",
        "Name": table_name,
        "Before": storage_mode,
        "After": storage_mode,
        "Before_Source": before_source,
        "Before_Conn": before_conn,
        "After_Source": TARGET_SOURCE,
        "After_Conn": TARGET_CONNECTION,
        "Notes": "Partition source",
        "File_Name": f"tables/{tmdl.name}",
        "Connection_Type": before_conn if before_conn != "NA" else "Lakehouse.Contents",
        "Server": "dummy_server",
        "Database_Name": "dummy_database",
        "Connection_String": "dummy_connection",
        "M_Query_Preview": m_query[:200]
    })

print(f"Tables processed {len(rows)}")

if rows:
    with open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"CSV written {OUTPUT_CSV}")
else:
    print("No table metadata found CSV not written")

