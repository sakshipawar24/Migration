from abc import ABC, abstractmethod
from typing import Dict, Any


class BaseConnector(ABC):
    connector_type = "Unknown"

    @abstractmethod
    def extract_metadata(self, query: str) -> Dict[str, Any]:
        """Extract connector-specific metadata from M query."""

    @abstractmethod
    def transform_connection(self, config: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and validate target config for this connector."""

    @abstractmethod
    def generate_m_query(self, config: Dict[str, Any]) -> str:
        """Generate M query for the target connector config."""
