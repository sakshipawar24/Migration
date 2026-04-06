import React from 'react';

export default function MigrationSummaryView({ rows = [] }) {
  const total = rows.length;
  const high = rows.filter((row) => row.complexity === 'High').length;
  const medium = rows.filter((row) => row.complexity === 'Medium').length;
  const low = rows.filter((row) => row.complexity === 'Low').length;

  return (
    <section className="card-section" style={{ marginTop: 16 }}>
      <h3>Migration Summary</h3>
      <div style={{ display: 'flex', gap: 12 }}>
        <span>Total Reports: {total}</span>
        <span>High: {high}</span>
        <span>Medium: {medium}</span>
        <span>Low: {low}</span>
      </div>
    </section>
  );
}
