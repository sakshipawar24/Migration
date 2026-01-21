import React from 'react';

function StatsCards({ stats, totalRecords }) {
  if (!stats) return null;

  const formatStats = (obj) => {
    if (!obj) return [];
    return Object.entries(obj).map(([key, value]) => ({
      label: key,
      count: value
    }));
  };

  return (
    <div className="stats-container">
      <div className="stat-card">
        <h3>📋 Total Tables</h3>
        <div className="number">{stats.total_tables || 0}</div>
        <div className="label">Filtered: {totalRecords}</div>
      </div>

      <div className="stat-card">
        <h3>🔌 Connection Types</h3>
        <div className="number">{Object.keys(stats.connection_types || {}).length}</div>
        <div className="label">
          {formatStats(stats.connection_types).slice(0, 2).map(s => 
            `${s.label} (${s.count})`
          ).join(', ')}
        </div>
      </div>

      <div className="stat-card">
        <h3>📊 Before Sources</h3>
        <div className="number">{Object.keys(stats.before_sources || {}).length}</div>
        <div className="label">
          {formatStats(stats.before_sources).slice(0, 2).map(s => 
            `${s.label} (${s.count})`
          ).join(', ')}
        </div>
      </div>

      <div className="stat-card">
        <h3>✨ After Sources</h3>
        <div className="number">{Object.keys(stats.after_sources || {}).length}</div>
        <div className="label">
          {formatStats(stats.after_sources).slice(0, 2).map(s => 
            `${s.label} (${s.count})`
          ).join(', ')}
        </div>
      </div>
    </div>
  );
}

export default StatsCards;
