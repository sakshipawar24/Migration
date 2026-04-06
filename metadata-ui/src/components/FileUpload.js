import React, { useState } from 'react';

function FileUpload({ onUploadSuccess }) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [targetSystem, setTargetSystem] = useState('Fabric');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  const handleFolderUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!workspaceName.trim()) {
      setError('Please enter a workspace name');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    
    // Add all files to FormData
    for (let i = 0; i < files.length; i++) {
      formData.append('pbipFolder', files[i], files[i].webkitRelativePath || files[i].name);
    }
    
    formData.append('workspaceName', workspaceName);
    formData.append('targetSystem', targetSystem);

    try {
      const response = await fetch('http://localhost:5000/api/upload-pbip', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        onUploadSuccess(data);
      } else {
        setError(data.error || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload PBIP folder: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="file-upload-section">
      <h2>Upload PBIP Project</h2>
      
      <div className="upload-inputs">
        <div className="input-group">
          <label>Workspace Name:</label>
          <input
            type="text"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="Enter workspace name..."
            className="text-input"
          />
        </div>

        <div className="input-group">
          <label>Target System:</label>
          <select
            value={targetSystem}
            onChange={(e) => setTargetSystem(e.target.value)}
            className="select-input"
          >
            <option value="Fabric">Microsoft Fabric</option>
            <option value="Synapse">Azure Synapse</option>
            <option value="Databricks">Databricks</option>
          </select>
        </div>

        <div className="input-group">
          <label>Select PBIP Folder:</label>
          <input
            type="file"
            webkitdirectory="true"
            directory="true"
            multiple
            onChange={handleFolderUpload}
            disabled={uploading || !workspaceName.trim()}
            className="file-input"
          />
        </div>
      </div>

      {uploading && (
        <div className="upload-status">
          <span>Uploading PBIP folder...</span>
        </div>
      )}

      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
        </div>
      )}
    </div>
  );
}

export default FileUpload;
