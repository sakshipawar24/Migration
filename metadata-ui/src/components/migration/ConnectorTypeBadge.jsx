import React from 'react';

export default function ConnectorTypeBadge({ connectorType = 'Unknown' }) {
  return <span>{connectorType}</span>;
}
