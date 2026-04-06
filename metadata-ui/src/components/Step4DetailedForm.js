import React from 'react';
import '../styles/WizardSteps.css';

export default function Step4DetailedForm({
  metadata,
  metadataCache,
  complexityMatrix,
  onComplexityMatrixChange,
  onNext, onBack,
  busyAction
}) {
  const handleMatrixChange = (objectKey, level, value) => {
    onComplexityMatrixChange(objectKey, level, value);
  };

  const handleContinue = (e) => {
    e.preventDefault();
    onNext();
  };

  const metrics = ['connection', 'table', 'sqlQueries'];
  const levels = ['low', 'medium', 'high'];

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Step 4: Detailed Configuration</h2>
        <p>Review metadata and configure complexity thresholds</p>
      </div>

      <form onSubmit={handleContinue} className="step-form">
        
        {/* Metadata Table */}
        {metadata && metadata.length > 0 && (
          <div className="form-section">
            <h3>📋 Metadata Overview</h3>
            <div className="metadata-table-wrapper">
              <table className="metadata-table">
                <thead>
                  <tr>
                    <th>Report</th>
                    <th>Table Name</th>
                    <th>Source</th>
                    <th>Connections</th>
                    <th>Queries</th>
                  </tr>
                </thead>
                <tbody>
                  {metadata.slice(0, 5).map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.reportDisplay || row.reportName}</td>
                      <td>{row.Table_Name || 'N/A'}</td>
                      <td>{row.Before_Source || row.Source || 'Unknown'}</td>
                      <td>{row.Connection_Info || '-'}</td>
                      <td>{row.QueryCount || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {metadata.length > 5 && (
                <small>... and {metadata.length - 5} more rows</small>
              )}
            </div>
          </div>
        )}

        {/* Complexity Matrix */}
        <div className="form-section">
          <h3>⚙️ Complexity Thresholds</h3>
          <p className="form-hint">Configure what constitutes Low, Medium, and High complexity</p>
          
          <div className="complexity-matrix">
            <div className="matrix-header">
              <div className="matrix-cell label-cell"></div>
              <div className="matrix-cell header-cell">Low</div>
              <div className="matrix-cell header-cell">Medium</div>
              <div className="matrix-cell header-cell">High</div>
            </div>

            {metrics.map((metric) => (
              <div key={metric} className="matrix-row">
                <div className="matrix-cell label-cell">
                  {metric === 'connection' && '🔗 Connections'}
                  {metric === 'table' && '📊 Tables'}
                  {metric === 'sqlQueries' && '💾 SQL Queries'}
                </div>
                {levels.map((level) => (
                  <div key={`${metric}-${level}`} className="matrix-cell">
                    <input
                      type="text"
                      value={complexityMatrix[metric]?.[level] || ''}
                      onChange={(e) => handleMatrixChange(metric, level, e.target.value)}
                      className="matrix-input"
                      placeholder="e.g., 2 or 2+"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <small className="form-hint">
            Use numbers (e.g., "2", "5") or numbers with + (e.g., "2+", "5+")
          </small>
        </div>

        <div className="step-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            ← Back to Summary
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busyAction !== null}
          >
            {busyAction ? '⏳ Processing...' : '→ Continue to Download'}
          </button>
        </div>
      </form>
    </div>
  );
}
