import React, { useState } from 'react';

function ProcessButtons({ 
  pbipPath, 
  workspaceName, 
  targetSystem,
  onBeforeMetadata,
  onAfterMetadata 
}) {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 = ready for convert, 2 = ready for change connection
  
  // Connection inputs
  const [server, setServer] = useState('');
  const [database, setDatabase] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [lakehouseId, setLakehouseId] = useState('');

  const handleConvertPBIP = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/convert-pbip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pbipPath,
          workspaceName,
          targetSystem
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onBeforeMetadata(data.metadata);
        setStep(2);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to convert PBIP: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeConnection = async () => {
    if (!server || !database) {
      alert('Please enter server and database');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/change-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pbipPath,
          server,
          database,
          workspaceId: workspaceId || 'dummy_workspace_id',
          lakehouseId: lakehouseId || 'dummy_lakehouse_id'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        onAfterMetadata(data.metadata);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      alert('Failed to change connection: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="process-buttons-section">
      <div className="button-container">
        <button
          className="action-btn primary-btn"
          onClick={handleConvertPBIP}
          disabled={!pbipPath || loading || step > 1}
        >
          {loading && step === 1 ? 'Processing...' : 'Extract PBIP Data'}
        </button>

        <div className="step-indicator">
          {step === 1 && <span>Step 1: Extract metadata from PBIP</span>}
          {step === 2 && <span className="success">Ready for connection change</span>}
        </div>
      </div>

      {step === 2 && (
        <div className="connection-inputs">
          <h3> Connection Settings</h3>
          
          <div className="input-row">
            <div className="input-group">
              <label>Server:</label>
              <input
                type="text"
                value={server}
                onChange={(e) => setServer(e.target.value)}
                placeholder="Enter server name..."
                className="text-input"
              />
            </div>

            <div className="input-group">
              <label>Database:</label>
              <input
                type="text"
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                placeholder="Enter database name..."
                className="text-input"
              />
            </div>
          </div>

          <div className="input-row">
            <div className="input-group">
              <label>Workspace ID (optional):</label>
              <input
                type="text"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                placeholder="Fabric workspace ID..."
                className="text-input"
              />
            </div>

            <div className="input-group">
              <label>Lakehouse ID (optional):</label>
              <input
                type="text"
                value={lakehouseId}
                onChange={(e) => setLakehouseId(e.target.value)}
                placeholder="Fabric lakehouse ID..."
                className="text-input"
              />
            </div>
          </div>

          <button
            className="action-btn secondary-btn"
            onClick={handleChangeConnection}
            disabled={loading || !server || !database}
          >
            {loading && step === 2 ? 'Updating...' : 'Change Connection & SQL'}
          </button>
        </div>
      )}
    </div>
  );
}

export default ProcessButtons;
