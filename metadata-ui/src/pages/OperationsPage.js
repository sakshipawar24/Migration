import React from 'react';

function OperationsPage({ 
  sourceWorkspaceId, setSourceWorkspaceId, 
  targetWorkspaceId, setTargetWorkspaceId,
  pbixFolder, setPbixFolder,
  downloadPbix, convertPbix,
  busyAction, flowSteps, convertedReports, getPbipFolderPath,
  sourceWorkspaceHistory = [],
  targetWorkspaceHistory = [],
  runAllOutput,
  onSourceWorkspaceBlur,
  onTargetWorkspaceBlur,
  downloadedReports = [],
  downloadStatus = 'idle',
  convertStatus = 'idle',
}) {
  return (
    <div className="page operations-page">
      {/* ── Power BI Operations Card ── */}
      <div className="card-section ops-card">
        <div className="card-header">
          <div>
            <h2>Power BI Operations</h2>
            <p>Download and convert reports, or run the full flow.</p>
          </div>
        </div>

        <div className="card-grid two-columns">
          <div className="input-group">
            <label>Source Workspace ID (for download)</label>
            <input 
              type="text" 
              value={sourceWorkspaceId} 
              onChange={(e) => setSourceWorkspaceId(e.target.value)} 
              onBlur={onSourceWorkspaceBlur}
              placeholder="Source workspace GUID" 
              className="text-input"
              list="sourceWorkspace-history"
              autoComplete="off"
            />
            <datalist id="sourceWorkspace-history">
              {sourceWorkspaceHistory.map((id, idx) => (
                <option key={idx} value={id} />
              ))}
            </datalist>
          </div>
          <div className="input-group">
            <label>Target Workspace ID (for publish/refresh)</label>
            <input 
              type="text" 
              value={targetWorkspaceId} 
              onChange={(e) => setTargetWorkspaceId(e.target.value)} 
              onBlur={onTargetWorkspaceBlur}
              placeholder="Target workspace GUID" 
              className="text-input"
              list="targetWorkspace-history"
              autoComplete="off"
            />
            <datalist id="targetWorkspace-history">
              {targetWorkspaceHistory.map((id, idx) => (
                <option key={idx} value={id} />
              ))}
            </datalist>
          </div>
          <div className="input-group">
            <label>PBIX Folder</label>
            <input 
              type="text" 
              value={pbixFolder} 
              onChange={(e) => setPbixFolder(e.target.value)} 
              placeholder="D:\\PBIX" 
              className="text-input" 
            />
          </div>
        </div>

        <div className="ops-btn-row">
          <button className="ops-btn blue" onClick={downloadPbix} disabled={busyAction !== null}>
            {busyAction === 'download' ? 'Downloading...' : 'Download PBIX'}
          </button>
          <button className="ops-btn green" onClick={convertPbix} disabled={busyAction !== null}>
            {busyAction === 'convert' ? 'Converting...' : 'Convert to PBIP'}
          </button>
        </div>

        {/* Download PBIX — Report Status Grid */}
        {(downloadedReports.length > 0 || downloadStatus === 'running') && (
          <div className="process-result-section">
            <div className="process-result-label">
              <span className="process-result-dot" style={{ background: '#3b82f6' }} />
              Download PBIX
              <span className="process-result-count">
                {downloadedReports.length} report{downloadedReports.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="process-report-grid">
              <div className="process-report-row process-report-header">
                <span>Report Name</span>
                <span>Status</span>
              </div>
              {downloadedReports.map((name) => (
                <div className="process-report-row" key={name}>
                  <span className="process-report-name">{name}</span>
                  <span className="status-pill success">Downloaded</span>
                </div>
              ))}
              {downloadStatus === 'running' && downloadedReports.length === 0 && (
                <div className="process-report-row">
                  <span className="process-report-name" style={{ color: '#64748b', fontStyle: 'italic' }}>
                    Downloading reports…
                  </span>
                  <span className="status-pill info">In Progress</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Convert to PBIP — Report Status Grid */}
        {(convertedReports.length > 0 || convertStatus === 'running') && (
          <div className="process-result-section">
            <div className="process-result-label">
              <span className="process-result-dot" style={{ background: '#10b981' }} />
              Convert to PBIP
              <span className="process-result-count">
                {convertedReports.length} report{convertedReports.length !== 1 ? 's' : ''}
              </span>
              {convertedReports.length > 0 && (
                <span style={{ marginLeft: 'auto', marginRight: 0, fontSize: '0.82em', color: '#475569' }}>
                  Folder: <strong>{getPbipFolderPath(pbixFolder)}</strong>
                </span>
              )}
            </div>
            <div className="process-report-grid">
              <div className="process-report-row process-report-header">
                <span>Report Name</span>
                <span>Status</span>
              </div>
              {convertedReports.map((name) => (
                <div className="process-report-row" key={name}>
                  <span className="process-report-name">{name}</span>
                  <span className="status-pill success">Converted</span>
                </div>
              ))}
              {convertStatus === 'running' && convertedReports.length === 0 && (
                <div className="process-report-row">
                  <span className="process-report-name" style={{ color: '#64748b', fontStyle: 'italic' }}>
                    Converting reports…
                  </span>
                  <span className="status-pill info">In Progress</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Flow Step Tracker */}
        {flowSteps.length > 0 && (
          <div className="flow-tracker">
            <div className="flow-tracker-title">
              {busyAction === 'runall' ? 'Migration in progress...' : 'Migration Steps'}
            </div>
            <div className="flow-steps-list">
              {flowSteps.map((step, idx) => (
                <div className={`flow-step-item ${step.status}`} key={step.key}>
                  <div className={`flow-step-icon ${step.status}`}>
                    {step.status === 'done' ? 'Done' :
                     step.status === 'error' ? 'Fail' :
                     step.status === 'running' ? (
                       <span className="flow-spinner" />
                     ) :
                     step.status === 'skipped' ? 'Skip' :
                     (idx + 1)}
                  </div>
                  <div className="flow-step-info">
                    <span className="flow-step-label">{step.label}</span>
                    <span className={`flow-step-badge ${step.status}`}>
                      {step.status === 'done' ? 'Completed' :
                       step.status === 'error' ? 'Failed' :
                       step.status === 'running' ? 'Running...' :
                       step.status === 'skipped' ? 'Skipped' :
                       'Pending'}
                    </span>
                  </div>
                  {idx < flowSteps.length - 1 && <div className={`flow-step-connector ${step.status}`} />}
                </div>
              ))}
            </div>
          </div>
        )}

        {runAllOutput && (
          <div className="run-output">
            <h4>Migration Log</h4>
            <pre>{runAllOutput}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperationsPage;
