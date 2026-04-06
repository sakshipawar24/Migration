from typing import Dict
from .base import BaseConnector
from .sql_connector import SQLConnector
from .fabric_lakehouse_connector import FabricLakehouseConnector
from .generic_connector import GenericConnector


class ConnectorRegistry:
    def __init__(self):
        self._connectors: Dict[str, BaseConnector] = {
            "SQLServer": SQLConnector(),
            "AzureSQL": SQLConnector(),
            "Synapse": SQLConnector(),
            "FabricLakehouse": FabricLakehouseConnector(),
            "AzureDataLake": GenericConnector(),
            "Databricks": GenericConnector(),
            "Snowflake": GenericConnector(),
            "PostgreSQL": GenericConnector(),
            "MySQL": GenericConnector(),
            "Excel": GenericConnector(),
            "CSV": GenericConnector(),
            "Parquet": GenericConnector(),
            "JSON": GenericConnector(),
            "SharePoint": GenericConnector(),
            "OneDrive": GenericConnector(),
            "OData": GenericConnector(),
            "REST": GenericConnector(),
        }

    def get(self, connector_type: str) -> BaseConnector:
        return self._connectors.get(connector_type, self._connectors["Excel"])

    def supported_types(self):
        return sorted(self._connectors.keys())
