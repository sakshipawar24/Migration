import React from 'react';
import '../styles/WizardSteps.css';

export default function Step3Summary({
  tenantId, clientId,
  pbipFolder,
  changeConnectionReport,
  autoServer, autoDatabase, autoTargetTechnology,
  autoWorkspaceId, autoLakehouseId,
  onNext, onBack,
  busyAction
}) {
  const maskValue = (value, type = 'secret') => {
    if (!value) return 'Not configured';
    if (type === 'secret' && value.length > 8) {
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    }
    return value;
  };

  const SummaryField = ({ label, value, type = 'text' }) => (
    <div className="summary-field">
      <span className="summary-label">{label}</span>
      <span className="summary-value">{maskValue(value, type)}</span>
    </div>
  );

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Step 3: Review Configuration</h2>
        <p>Verify all settings before proceeding to transformation</p>
      </div>

      <div className="summary-content">
        <div className="summary-box">
          <div className="summary-title">
            <span className="icon">🔐</span>
            <h3>Authentication</h3>
          </div>
          <div className="summary-grid">
            <SummaryField label="Tenant ID" value={tenantId} type="id" />
            <SummaryField label="Client ID" value={clientId} type="id" />
            <SummaryField label="PBIP Folder" value={pbipFolder} type="path" />
          </div>
        </div>

        <div className="summary-box">
          <div className="summary-title">
            <span className="icon">📊</span>
            <h3>Report Configuration</h3>
          </div>
          <div className="summary-grid">
            <SummaryField label="Selected Report" value={changeConnectionReport} />
            <SummaryField label="Target Technology" value={autoTargetTechnology} />
          </div>
        </div>

        <div className="summary-box">
          <div className="summary-title">
            <span className="icon">🔌</span>
            <h3>Connection Details</h3>
          </div>
          <div className="summary-grid">
            <SummaryField label="New Server" value={autoServer} />
            <SummaryField label="New Database" value={autoDatabase} />
            <SummaryField label="Workspace ID" value={autoWorkspaceId} />
            <SummaryField label="Lakehouse ID" value={autoLakehouseId} />
          </div>
        </div>

        <div className="summary-note">
          <strong>✓ All settings configured</strong>
          <p>Click 'Continue' to proceed with metadata transformation and form details.</p>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ← Back to Configuration
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onNext}
          disabled={busyAction !== null}
        >
          {busyAction ? '⏳ Processing...' : '→ Continue to Detailed Form'}
        </button>
      </div>
    </div>
  );
}
