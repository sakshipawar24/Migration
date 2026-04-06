import re
from typing import Dict, Any
from .base import BaseConnector


class FabricLakehouseConnector(BaseConnector):
    connector_type = "FabricLakehouse"

    def extract_metadata(self, query: str) -> Dict[str, Any]:
        lakehouse = re.search(
            r"WorkspaceId\s*=\s*\"([^\"]+)\"[\s\S]*?LakehouseId\s*=\s*\"([^\"]+)\"",
            query or "",
            re.IGNORECASE,
        )
        if lakehouse:
            return {
                "connector_type": self.connector_type,
                "workspace_id": lakehouse.group(1),
                "lakehouse_id": lakehouse.group(2),
            }
        return {"connector_type": self.connector_type, "workspace_id": "", "lakehouse_id": ""}

    def transform_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "workspace_id": str(config.get("workspace_id") or config.get("server") or "dummy_workspace_id"),
            "lakehouse_id": str(config.get("lakehouse_id") or config.get("database") or "dummy_lakehouse_id"),
        }

    def generate_m_query(self, config: Dict[str, Any]) -> str:
        normalized = self.transform_connection(config)
        workspace_id = normalized["workspace_id"].replace('"', '\\"')
        lakehouse_id = normalized["lakehouse_id"].replace('"', '\\"')
        return (
            "let\n"
            f"    Source = Lakehouse.Contents([WorkspaceId=\"{workspace_id}\", LakehouseId=\"{lakehouse_id}\"])\n"
            "in\n"
            "    Source"
        )
