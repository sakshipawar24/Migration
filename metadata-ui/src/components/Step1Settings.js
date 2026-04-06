import React, { useState } from 'react';
import '../styles/WizardSteps.css';

export default function Step1Settings({
  tenantId, setTenantId,
  clientId, setClientId,
  clientSecret, setClientSecret,
  pbipFolder, setPbipFolder,
  onNext,
  showStatus,
  saveAuthConfig,
  busyAction
}) {
  const [showSecret, setShowSecret] = useState(false);

  const handleContinue = async (e) => {
    e.preventDefault();
    
    if (!tenantId || !clientId || !clientSecret) {
      showStatus('Please fill in all authentication fields', 'error');
      return;
    }

    if (!pbipFolder) {
      showStatus('Please specify PBIP folder path', 'error');
      return;
    }

    try {
      await saveAuthConfig();
      onNext();
    } catch (error) {
      showStatus('Failed to save auth config: ' + error.message, 'error');
    }
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Step 1: Initial Settings</h2>
        <p>Configure Power BI authentication and PBIP folder location</p>
      </div>

      <form onSubmit={handleContinue} className="step-form">
        <div className="form-section">
          <h3>Power BI Authentication</h3>
          <div className="form-group">
            <label>Tenant ID</label>
            <input
              type="text"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Client ID</label>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              placeholder="e.g., xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label>Client Secret</label>
            <div className="password-input-group">
              <input
                type={showSecret ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowSecret(!showSecret)}
              >
                {showSecret ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h3>PBIP Location</h3>
          <div className="form-group">
            <label>PBIP Folder Path</label>
            <input
              type="text"
              value={pbipFolder}
              onChange={(e) => setPbipFolder(e.target.value)}
              placeholder="e.g., D:\\PBIP"
              className="form-input"
              required
            />
            <small>Path to your Power BI Project folder</small>
          </div>
        </div>

        <div className="step-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={busyAction !== null}
          >
            {busyAction ? '⏳ Processing...' : '→ Continue to Step 2'}
          </button>
        </div>
      </form>
    </div>
  );
}
