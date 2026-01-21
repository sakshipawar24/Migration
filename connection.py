import json
from pathlib import Path

PBISM_FILE = Path(
    r"C:\Users\hp\Documents\Internship\Final\Synapse 01 (Self-Serve).SemanticModel\defination.pbism"
)

def extract_from_pbism():
    with open(PBISM_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    tables = data.get("model", {}).get("tables", [])

    for table in tables:
        table_name = table.get("name")
        print("\n" + "="*80)
        print(f"TABLE : {table_name}")

        partitions = table.get("partitions", [])
        if not partitions:
            print("No partitions (calculated / empty table)")
            continue

        for part in partitions:
            print(f"\nPartition Name : {part.get('name')}")
            print(f"Mode           : {part.get('mode')}")

            source = part.get("source", {})
            expression = source.get("expression")

            if expression:
                print("\n--- QUERY ---")
                print("\n".join(expression))
            else:
                print("No query found")
