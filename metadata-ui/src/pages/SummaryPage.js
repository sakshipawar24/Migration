import React from 'react';
import '../App.css';

function SummaryPage({ 
  tenantId, 
  clientId, 
  sourceWorkspaceId, 
  targetWorkspaceId, 
  pbixFolder,
  activityLog,
  completedSteps,
  metadataCache,
  pbipReports,
  selectedReport
}) {
  const maskSecret = (secret) => {
    if (!secret) return 'Not set';
    if (secret.length <= 8) return '***';
    return secret.substring(0, 4) + '***' + secret.substring(secret.length - 4);
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '•';
    }
  };

  const downloadCSVFile = async (content, filename) => {
    // Save to backend folder D:\Internship\Final
    try {
      const response = await fetch('http://localhost:5000/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, filename })
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert(`✓ File saved successfully!\n\nLocation: ${result.filePath}\n\nFile: ${filename}`);
      } else {
        alert(`❌ Failed to save file: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Error saving file: ${error.message}`);
    }
  };

  const escapeCSV = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    // Escape double quotes and wrap in quotes if contains comma, newline, or quote
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
  };

  const arrayToCSV = (headers, rows) => {
    const csvHeaders = headers.map(h => escapeCSV(h)).join(',');
    const csvRows = rows.map(row => 
      headers.map(header => escapeCSV(row[header] || '')).join(',')
    ).join('\n');
    return csvHeaders + '\n' + csvRows;
  };

  const filterActivitiesByOperation = (operationKeywords) => {
    if (!activityLog) return [];
    return activityLog.filter(activity => 
      operationKeywords.some(keyword => 
        activity.operation.toLowerCase().includes(keyword.toLowerCase())
      )
    );
  };

  const generateOperationReport = (operationType, activities) => {
    const timestamp = new Date().toLocaleString();
    const successCount = activities.filter(a => a.status === 'success').length;
    const errorCount = activities.filter(a => a.status === 'error').length;
    const warningCount = activities.filter(a => a.status === 'warning').length;
    
    // CSV Format with metadata and activity details
    let csv = '';
    
    // Header section
    csv += `Report Type,${operationType} Operations Report\n`;
    csv += `Generated,${timestamp}\n`;
    csv += `User,${tenantId ? tenantId.substring(0, 8) + '...' : 'Not configured'}\n`;
    csv += `Source Workspace ID,${sourceWorkspaceId || 'Not set'}\n`;
    csv += `Target Workspace ID,${targetWorkspaceId || 'Not set'}\n`;
    csv += `PBIX Folder,${pbixFolder || 'Not set'}\n`;
    csv += `\n`;
    
    // Summary section
    csv += `Summary,,\n`;
    csv += `Total Operations,${activities.length}\n`;
    csv += `Success,${successCount}\n`;
    csv += `Errors,${errorCount}\n`;
    csv += `Warnings,${warningCount}\n`;
    csv += `\n`;
    
    // Activity details section
    if (activities.length === 0) {
      csv += `No ${operationType} operations recorded yet.\n`;
    } else {
      csv += `Activity Details,,,,\n`;
      const headers = ['#', 'Status', 'Operation', 'Timestamp', 'Message', 'Details'];
      csv += headers.map(h => escapeCSV(h)).join(',') + '\n';
      
      activities.slice().reverse().forEach((activity, idx) => {
        const row = [
          idx + 1,
          activity.status.toUpperCase(),
          activity.operation,
          activity.timestamp,
          activity.message,
          activity.details || ''
        ];
        csv += row.map(val => escapeCSV(val)).join(',') + '\n';
      });
    }
    
    return csv;
  };

  const generateCompleteSummary = () => {
    const timestamp = new Date().toLocaleString();
    let csv = '';
    
    // Header section
    csv += `Report Type,Complete Summary Report\n`;
    csv += `Generated,${timestamp}\n`;
    csv += `\n`;
    
    // Configuration section
    csv += `Configuration,,\n`;
    csv += `Tenant ID,${tenantId || 'Not configured'}\n`;
    csv += `Client ID,${clientId || 'Not configured'}\n`;
    csv += `Source Workspace ID,${sourceWorkspaceId || 'Not set'}\n`;
    csv += `Target Workspace ID,${targetWorkspaceId || 'Not set'}\n`;
    csv += `PBIX Folder,${pbixFolder || 'Not set'}\n`;
    csv += `\n`;
    
    // Workflow progress section
    csv += `Workflow Progress,,\n`;
    csv += `Step,Status\n`;
    csv += `Azure Authentication,${completedSteps.auth ? 'Completed' : 'Pending'}\n`;
    csv += `Download PBIX Files,${completedSteps.download ? 'Completed' : 'Pending'}\n`;
    csv += `Convert to PBIP Format,${completedSteps.convert ? 'Completed' : 'Pending'}\n`;
    csv += `Publish Reports,${completedSteps.publish ? 'Completed' : 'Pending'}\n`;
    csv += `Refresh Datasets,${completedSteps.refresh ? 'Completed' : 'Pending'}\n`;
    csv += `Update Connections,${completedSteps.connection ? 'Completed' : 'Pending'}\n`;
    csv += `\n`;
    
    // Activity summary section
    if (!activityLog || activityLog.length === 0) {
      csv += `No operations performed yet.\n`;
    } else {
      const successCount = activityLog.filter(a => a.status === 'success').length;
      const errorCount = activityLog.filter(a => a.status === 'error').length;
      const warningCount = activityLog.filter(a => a.status === 'warning').length;
      const infoCount = activityLog.filter(a => a.status === 'info').length;
      
      csv += `Activity Summary,,\n`;
      csv += `Total Operations,${activityLog.length}\n`;
      csv += `Success,${successCount}\n`;
      csv += `Errors,${errorCount}\n`;
      csv += `Warnings,${warningCount}\n`;
      csv += `Info,${infoCount}\n`;
      csv += `\n`;
      
      // Complete activity log
      csv += `Complete Activity Log,,,,\n`;
      const headers = ['#', 'Status', 'Operation', 'Timestamp', 'Message', 'Details'];
      csv += headers.map(h => escapeCSV(h)).join(',') + '\n';
      
      activityLog.slice().reverse().forEach((activity, idx) => {
        const row = [
          idx + 1,
          activity.status.toUpperCase(),
          activity.operation,
          activity.timestamp,
          activity.message,
          activity.details || ''
        ];
        csv += row.map(val => escapeCSV(val)).join(',') + '\n';
      });
    }
    
    return csv;
  };

  const generateCompleteSummary_old = () => {
    const timestamp = new Date().toLocaleString();
    let report = `================================================================\n`;
    report += `        PBIP MIGRATION TOOL - COMPLETE SUMMARY REPORT\n`;
    report += `================================================================\n\n`;
    report += `Generated: ${timestamp}\n\n`;
    
    report += `--- User Configuration ---\n`;
    report += `Tenant ID: ${tenantId || 'Not configured'}\n`;
    report += `Client ID: ${clientId || 'Not configured'}\n`;
    report += `Source Workspace ID: ${sourceWorkspaceId || 'Not set'}\n`;
    report += `Target Workspace ID: ${targetWorkspaceId || 'Not set'}\n`;
    report += `PBIX Folder: ${pbixFolder || 'Not set'}\n\n`;
    
    report += `--- Workflow Progress ---\n`;
    report += `${completedSteps.auth ? '✅' : '⭕'} Azure Authentication\n`;
    report += `${completedSteps.download ? '✅' : '⭕'} Download PBIX Files\n`;
    report += `${completedSteps.convert ? '✅' : '⭕'} Convert to PBIP Format\n`;
    report += `${completedSteps.publish ? '✅' : '⭕'} Publish Reports\n`;
    report += `${completedSteps.refresh ? '✅' : '⭕'} Refresh Datasets\n`;
    report += `${completedSteps.connection ? '✅' : '⭕'} Update Connections\n\n`;
    
    report += `--- Activity Summary ---\n`;
    if (!activityLog || activityLog.length === 0) {
      report += `No operations performed yet.\n\n`;
    } else {
      const successCount = activityLog.filter(a => a.status === 'success').length;
      const errorCount = activityLog.filter(a => a.status === 'error').length;
      const warningCount = activityLog.filter(a => a.status === 'warning').length;
      const infoCount = activityLog.filter(a => a.status === 'info').length;
      
      report += `Total Operations: ${activityLog.length}\n`;
      report += `✅ Success: ${successCount}\n`;
      report += `❌ Errors: ${errorCount}\n`;
      report += `⚠️  Warnings: ${warningCount}\n`;
      report += `ℹ️  Info: ${infoCount}\n\n`;
      
      report += `--- Complete Activity Log ---\n\n`;
      activityLog.slice().reverse().forEach((activity, idx) => {
        report += `[${idx + 1}] ${getStatusIcon(activity.status)} ${activity.operation}\n`;
        report += `    Time: ${activity.timestamp}\n`;
        report += `    Status: ${activity.status.toUpperCase()}\n`;
        report += `    Message: ${activity.message}\n`;
        if (activity.details) {
          report += `    Details: ${activity.details}\n`;
        }
        report += `\n`;
      });
    }
    
    report += `================================================================\n`;
    report += `                    END OF COMPLETE SUMMARY\n`;
    report += `================================================================\n`;
    
    return report;
  };

  const handleDownloadOperation = (operationType, keywords) => {
    const activities = filterActivitiesByOperation(keywords);
    const report = generateOperationReport(operationType, activities);
    const filename = `${operationType.toLowerCase().replace(/\s+/g, '_')}_report_${new Date().getTime()}.csv`;
    downloadCSVFile(report, filename);
  };

  const handleDownloadComplete = () => {
    const report = generateCompleteSummary();
    const filename = `complete_summary_${new Date().getTime()}.csv`;
    downloadCSVFile(report, filename);
  };

  const generateMetadataReport = (reportName, metadataType, metadataArray) => {
    const timestamp = new Date().toLocaleString();
    let csv = '';
    
    // Header section
    csv += `Report Type,${metadataType} Metadata Report\n`;
    csv += `Generated,${timestamp}\n`;
    csv += `Report Name,${reportName || 'All Reports'}\n`;
    csv += `User,${tenantId ? tenantId.substring(0, 8) + '...' : 'Not configured'}\n`;
    csv += `\n`;
    
    // Configuration section
    csv += `Configuration,,\n`;
    csv += `Source Workspace ID,${sourceWorkspaceId || 'Not set'}\n`;
    csv += `Target Workspace ID,${targetWorkspaceId || 'Not set'}\n`;
    csv += `PBIX Folder,${pbixFolder || 'Not set'}\n`;
    csv += `\n`;
    
    // Metadata section
    if (!metadataArray || metadataArray.length === 0) {
      csv += `No ${metadataType.toLowerCase()} metadata available.\n`;
    } else {
      csv += `Total Entries,${metadataArray.length}\n`;
      csv += `\n`;
      
      // Get all unique keys from metadata items
      const allKeys = new Set();
      metadataArray.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
      });
      const headers = Array.from(allKeys).sort();
      
      // Metadata details table
      csv += `Metadata Details,,,\n`;
      csv += headers.map(h => escapeCSV(h)).join(',') + '\n';
      
      metadataArray.forEach(item => {
        const row = headers.map(header => {
          const value = item[header];
          if (value === null || value === undefined) return '';
          // Handle long values (truncate if too long)
          if (typeof value === 'string' && value.length > 500) {
            return value.substring(0, 500) + '...';
          }
          return value;
        });
        csv += row.map(val => escapeCSV(val)).join(',') + '\n';
      });
    }
    
    return csv;
  };

  const handleDownloadBeforeMetadata = () => {
    const reportName = selectedReport || 'All Reports';
    let metadataArray = [];
    
    if (metadataCache && Object.keys(metadataCache).length > 0) {
      if (selectedReport && selectedReport !== 'All' && metadataCache[selectedReport]) {
        metadataArray = metadataCache[selectedReport].before || [];
      } else {
        // Combine all before metadata from cache
        Object.keys(metadataCache).forEach(report => {
          if (metadataCache[report].before) {
            metadataArray = metadataArray.concat(metadataCache[report].before);
          }
        });
      }
    }
    
    const report = generateMetadataReport(reportName, 'Before', metadataArray);
    const filename = `metadata_before_${reportName.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.csv`;
    downloadCSVFile(report, filename);
  };

  const handleDownloadAfterMetadata = () => {
    const reportName = selectedReport || 'All Reports';
    let metadataArray = [];
    
    if (metadataCache && Object.keys(metadataCache).length > 0) {
      if (selectedReport && selectedReport !== 'All' && metadataCache[selectedReport]) {
        metadataArray = metadataCache[selectedReport].after || [];
      } else {
        // Combine all after metadata from cache
        Object.keys(metadataCache).forEach(report => {
          if (metadataCache[report].after) {
            metadataArray = metadataArray.concat(metadataCache[report].after);
          }
        });
      }
    }
    
    const report = generateMetadataReport(reportName, 'After', metadataArray);
    const filename = `metadata_after_${reportName.toLowerCase().replace(/\s+/g, '_')}_${new Date().getTime()}.csv`;
    downloadCSVFile(report, filename);
  };

  const hasMetadata = () => {
    return metadataCache && Object.keys(metadataCache).length > 0;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h2>📊 Summary & Activity Log</h2>
          <p className="page-subtitle">View user information and operation history</p>
        </div>
        <button 
          className="download-summary-btn"
          onClick={handleDownloadComplete}
          title="Download complete summary report"
        >
          📥 Download Complete Summary
        </button>
      </div>

      {/* Quick Download Operations Section */}
      <div className="summary-section">
        <h3 className="summary-section-title">📥 Download Operation Reports</h3>
        <div className="download-buttons-grid">
          <button 
            className="download-operation-btn"
            onClick={() => handleDownloadOperation('Download', ['download', 'pbix'])}
            disabled={!activityLog || activityLog.length === 0}
          >
            <span className="btn-icon">⬇️</span>
            <span className="btn-label">Download Report</span>
          </button>
          <button 
            className="download-operation-btn"
            onClick={() => handleDownloadOperation('Convert', ['convert', 'pbip'])}
            disabled={!activityLog || activityLog.length === 0}
          >
            <span className="btn-icon">🔄</span>
            <span className="btn-label">Convert Report</span>
          </button>
          <button 
            className="download-operation-btn"
            onClick={() => handleDownloadOperation('Publish', ['publish', 'report'])}
            disabled={!activityLog || activityLog.length === 0}
          >
            <span className="btn-icon">📤</span>
            <span className="btn-label">Publish Report</span>
          </button>
          <button 
            className="download-operation-btn"
            onClick={() => handleDownloadOperation('Refresh', ['refresh', 'dataset'])}
            disabled={!activityLog || activityLog.length === 0}
          >
            <span className="btn-icon">🔁</span>
            <span className="btn-label">Refresh Report</span>
          </button>
          <button 
            className="download-operation-btn"
            onClick={() => handleDownloadOperation('Connection', ['connection', 'update'])}
            disabled={!activityLog || activityLog.length === 0}
          >
            <span className="btn-icon">🔗</span>
            <span className="btn-label">Connection Report</span>
          </button>
          <button 
            className="download-operation-btn"
            onClick={() => handleDownloadOperation('Authentication', ['authentication', 'azure', 'logout'])}
            disabled={!activityLog || activityLog.length === 0}
          >
            <span className="btn-icon">🔐</span>
            <span className="btn-label">Auth Report</span>
          </button>
          <button 
            className="download-operation-btn"
            onClick={handleDownloadBeforeMetadata}
            disabled={!hasMetadata()}
            title="Download metadata before connection changes"
          >
            <span className="btn-icon">📊</span>
            <span className="btn-label">Before Metadata</span>
          </button>
          <button 
            className="download-operation-btn"
            onClick={handleDownloadAfterMetadata}
            disabled={!hasMetadata()}
            title="Download metadata after connection changes"
          >
            <span className="btn-icon">📈</span>
            <span className="btn-label">After Metadata</span>
          </button>
        </div>
      </div>

      {/* User Information Section */}
      <div className="summary-section">
        <h3 className="summary-section-title">👤 User Information</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-card-label">Tenant ID</div>
            <div className="summary-card-value">{tenantId || 'Not configured'}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Client ID</div>
            <div className="summary-card-value">{clientId || 'Not configured'}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Client Secret</div>
            <div className="summary-card-value">{maskSecret(clientId)}</div>
          </div>
        </div>
      </div>

      {/* Workspace Configuration Section */}
      <div className="summary-section">
        <h3 className="summary-section-title">🏢 Workspace Configuration</h3>
        <div className="summary-grid">
          <div className="summary-card">
            <div className="summary-card-label">Source Workspace ID</div>
            <div className="summary-card-value">{sourceWorkspaceId || 'Not set'}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">Target Workspace ID</div>
            <div className="summary-card-value">{targetWorkspaceId || 'Not set'}</div>
          </div>
          <div className="summary-card">
            <div className="summary-card-label">PBIX Folder</div>
            <div className="summary-card-value">{pbixFolder || 'Not set'}</div>
          </div>
        </div>
      </div>

      {/* Completed Steps Section */}
      <div className="summary-section">
        <h3 className="summary-section-title">✔️ Completed Steps</h3>
        <div className="summary-steps">
          <div className={`summary-step ${completedSteps.auth ? 'completed' : ''}`}>
            <span className="summary-step-icon">{completedSteps.auth ? '✅' : '⭕'}</span>
            <span className="summary-step-label">Azure Authentication</span>
          </div>
          <div className={`summary-step ${completedSteps.download ? 'completed' : ''}`}>
            <span className="summary-step-icon">{completedSteps.download ? '✅' : '⭕'}</span>
            <span className="summary-step-label">Download PBIX</span>
          </div>
          <div className={`summary-step ${completedSteps.convert ? 'completed' : ''}`}>
            <span className="summary-step-icon">{completedSteps.convert ? '✅' : '⭕'}</span>
            <span className="summary-step-label">Convert to PBIP</span>
          </div>
          <div className={`summary-step ${completedSteps.publish ? 'completed' : ''}`}>
            <span className="summary-step-icon">{completedSteps.publish ? '✅' : '⭕'}</span>
            <span className="summary-step-label">Publish Reports</span>
          </div>
          <div className={`summary-step ${completedSteps.refresh ? 'completed' : ''}`}>
            <span className="summary-step-icon">{completedSteps.refresh ? '✅' : '⭕'}</span>
            <span className="summary-step-label">Refresh Datasets</span>
          </div>
          <div className={`summary-step ${completedSteps.connection ? 'completed' : ''}`}>
            <span className="summary-step-icon">{completedSteps.connection ? '✅' : '⭕'}</span>
            <span className="summary-step-label">Update Connections</span>
          </div>
        </div>
      </div>

      {/* Activity Log Section */}
      <div className="summary-section">
        <h3 className="summary-section-title">📋 Activity Log</h3>
        {activityLog && activityLog.length > 0 ? (
          <div className="activity-log">
            {activityLog.slice().reverse().map((activity, idx) => (
              <div key={idx} className={`activity-item status-${activity.status}`}>
                <div className="activity-header">
                  <span className="activity-status-icon">{getStatusIcon(activity.status)}</span>
                  <span className="activity-operation">{activity.operation}</span>
                  <span className="activity-timestamp">{activity.timestamp}</span>
                </div>
                <div className="activity-message">{activity.message}</div>
                {activity.details && (
                  <div className="activity-details">{activity.details}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-activity">
            <p>No operations performed yet. Start by configuring Azure AD credentials and running operations.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SummaryPage;
