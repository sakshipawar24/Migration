from pathlib import Path
import re

# 🔹 Base folder where PBIP semantic model lives
BASE_PATH = Path(
    "Synapse 01 (Self-Serve).SemanticModel/definition/tables"
)

# 🔹 Dummy Fabric identifiers
FABRIC_WORKSPACE_ID = "dummy_workspace_id"
FABRIC_LAKEHOUSE_ID = "dummy_lakehouse_id"

def migrate_to_fabric(m_text: str) -> str:
    """
    Replace SQL Server / Databricks M queries with Fabric Lakehouse connector
    """

    if "Sql.Database" in m_text or "Databricks." in m_text:
        fabric_source = f'''
Source = Lakehouse.Contents(
    "https://api.fabric.microsoft.com",
    [
        WorkspaceId = "{FABRIC_WORKSPACE_ID}",
        LakehouseId = "{FABRIC_LAKEHOUSE_ID}"
    ]
)
'''
        return re.sub(
            r"Source\s*=\s*.*?in",
            fabric_source + "\n\nin",
            m_text,
            flags=re.DOTALL
        )

    return m_text


def process_tables():
    print(f"📂 Scanning tables in: {BASE_PATH.resolve()}")

    for tmdl in BASE_PATH.glob("*.tmdl"):
        original_text = tmdl.read_text(encoding="utf-8", errors="ignore")

        updated_text = migrate_to_fabric(original_text)

        if updated_text != original_text:
            tmdl.write_text(updated_text, encoding="utf-8")
            print(f"✅ Migrated: {tmdl.name}")
        else:
            print(f"⏭️ Skipped (no connector): {tmdl.name}")


if __name__ == "__main__":
    process_tables()
