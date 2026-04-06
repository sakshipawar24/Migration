import React from 'react';
import '../styles/WizardSteps.css';

export default function Step2Configuration({
  changeConnectionReport, setChangeConnectionReport,
  autoServer, setAutoServer,
  autoDatabase, setAutoDatabase,
  autoTargetTechnology, setAutoTargetTechnology,
  autoWorkspaceId, setAutoWorkspaceId,
  autoLakehouseId, setAutoLakehouseId,
  changeConnectionOptions,
  onNext, onBack,
  busyAction
}) {
  const handleContinue = (e) => {
    e.preventDefault();
    
    if (!changeConnectionReport) {
      alert('Please select a report');
      return;
    }

    onNext();
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Step 2: Configuration</h2>
        <p>Configure connection details for data transformation</p>
      </div>

      <form onSubmit={handleContinue} className="step-form">
        <div className="form-section">
          <h3>Report Selection</h3>
          <div className="form-group">
            <label>Select Report to Transform</label>
            <select
              value={changeConnectionReport}
              onChange={(e) => setChangeConnectionReport(e.target.value)}
              className="form-input"
              required
            >
              <option value="">-- Choose a report --</option>
              {changeConnectionOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>New Connection Details</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Server</label>
              <input
                type="text"
                value={autoServer}
                onChange={(e) => setAutoServer(e.target.value)}
                placeholder="e.g., prod-sqlserver.database.windows.net"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Database</label>
              <input
                type="text"
                value={autoDatabase}
                onChange={(e) => setAutoDatabase(e.target.value)}
                placeholder="e.g., production_db"
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Target Technology</label>
            <select
              value={autoTargetTechnology}
              onChange={(e) => setAutoTargetTechnology(e.target.value)}
              className="form-input"
            >
              <option value="Keep Same">Keep Same (No Change)</option>
              <option value="SQL Server">SQL Server</option>
              <option value="Fabric Lakehouse">Fabric Lakehouse</option>
              <option value="Azure Synapse">Azure Synapse</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h3>Target Workspace Settings</h3>
          
          <div className="form-row">
            <div className="form-group">
              <label>Workspace ID</label>
              <input
                type="text"
                value={autoWorkspaceId}
                onChange={(e) => setAutoWorkspaceId(e.target.value)}
                placeholder="e.g., workspace-123abc"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Lakehouse ID</label>
              <input
                type="text"
                value={autoLakehouseId}
                onChange={(e) => setAutoLakehouseId(e.target.value)}
                placeholder="e.g., lakehouse-456def"
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="step-actions">
          <button type="button" className="btn btn-secondary" onClick={onBack}>
            ← Back to Step 1
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busyAction !== null}
          >
            {busyAction ? '⏳ Processing...' : '→ Continue to Summary'}
          </button>
        </div>
      </form>
    </div>
  );
}
