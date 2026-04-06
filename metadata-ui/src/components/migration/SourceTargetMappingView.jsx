import React from 'react';

export default function SourceTargetMappingView({ sourceType, targetType, mapping = {}, warnings = [] }) {
  return (
    <section className="card-section" style={{ marginTop: 16 }}>
      <h3>Source to Target Mapping</h3>
      <div style={{ marginBottom: 10 }}>
        <strong>{sourceType || 'Unknown'}</strong> to <strong>{targetType || 'Unknown'}</strong>
      </div>
      <pre style={{ background: '#0f172a', color: '#e2e8f0', padding: 12, borderRadius: 8, overflowX: 'auto' }}>
        {JSON.stringify(mapping, null, 2)}
      </pre>
      {warnings.length > 0 && (
        <ul style={{ marginTop: 10, color: '#b45309' }}>
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
