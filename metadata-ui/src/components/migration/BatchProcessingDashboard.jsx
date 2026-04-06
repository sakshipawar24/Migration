import React from 'react';

export default function BatchProcessingDashboard({ summary, items = [] }) {
  const totals = summary || { total: items.length, success: 0, failed: 0 };

  return (
    <section className="card-section" style={{ marginTop: 16 }}>
      <h3>Batch Processing Dashboard</h3>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <span>Total: {totals.total || 0}</span>
        <span>Success: {totals.success || 0}</span>
        <span>Failed: {totals.failed || 0}</span>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Report</th>
              <th>Status</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={`${item.name}-${item.timestamp || ''}`}>
                <td>{item.name}</td>
                <td>{item.status}</td>
                <td>{item.error || 'Completed'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
