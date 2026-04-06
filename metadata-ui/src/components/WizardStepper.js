import React from 'react';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepConnector from '@mui/material/StepConnector';
import { styled } from '@mui/material/styles';

const QontoConnector = styled(StepConnector)(({ theme }) => ({
  '& .MuiStepConnector-line': {
    borderColor: '#e0e0e0',
    borderTopWidth: 2,
  },
  '&.Mui-active .MuiStepConnector-line': {
    borderColor: '#2196f3',
  },
  '&.Mui-completed .MuiStepConnector-line': {
    borderColor: '#4caf50',
  },
}));

const QontoStepIconRoot = styled('div')(({ theme, ownerState }) => ({
  color: '#e0e0e0',
  display: 'flex',
  height: 22,
  alignItems: 'center',
  ...(ownerState.active && {
    color: '#2196f3',
  }),
  ...(ownerState.completed && {
    color: '#4caf50',
  }),
}));

function QontoStepIcon(props) {
  const { active, completed, className } = props;

  return (
    <QontoStepIconRoot ownerState={{ active, completed }} className={className}>
      {completed ? (
        <span style={{ fontSize: '18px' }}>✓</span>
      ) : (
        <span style={{ fontSize: '18px' }}>{props.icon}</span>
      )}
    </QontoStepIconRoot>
  );
}

export default function WizardStepper({ steps, activeStep, onStepClick }) {
  return (
    <Stepper
      activeStep={activeStep}
      connector={<QontoConnector />}
      sx={{
        py: 3,
        px: 4,
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}
    >
      {steps.map((label, index) => (
        <Step
          key={label}
          onClick={() => onStepClick(index)}
          sx={{ cursor: 'pointer' }}
        >
          <StepLabel StepIconComponent={QontoStepIcon}>{label}</StepLabel>
        </Step>
      ))}
    </Stepper>
  );
}
