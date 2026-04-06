from typing import Dict, Any
from .base import BaseConnector


class GenericConnector(BaseConnector):
    connector_type = "Generic"

    def extract_metadata(self, query: str) -> Dict[str, Any]:
        return {"connector_type": self.connector_type, "query": query or ""}

    def transform_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        return config or {}

    def generate_m_query(self, config: Dict[str, Any]) -> str:
        # Generic fallback keeps transformation explicit while avoiding source query leakage.
        return (
            "let\n"
            "    Source = \"Connector transformation not yet implemented for this type.\"\n"
            "in\n"
            "    Source"
        )
