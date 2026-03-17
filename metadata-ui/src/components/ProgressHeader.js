import React from 'react';
import '../styles/ProgressHeader.css';

function ProgressHeader({ completedSteps, stepMessages }) {
  const steps = [
    { key: 'auth', number: 1, label: 'Azure Auth' },
    { key: 'download', number: 2, label: 'Download PBIX' },
    { key: 'convert', number: 3, label: 'Convert PBIP' },
    { key: 'connection', number: 4, label: 'Update Connection' },
    { key: 'publish', number: 5, label: 'Publish' },
    { key: 'refresh', number: 6, label: 'Refresh' }
  ];

  return (
    <div className="progress-header">
      <div className="progress-header-content">
        <h1 className="progress-title">PBIP Converter & Metadata Viewer</h1>
        <p className="progress-subtitle">UI-Driven Power BI Project Processing</p>
        <div className="progress-steps">
          {steps.map((step, index) => (
            <React.Fragment key={step.key}>
              <div className={`progress-step ${completedSteps[step.key] ? 'completed' : ''}`}>
                <div className="step-circle">
                  <span className="step-number">{step.number}</span>
                </div>
                <div className="step-info">
                  <span className="step-label">{step.label}</span>
                  {stepMessages && stepMessages[step.key] && (
                    <span className="step-status">{stepMessages[step.key]}</span>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && <div className="step-connector" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProgressHeader;
