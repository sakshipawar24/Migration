import React from 'react';

const colorMap = {
  SQLServer: '#0ea5e9',
  AzureSQL: '#0ea5e9',
  Synapse: '#0284c7',
  FabricLakehouse: '#14b8a6',
  Databricks: '#f97316',
  Snowflake: '#38bdf8',
  PostgreSQL: '#6366f1',
  MySQL: '#f59e0b',
  SharePoint: '#22c55e',
  OData: '#a855f7',
  REST: '#64748b',
  Unknown: '#94a3b8'
};

export default function ConnectorTypeBadge({ connectorType = 'Unknown' }) {
  const background = colorMap[connectorType] || colorMap.Unknown;
  return (
    <span style={{
      display: 'inline-block',
      padding: '4px 10px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      color: 'white',
      background,
    }}>
      {connectorType}
    </span>
  );
}
