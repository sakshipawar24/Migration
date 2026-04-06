import React from 'react';

export default function WizardStepper({ steps, activeStep, onStepClick }) {
  return (
    <nav className="wizard-stepper-nav" aria-label="Wizard steps">
      {steps.map((label, index) => {
        const isActive = index === activeStep;
        const isCompleted = index < activeStep;

        return (
          <React.Fragment key={label}>
            <button
              type="button"
              className={`wizard-stepper-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
              onClick={() => onStepClick(index)}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="wizard-stepper-badge">
                {isCompleted ? '✓' : index + 1}
              </span>
              <span className="wizard-stepper-label">{label}</span>
            </button>
            {index < steps.length - 1 && (
              <div className={`wizard-stepper-connector ${index < activeStep ? 'completed' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
