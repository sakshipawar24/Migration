import re
from pathlib import Path

BASE_DIR = Path("Synapse 01 (Self-Serve).SemanticModel/definition/tables")

DUMMY_SERVER = "dummy_server"
DUMMY_DATABASE = "dummy_database"
DUMMY_SCHEMA = "dummy_schema"
DUMMY_TABLE = "dummy_table"



# Replace Sql.Database("server","database"
SQL_DB_PATTERN = re.compile(
    r'Sql\.Database\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"',
    re.IGNORECASE
)

# Replace schema.table inside SQL text
SCHEMA_TABLE_PATTERN = re.compile(
    r'\b([a-zA-Z_][\w]*)\.([a-zA-Z_][\w]*)\b'
)


# Updataion

def Update_tmdl(file_path: Path):
    original_text = file_path.read_text(encoding="utf-8", errors="ignore")
    Updated_text = original_text

    # Replace server & database
    Updated_text = SQL_DB_PATTERN.sub(
        f'Sql.Database("{DUMMY_SERVER}", "{DUMMY_DATABASE}"',
        Updated_text
    )

    # Replace schema.table ONLY inside Query=""
    def replace_schema_table(match):
        return f"{DUMMY_SCHEMA}.{DUMMY_TABLE}"

    Updated_text = re.sub(
        r'(Query\s*=\s*".*?")',
        lambda m: SCHEMA_TABLE_PATTERN.sub(replace_schema_table, m.group(1)),
        Updated_text,
        flags=re.DOTALL
    )

    # Write back only if changed
    if Updated_text != original_text:
        file_path.write_text(Updated_text, encoding="utf-8")
        print(f"Updated: {file_path.name}")
    else:
        print(f"No changes needed: {file_path.name}")

# ==================
# RUN
# ==================

if not BASE_DIR.exists():
    raise FileNotFoundError(f"Tables directory not found: {BASE_DIR}")

tmdl_files = list(BASE_DIR.glob("*.tmdl"))

if not tmdl_files:
    print("No .tmdl files found")
else:
    print(f"Sanitizing {len(tmdl_files)} table files...\n")

    for tmdl in tmdl_files:
        Update_tmdl(tmdl)

    print("\nPBIP UPDATION COMPLETE")
