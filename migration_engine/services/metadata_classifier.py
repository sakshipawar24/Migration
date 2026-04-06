from typing import Dict, Any, List
from migration_engine.parser.m_query_parser import detect_connector_type


def classify_rows(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    classified = []
    connector_counts: Dict[str, int] = {}

    for row in rows or []:
        name = row.get("name") or row.get("table") or row.get("tableName") or "Unknown"
        query = row.get("mQuery") or row.get("M_Query_Preview") or row.get("query") or ""
        connector = detect_connector_type(query)
        connector_counts[connector] = connector_counts.get(connector, 0) + 1
        classified.append({
            "name": name,
            "connector_type": connector,
        })

    return {
        "tables": classified,
        "summary": {
            "total_tables": len(classified),
            "connectors": connector_counts,
            "is_multi_source": len([k for k, v in connector_counts.items() if v > 0 and k != "Unknown"]) > 1,
        },
    }
