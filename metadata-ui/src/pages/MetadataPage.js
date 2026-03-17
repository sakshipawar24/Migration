import React from 'react';
import MetadataComparisonComponent from '../components/MetadataComparisonComponent';

function MetadataPage({
  selectedReport, handleReportSelection,
  pbixReports,
  metadataBefore, metadataAfter,
  statusMessage, statusType,
  targetTechnology
}) {
  return (
    <div className="page metadata-page">
      {/* ── Status Message ── */}
      {statusMessage && (
        <div className={`status-banner ${statusType}`} style={{ marginBottom: '20px', background: statusType === 'success' ? 'rgba(16,185,129,0.15)' : statusType === 'error' ? 'rgba(239,68,68,0.15)' : statusType === 'warning' ? 'rgba(234,179,8,0.15)' : 'rgba(46,170,220,0.15)', color: statusType === 'success' ? '#6ee7b7' : statusType === 'error' ? '#fca5a5' : statusType === 'warning' ? '#fbbf24' : '#93c5fd', border: `1px solid ${statusType === 'success' ? 'rgba(16,185,129,0.3)' : statusType === 'error' ? 'rgba(239,68,68,0.3)' : statusType === 'warning' ? 'rgba(234,179,8,0.3)' : 'rgba(46,170,220,0.3)'}`, borderRadius: '12px', padding: '14px 20px' }}>
          {statusMessage}
        </div>
      )}

      {/* ── Report Selector & Metadata ── */}
      <div className="report-selector">
        <div className="input-group">
          <h2 className="report-title">Select the file you want to view metadata for:</h2>
          <select value={selectedReport} onChange={(e) => handleReportSelection(e.target.value)} className="select-input">
            <option value="">Select a report</option>
            {pbixReports.map((option) => (
              <option key={option.name} value={option.name}>{option.displayName || option.name}</option>
            ))}
          </select>
        </div>
      </div>

      {selectedReport ? (
        <MetadataComparisonComponent
          externalBeforeData={metadataBefore}
          externalAfterData={metadataAfter}
          selectedReport={selectedReport}
          targetTechnology={targetTechnology}
        />
      ) : (
        <div className="no-data" style={{ background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: '14px', padding: '40px' }}>Select a report to view metadata.</div>
      )}
    </div>
  );
}

export default MetadataPage;
