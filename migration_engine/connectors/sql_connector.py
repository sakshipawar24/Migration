import re
from typing import Dict, Any
from .base import BaseConnector


class SQLConnector(BaseConnector):
    connector_type = "SQLServer"

    def extract_metadata(self, query: str) -> Dict[str, Any]:
        sql_quoted = re.search(r"Sql\.Database\s*\(\s*\"([^\"]+)\"\s*,\s*\"([^\"]+)\"", query or "", re.IGNORECASE)
        if sql_quoted:
            return {
                "connector_type": self.connector_type,
                "server": sql_quoted.group(1),
                "database": sql_quoted.group(2),
            }
        return {"connector_type": self.connector_type, "server": "", "database": ""}

    def transform_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "server": str(config.get("server") or config.get("workspace") or "dummy_server"),
            "database": str(config.get("database") or "dummy_database"),
        }

    def generate_m_query(self, config: Dict[str, Any]) -> str:
        normalized = self.transform_connection(config)
        server = normalized["server"].replace('"', '\\"')
        database = normalized["database"].replace('"', '\\"')
        return (
            "let\n"
            f"    Source = Sql.Database(\"{server}\", \"{database}\")\n"
            "in\n"
            "    Source"
        )
