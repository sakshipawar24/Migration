from typing import Dict
from .base import BaseConnector
from .sql_connector import SQLConnector
from .fabric_lakehouse_connector import FabricLakehouseConnector
from .generic_connector import GenericConnector


class ConnectorRegistry:
    def __init__(self):
        self._generic = GenericConnector()
        self._connectors: Dict[str, BaseConnector] = {
            "SQLServer": SQLConnector(),
            "AzureSQL": SQLConnector(),
            "Synapse": SQLConnector(),
            "FabricLakehouse": FabricLakehouseConnector(),
            "AzureDataLake": self._generic,
            "Databricks": self._generic,
            "Snowflake": self._generic,
            "PostgreSQL": self._generic,
            "MySQL": self._generic,
            "Excel": self._generic,
            "CSV": self._generic,
            "Parquet": self._generic,
            "JSON": self._generic,
            "SharePoint": self._generic,
            "OneDrive": self._generic,
            "OData": self._generic,
            "REST": self._generic,
        }

    def get(self, connector_type: str) -> BaseConnector:
        return self._connectors.get(connector_type, self._generic)

    def supported_types(self):
        return sorted(self._connectors.keys())
