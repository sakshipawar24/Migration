from typing import Dict, Any
from .base import BaseConnector
from migration_engine.parser.m_query_parser import parse_connector_metadata


class SQLConnector(BaseConnector):
    connector_type = "SQLServer"

    def extract_metadata(self, query: str) -> Dict[str, Any]:
        metadata = parse_connector_metadata(query or "")
        return {
            "connector_type": self.connector_type,
            "server": metadata.get("server", ""),
            "database": metadata.get("database", ""),
        }

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
