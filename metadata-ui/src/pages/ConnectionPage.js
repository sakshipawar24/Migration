import React from 'react';

function ConnectionPage({
  changeConnectionReport, setChangeConnectionReport,
  autoServer, setAutoServer,
  autoDatabase, setAutoDatabase,
  autoTargetTechnology, setAutoTargetTechnology,
  autoWorkspaceId, setAutoWorkspaceId,
  autoLakehouseId, setAutoLakehouseId,
  extractBeforeMetadata, changeConnection, changeConnectionForAll,
  busyAction, selectedReport, changeConnectionOptions, runAllOutput,
  onFabricWorkspaceBlur
}) {
  return (
    <div className="page connection-page">
      {/* ── Connection Target Details Card ── */}
      <div className="card-section connection-card">
        <div className="card-header">
          <div>
            <h2>Connection Target Details</h2>
            <p>New server, database, and Fabric target settings.</p>
          </div>
        </div>

        <div className="card-grid two-columns">
          <div className="input-group">
            <label>Report (Change Connection)</label>
            <select value={changeConnectionReport} onChange={(e) => setChangeConnectionReport(e.target.value)} className="select-input">
              <option value="">Select a report</option>
              {changeConnectionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>New Server</label>
            <input type="text" value={autoServer} onChange={(e) => setAutoServer(e.target.value)} placeholder="dummy_server" className="text-input" />
          </div>
          <div className="input-group">
            <label>New Database</label>
            <input type="text" value={autoDatabase} onChange={(e) => setAutoDatabase(e.target.value)} placeholder="dummy_database" className="text-input" />
          </div>
          <div className="input-group">
            <label>Target Technology</label>
            <select value={autoTargetTechnology} onChange={(e) => setAutoTargetTechnology(e.target.value)} className="select-input">
              <option value="Keep Same">Keep Same</option>
              <option value="SQL Server">SQL Server</option>
              <option value="Fabric Lakehouse">Fabric Lakehouse</option>
            </select>
          </div>
          <div className="input-group">
            <label>Workspace ID (Fabric)</label>
            <input type="text" value={autoWorkspaceId} onChange={(e) => setAutoWorkspaceId(e.target.value)} onBlur={onFabricWorkspaceBlur} placeholder="dummy_workspace_id" className="text-input" />
          </div>
          <div className="input-group">
            <label>Lakehouse ID (Fabric)</label>
            <input type="text" value={autoLakehouseId} onChange={(e) => setAutoLakehouseId(e.target.value)} placeholder="dummy_lakehouse_id" className="text-input" />
          </div>
        </div>

        <div className="ops-btn-row">
          <button className="ops-btn blue" onClick={extractBeforeMetadata} disabled={busyAction !== null || (!selectedReport && !changeConnectionReport)}>
            {busyAction === 'fetch-metadata' ? 'Extracting...' : 'Extract Metadata'}
          </button>
          <button className="ops-btn purple" onClick={() => changeConnection()} disabled={busyAction !== null || !changeConnectionReport}>
            {busyAction === 'change-connection' ? 'Updating...' : 'Change Connection'}
          </button>
          <button className="ops-btn indigo" onClick={changeConnectionForAll} disabled={busyAction !== null}>
            {busyAction === 'change-connection-all' ? 'Updating all...' : 'Change All Connections'}
          </button>
        </div>
      </div>

      {runAllOutput && (
        <div className="run-output">
          <h4>Migration Log</h4>
          <pre>{runAllOutput}</pre>
        </div>
      )}
    </div>
  );
}

export default ConnectionPage;
