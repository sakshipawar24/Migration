import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import '../styles/WizardSteps.css';

export default function Step5Download({
  metadata,
  changeConnectionReport,
  autoServer, autoDatabase, autoTargetTechnology,
  autoWorkspaceId, autoLakehouseId,
  complexityMatrix,
  onBack,
  busyAction,
  showStatus
}) {
  const [downloadFormat, setDownloadFormat] = useState('xlsx');
  const [isDownloading, setIsDownloading] = useState(false);

  const generateSummaryData = () => {
    return {
      config: {
        Report: changeConnectionReport,
        'New Server': autoServer,
        'New Database': autoDatabase,
        'Target Technology': autoTargetTechnology,
        'Workspace ID': autoWorkspaceId,
        'Lakehouse ID': autoLakehouseId,
        'Generated': new Date().toISOString(),
      },
      metadata: metadata || [],
      complexityThresholds: complexityMatrix,
    };
  };

  const handleDownloadExcel = () => {
    setIsDownloading(true);
    try {
      const summary = generateSummaryData();
      const wb = XLSX.utils.book_new();

      // Configuration Sheet
      const configData = Object.entries(summary.config).map(([key, value]) => ({
        'Setting': key,
        'Value': value,
      }));
      const configSheet = XLSX.utils.json_to_sheet(configData);
      XLSX.utils.book_append_sheet(wb, configSheet, 'Configuration');

      // Metadata Sheet
      if (summary.metadata.length > 0) {
        const metadataSheet = XLSX.utils.json_to_sheet(summary.metadata);
        XLSX.utils.book_append_sheet(wb, metadataSheet, 'Metadata');
      }

      // Complexity Matrix Sheet
      const complexityData = Object.entries(summary.complexityThresholds).map(([metric, thresholds]) => ({
        'Metric': metric.charAt(0).toUpperCase() + metric.slice(1),
        'Low': thresholds.low,
        'Medium': thresholds.medium,
        'High': thresholds.high,
      }));
      const complexitySheet = XLSX.utils.json_to_sheet(complexityData);
      XLSX.utils.book_append_sheet(wb, complexitySheet, 'Complexity Matrix');

      // Save file
      const fileName = `PBIP-Migration-Report-${new Date().getTime()}.xlsx`;
      XLSX.writeFile(wb, fileName);

      showStatus('✓ Excel file downloaded successfully!', 'success');
      setIsDownloading(false);
    } catch (error) {
      showStatus(`❌ Error generating Excel: ${error.message}`, 'error');
      setIsDownloading(false);
    }
  };

  const handleDownloadCSV = () => {
    setIsDownloading(true);
    try {
      const summary = generateSummaryData();
      
      // Combine all data into CSV
      let csvContent = 'PBIP MIGRATION REPORT\n';
      csvContent += `Generated: ${new Date().toISOString()}\n\n`;

      csvContent += '=== CONFIGURATION ===\n';
      Object.entries(summary.config).forEach(([key, value]) => {
        csvContent += `${key},${value}\n`;
      });

      csvContent += '\n=== COMPLEXITY MATRIX ===\n';
      csvContent += 'Metric,Low,Medium,High\n';
      Object.entries(summary.complexityThresholds).forEach(([metric, thresholds]) => {
        csvContent += `${metric},${thresholds.low},${thresholds.medium},${thresholds.high}\n`;
      });

      if (summary.metadata.length > 0) {
        csvContent += '\n=== METADATA ===\n';
        const headers = Object.keys(summary.metadata[0]);
        csvContent += headers.join(',') + '\n';
        summary.metadata.forEach((row) => {
          csvContent += headers.map(h => `"${row[h] || ''}"`).join(',') + '\n';
        });
      }

      // Save to backend
      const response = fetch('http://localhost:5000/api/save-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: csvContent,
          filename: `PBIP-Migration-Report-${new Date().getTime()}.csv`
        })
      });

      response.then(res => res.json()).then(result => {
        if (result.success) {
          showStatus(`✓ CSV file saved: ${result.filePath}`, 'success');
        } else {
          showStatus(`❌ Error: ${result.error}`, 'error');
        }
        setIsDownloading(false);
      });
    } catch (error) {
      showStatus(`❌ Error generating CSV: ${error.message}`, 'error');
      setIsDownloading(false);
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="wizard-step">
      <div className="step-header">
        <h2>Step 5: Download Report</h2>
        <p>Generate and download your migration report</p>
      </div>

      <div className="download-content">
        <div className="download-box success-box">
          <div className="box-icon">✅</div>
          <div className="box-content">
            <h3>Configuration Complete!</h3>
            <p>All settings have been configured successfully. Download your migration report in your preferred format.</p>
          </div>
        </div>

        <div className="download-options">
          <h3>📥 Download Report As:</h3>
          
          <div className="download-buttons">
            <button
              type="button"
              className="btn btn-download btn-excel"
              onClick={handleDownloadExcel}
              disabled={isDownloading || busyAction !== null}
            >
              <span className="btn-icon">📊</span>
              {isDownloading ? 'Generating...' : 'Excel File (.xlsx)'}
            </button>

            <button
              type="button"
              className="btn btn-download btn-csv"
              onClick={handleDownloadCSV}
              disabled={isDownloading || busyAction !== null}
            >
              <span className="btn-icon">📄</span>
              {isDownloading ? 'Generating...' : 'CSV File (.csv)'}
            </button>
          </div>
        </div>

        <div className="summary-box">
          <h3>📋 Report Preview</h3>
          <div className="report-preview">
            <div className="preview-item">
              <span className="preview-label">Report:</span>
              <span className="preview-value">{changeConnectionReport}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Target Technology:</span>
              <span className="preview-value">{autoTargetTechnology}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Metadata Rows:</span>
              <span className="preview-value">{metadata?.length || 0}</span>
            </div>
            <div className="preview-item">
              <span className="preview-label">Generated:</span>
              <span className="preview-value">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="next-steps">
          <h3>🎯 Next Steps</h3>
          <ol>
            <li>Review the downloaded report for accuracy</li>
            <li>Share the report with your migration team</li>
            <li>Use the settings for actual data transformation</li>
            <li>Monitor the migration process</li>
          </ol>
        </div>
      </div>

      <div className="step-actions">
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          ← Back to Detailed Form
        </button>
        <button
          type="button"
          className="btn btn-success"
          onClick={handleRestart}
        >
          🚀 Complete & Start Over
        </button>
      </div>
    </div>
  );
}
