import json
import csv
import os

# ===== PATHS =====
BASE_DIR = r"C:\Users\hp\Documents\Internship\Final"
PBIR_PATH = os.path.join(BASE_DIR, "Synapse 01 (Self-Serve).Report", "definition.pbir")
CSV_PATH = os.path.join(BASE_DIR, "pbip_master_metadata.csv")

# ===== CHECK FILE =====
if not os.path.exists(PBIR_PATH):
    print("❌ definition.pbir not found")
    exit(0)

# ===== LOAD PBIR =====
with open(PBIR_PATH, "r", encoding="utf-8") as f:
    pbir = json.load(f)

dataset_path = (
    pbir
    .get("datasetReference", {})
    .get("byPath", {})
    .get("path", "")
)

# ===== ROW TO APPEND =====
row = {
    "Type": "Report",
    "Name": "Synapse 01 (Self-Serve)",
    "Before": "SemanticModel",
    "After": "SemanticModel",
    "Before_Source": "PBIP",
    "Before_Conn": "byPath",
    "After_Source": "PBIP",
    "After_Conn": "byPath",
    "Notes": "Report references semantic model",
    "File_Name": "definition.pbir",
    "Connection_Type": "Semantic Model Reference",
    "Server": "",
    "Database_Name": "",
    "Connection_String": "",
    "M_Query_Preview": dataset_path
}

#WRITE / APPEND CSV 
file_exists = os.path.exists(CSV_PATH)

with open(CSV_PATH, "a", newline="", encoding="utf-8") as csvfile:
    writer = csv.DictWriter(csvfile, fieldnames=row.keys())

    if not file_exists:
        writer.writeheader()

    writer.writerow(row)

print("definition.pbir extracted and merged into CSV")
