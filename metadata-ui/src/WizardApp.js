import React, { useCallback, useEffect, useState } from 'react';
import WizardStepper from './components/WizardStepper';
import Step1Settings from './components/Step1Settings';
import Step2Configuration from './components/Step2Configuration';
import Step3Summary from './components/Step3Summary';
import Step4DetailedForm from './components/Step4DetailedForm';
import Step5Download from './components/Step5Download';
import './styles/WizardSteps.css';
import * as XLSX from 'xlsx';

const WIZARD_STORAGE_KEY = 'pbip-wizard-state-v1';
const DEFAULT_COMPLEXITY_MATRIX = {
  connection: { low: '2', medium: '2+', high: '5+' },
  table: { low: '20', medium: '20+', high: '40+' },
  sqlQueries: { low: '10', medium: '10+', high: '25+' }
};

const STEPS = [
  'Settings',
  'Configuration',
  'Summary',
  'Details',
  'Download'
];

export default function WizardApp() {
  const [activeStep, setActiveStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  // Auth State
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [pbipFolder, setPbipFolder] = useState('D:\\PBIP');

  // Configuration State
  const [changeConnectionReport, setChangeConnectionReport] = useState('');
  const [autoServer, setAutoServer] = useState('');
  const [autoDatabase, setAutoDatabase] = useState('');
  const [autoTargetTechnology, setAutoTargetTechnology] = useState('Keep Same');
  const [autoWorkspaceId, setAutoWorkspaceId] = useState('');
  const [autoLakehouseId, setAutoLakehouseId] = useState('');
  const [changeConnectionOptions, setChangeConnectionOptions] = useState([]);

  // Metadata State
  const [metadata, setMetadata] = useState([]);
  const [metadataCache, setMetadataCache] = useState({});
  const [complexityMatrix, setComplexityMatrix] = useState(DEFAULT_COMPLEXITY_MATRIX);
  const [busyAction, setBusyAction] = useState(null);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(WIZARD_STORAGE_KEY);
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        setTenantId(state.tenantId || '');
        setClientId(state.clientId || '');
        setClientSecret(state.clientSecret || '');
        setPbipFolder(state.pbipFolder || 'D:\\PBIP');
        setChangeConnectionReport(state.changeConnectionReport || '');
        setAutoServer(state.autoServer || '');
        setAutoDatabase(state.autoDatabase || '');
        setAutoTargetTechnology(state.autoTargetTechnology || 'Keep Same');
        setAutoWorkspaceId(state.autoWorkspaceId || '');
        setAutoLakehouseId(state.autoLakehouseId || '');
        setComplexityMatrix(state.complexityMatrix || DEFAULT_COMPLEXITY_MATRIX);
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state = {
      activeStep,
      tenantId,
      clientId,
      clientSecret,
      pbipFolder,
      changeConnectionReport,
      autoServer,
      autoDatabase,
      autoTargetTechnology,
      autoWorkspaceId,
      autoLakehouseId,
      complexityMatrix
    };
    localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
  }, [
    activeStep,
    tenantId,
    clientId,
    clientSecret,
    pbipFolder,
    changeConnectionReport,
    autoServer,
    autoDatabase,
    autoTargetTechnology,
    autoWorkspaceId,
    autoLakehouseId,
    complexityMatrix
  ]);

  // Load available reports
  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/pbi/list-pbix?pbipFolder=${encodeURIComponent(pbipFolder)}`);
        const data = await response.json();
        if (data.success && data.available_reports) {
          setChangeConnectionOptions(data.available_reports);
        }
      } catch (error) {
        console.error('Failed to load reports:', error);
      }
    };

    if (pbipFolder && activeStep >= 1) {
      loadReports();
    }
  }, [pbipFolder, activeStep]);

  // Load metadata for selected report
  useEffect(() => {
    const loadMetadata = async () => {
      if (!changeConnectionReport) return;

      setBusyAction('loading-metadata');
      try {
        const response = await fetch('http://localhost:5000/api/pbi/extract-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportName: changeConnectionReport,
            pbipFolder: pbipFolder
          })
        });

        const data = await response.json();
        if (data.success) {
          const allMetadata = [...(data.before || []), ...(data.after || [])];
          setMetadata(allMetadata);
        } else {
          showStatus(`Error loading metadata: ${data.error}`, 'error');
        }
      } catch (error) {
        showStatus(`Failed to load metadata: ${error.message}`, 'error');
      } finally {
        setBusyAction(null);
      }
    };

    if (activeStep >= 3) {
      loadMetadata();
    }
  }, [changeConnectionReport, activeStep, pbipFolder]);

  const showStatus = useCallback((text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 5000);
  }, []);

  const saveAuthConfig = useCallback(async () => {
    setBusyAction('saving-config');
    try {
      const response = await fetch('http://localhost:5000/api/pbi/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          clientId,
          clientSecret,
          pbixFolder: pbipFolder
        })
      });

      const data = await response.json();
      if (data.success) {
        showStatus('✓ Configuration saved successfully!', 'success');
      } else {
        showStatus(`Error: ${data.error}`, 'error');
        throw new Error(data.error);
      }
    } catch (error) {
      showStatus(`Failed to save config: ${error.message}`, 'error');
      throw error;
    } finally {
      setBusyAction(null);
    }
  }, [tenantId, clientId, clientSecret, pbipFolder, showStatus]);

  const handleNextStep = () => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(activeStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepIndex) => {
    // Only allow jumping to previous steps or the next step
    if (stepIndex <= activeStep || stepIndex === activeStep + 1) {
      setActiveStep(stepIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleComplexityMatrixChange = (objectKey, level, value) => {
    setComplexityMatrix(prev => ({
      ...prev,
      [objectKey]: {
        ...prev[objectKey],
        [level]: value
      }
    }));
  };

  // Render current step
  const renderCurrentStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <Step1Settings
            tenantId={tenantId}
            setTenantId={setTenantId}
            clientId={clientId}
            setClientId={setClientId}
            clientSecret={clientSecret}
            setClientSecret={setClientSecret}
            pbipFolder={pbipFolder}
            setPbipFolder={setPbipFolder}
            onNext={handleNextStep}
            showStatus={showStatus}
            saveAuthConfig={saveAuthConfig}
            busyAction={busyAction}
          />
        );

      case 1:
        return (
          <Step2Configuration
            changeConnectionReport={changeConnectionReport}
            setChangeConnectionReport={setChangeConnectionReport}
            autoServer={autoServer}
            setAutoServer={setAutoServer}
            autoDatabase={autoDatabase}
            setAutoDatabase={setAutoDatabase}
            autoTargetTechnology={autoTargetTechnology}
            setAutoTargetTechnology={setAutoTargetTechnology}
            autoWorkspaceId={autoWorkspaceId}
            setAutoWorkspaceId={setAutoWorkspaceId}
            autoLakehouseId={autoLakehouseId}
            setAutoLakehouseId={setAutoLakehouseId}
            changeConnectionOptions={changeConnectionOptions}
            onNext={handleNextStep}
            onBack={handlePrevStep}
            busyAction={busyAction}
          />
        );

      case 2:
        return (
          <Step3Summary
            tenantId={tenantId}
            clientId={clientId}
            pbipFolder={pbipFolder}
            changeConnectionReport={changeConnectionReport}
            autoServer={autoServer}
            autoDatabase={autoDatabase}
            autoTargetTechnology={autoTargetTechnology}
            autoWorkspaceId={autoWorkspaceId}
            autoLakehouseId={autoLakehouseId}
            onNext={handleNextStep}
            onBack={handlePrevStep}
            busyAction={busyAction}
          />
        );

      case 3:
        return (
          <Step4DetailedForm
            metadata={metadata}
            metadataCache={metadataCache}
            complexityMatrix={complexityMatrix}
            onComplexityMatrixChange={handleComplexityMatrixChange}
            onNext={handleNextStep}
            onBack={handlePrevStep}
            busyAction={busyAction}
          />
        );

      case 4:
        return (
          <Step5Download
            metadata={metadata}
            changeConnectionReport={changeConnectionReport}
            autoServer={autoServer}
            autoDatabase={autoDatabase}
            autoTargetTechnology={autoTargetTechnology}
            autoWorkspaceId={autoWorkspaceId}
            autoLakehouseId={autoLakehouseId}
            complexityMatrix={complexityMatrix}
            onBack={handlePrevStep}
            busyAction={busyAction}
            showStatus={showStatus}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="wizard-container">
      <div className="wizard-wrapper">
        {/* Status Message */}
        {statusMessage.text && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              borderRadius: '8px',
              backgroundColor: statusMessage.type === 'error' ? '#ffebee' : '#e8f5e9',
              color: statusMessage.type === 'error' ? '#c62828' : '#2e7d32',
              border: `2px solid ${statusMessage.type === 'error' ? '#ef5350' : '#4caf50'}`,
              animation: 'slideIn 0.3s ease-out'
            }}
          >
            {statusMessage.text}
          </div>
        )}

        {/* Wizard Stepper */}
        <div className="wizard-stepper">
          <WizardStepper
            steps={STEPS}
            activeStep={activeStep}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step Content */}
        {renderCurrentStep()}
      </div>
    </div>
  );
}
