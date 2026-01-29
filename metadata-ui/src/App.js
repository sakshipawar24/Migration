import React, { useState } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import ProcessButtons from './components/ProcessButtons';
import MetadataTable from './components/MetadataTable';
import StatsCards from './components/StatsCards';

function App() {
  // Upload state
  const [pbipPath, setPbipPath] = useState(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [targetSystem, setTargetSystem] = useState('');
  
  // Metadata state
  const [beforeMetadata, setBeforeMetadata] = useState([]);
  const [afterMetadata, setAfterMetadata] = useState([]);
  
  // UI state
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const handleUploadSuccess = (data) => {
    setPbipPath(data.pbip_path);
    setWorkspaceName(data.workspace_name);
    setTargetSystem(data.target_system);
    setUploadSuccess(true);
    
    // Reset metadata on new upload
    setBeforeMetadata([]);
    setAfterMetadata([]);
  };

  const handleBeforeMetadata = (metadata) => {
    setBeforeMetadata(metadata);
  };

  const handleAfterMetadata = (metadata) => {
    setAfterMetadata(metadata);
  };

  const calculateStats = (metadata) => {
    const connectionTypes = {};
    const sources = {};
    
    metadata.forEach(row => {
      const connType = row.Connection_Type || 'Unknown';
      connectionTypes[connType] = (connectionTypes[connType] || 0) + 1;
      
      const source = row.Before_Source || row.After_Source || 'Unknown';
      sources[source] = (sources[source] || 0) + 1;
    });
    
    return {
      total_tables: metadata.length,
      connection_types: connectionTypes,
      sources: sources
    };
  };

  return (
    <div className="App">
      <div className="header">
        <h1>PBIP Converter & Metadata Viewer</h1>
        <p>UI-Driven Power BI Project Processing</p>
      </div>

      {/* File Upload Section */}
      <FileUpload onUploadSuccess={handleUploadSuccess} />

      {/* Show project info after upload */}
      {uploadSuccess && (
        <div className="project-info">
          <h3>Project Loaded</h3>
          <p><strong>Workspace:</strong> {workspaceName}</p>
          <p><strong>Target:</strong> {targetSystem}</p>
          <p><strong>Path:</strong> {pbipPath}</p>
        </div>
      )}

      {/* Process Buttons */}
      {uploadSuccess && (
        <ProcessButtons
          pbipPath={pbipPath}
          workspaceName={workspaceName}
          targetSystem={targetSystem}
          onBeforeMetadata={handleBeforeMetadata}
          onAfterMetadata={handleAfterMetadata}
        />
      )}

      {/* BEFORE Metadata Display */}
      {beforeMetadata.length > 0 && (
        <div className="metadata-section before-section">
          <div className="section-header">
            <h2>BEFORE Metadata</h2>
            <span className="badge">{beforeMetadata.length} tables</span>
          </div>
          
          <StatsCards 
            stats={calculateStats(beforeMetadata)} 
            totalRecords={beforeMetadata.length} 
          />
          
          <MetadataTable data={beforeMetadata} type="before" />
        </div>
      )}

      {/* AFTER Metadata Display */}
      {afterMetadata.length > 0 && (
        <div className="metadata-section after-section">
          <div className="section-header">
            <h2>AFTER Metadata</h2>
            <span className="badge success">{afterMetadata.length} tables</span>
          </div>
          
          <StatsCards 
            stats={calculateStats(afterMetadata)} 
            totalRecords={afterMetadata.length} 
          />
          
          <MetadataTable data={afterMetadata} type="after" />
        </div>
      )}

      {/* Instructions */}
      {!uploadSuccess && (
        <div className="instructions">
          <h3>How to Use</h3>
          <ol>
            <li>Enter your workspace name and select target system</li>
            <li>Upload your PBIP project folder</li>
            <li>Click "Extract PBIP Data" to extract BEFORE metadata</li>
            <li>Enter connection details</li>
            <li>Click "Change Connection & SQL" to update and view AFTER metadata</li>
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;
