# WIZARD UI REDESIGN - IMPLEMENTATION GUIDE

## Overview

The PBIP Converter application has been redesigned with a **step-based wizard flow** replacing the previous tab-based navigation. The new UI is cleaner, more intuitive, and guides users through a 5-step process.

## 🎯 New Wizard Architecture

### 5-Step Flow

```
Step 1: Settings
   ↓ (After Auth)
Step 2: Configuration  
   ↓ (Select Report & Connection Details)
Step 3: Summary
   ↓ (Review All Inputs - Read Only)
Step 4: Detailed Form
   ↓ (Metadata Review & Complexity Matrix)
Step 5: Download
   ↓ (Generate & Download Report)
```

### Key Features

✅ **Clickable Stepper**: Click any completed step to jump back  
✅ **Progressive Disclosure**: Only current step visible at a time  
✅ **State Persistence**: All inputs saved to localStorage automatically  
✅ **Clean Layout**: Centered card-based UI with minimal distractions  
✅ **Responsive Design**: Works on desktop, tablet, and mobile  
✅ **Advanced Complexity Configuration**: Edit thresholds in a matrix format  
✅ **Multiple Export Formats**: Download as Excel (.xlsx) or CSV (.csv)  

## 📁 New Components & Files

### Components Added

```
src/components/
├── WizardStepper.js          # Material-UI stepper with custom styling
├── Step1Settings.js          # Auth & PBIP folder configuration
├── Step2Configuration.js     # Report selection & connection details
├── Step3Summary.js           # Review-only summary of all settings
├── Step4DetailedForm.js      # Metadata table & complexity matrix
└── Step5Download.js          # Report generation & download
```

### Styles Added

```
src/styles/
└── WizardSteps.css           # Comprehensive wizard styling (600+ lines)
```

### Main Application File

```
src/WizardApp.js             # Main wizard orchestrator (state management, step logic)
```

## 🚀 Installation & Setup

### Step 1: Install Dependencies

```bash
cd metadata-ui
npm install
```

The new Material-UI dependencies have been added to `package.json`:
- `@mui/material`: Component library
- `@mui/icons-material`: Icon library
- `@emotion/react` & `@emotion/styled`: Styling engine

### Step 2: Switch to Wizard UI

**Option A: Replace Current App (Recommended)**

Update `src/index.js`:

```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import WizardApp from './WizardApp';  // ← Change this line

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <WizardApp />  {/* ← Change this line */}
  </React.StrictMode>
);
```

**Option B: Keep Both (Toggle via URL)**

Update `src/index.js`:

```javascript
import App from './App';
import WizardApp from './WizardApp';

const useWizard = new URLSearchParams(window.location.search).get('wizard') === 'true';
const Component = useWizard ? WizardApp : App;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Component />
  </React.StrictMode>
);
```

Then access:
- Default UI: `http://localhost:3000`
- Wizard UI: `http://localhost:3000?wizard=true`

### Step 3: Start the Application

```bash
# Terminal 1 - Backend
python app.py

# Terminal 2 - Frontend
cd metadata-ui
npm start
```

Application opens at `http://localhost:3000`

## 📋 Step-by-Step User Flow

### **Step 1: Initial Settings**

Users configure:
- **Tenant ID**: Azure AD tenant
- **Client ID**: Service principal client ID
- **Client Secret**: Service principal secret (masked password field)
- **PBIP Folder**: Path to Power BI projects

**Validation**: All 4 fields required before proceeding.

### **Step 2: Configuration**

Users select and configure:
- **Report**: Dropdown of available reports from PBIP folder
- **Server**: New SQL server hostname
- **Database**: New database name
- **Target Technology**: Keep Same | SQL Server | Fabric Lakehouse | Azure Synapse
- **Workspace ID**: Fabric workspace identifier
- **Lakehouse ID**: Fabric lakehouse identifier

### **Step 3: Summary (Read-Only)**

Clean review of all previous inputs organized in boxes:
- 🔐 Authentication settings (masked secrets)
- 📊 Report configuration
- 🔌 Connection details

Users verify everything is correct before proceeding.

### **Step 4: Detailed Configuration**

Users see:
- **Metadata Preview Table**: First 5 rows of metadata with columns: Report, Table Name, Source, Connections, Queries
- **Complexity Matrix**: 3×3 grid for configuring thresholds:
  - Rows: Connections, Tables, SQL Queries
  - Columns: Low, Medium, High
  - Values: Number or number+ (e.g., "2", "5+", "40+")

**Example Matrix Default**:
```
            Low    Medium   High
Connections:  2      2+      5+
Tables:      20     20+     40+
SQL Queries: 10     10+     25+
```

### **Step 5: Download Report**

Users can download formatted migration report in:
- **Excel (.xlsx)**: 3 sheets (Configuration, Metadata, Complexity Matrix)
- **CSV (.csv)**: All data in one file, saved to backend folder

Includes:
- Report preview with key metadata
- Download buttons
- Next steps guide
- "Complete & Start Over" button

## 🎨 UI/UX Design Features

### Visual Hierarchy

- **Gradient Background**: Purple gradient creates visual separation
- **White Cards**: Clean whitespace for content focus
- **Color Coding**: Blue (primary), Green (success), Red (error), Purple (info)
- **Icons**: Visual indicators for each section (🔐, 📊, 🔌, etc.)

### Responsive Breakpoints

- **Desktop** (> 768px): 2-column forms where applicable
- **Tablet** (768px-480px): 1-column forms, full-width buttons
- **Mobile** (< 480px): Compact spacing, simplified matrix

### Accessibility

- Clear label hierarchies
- Form validation feedback
- Disabled state clarity
- Semantic HTML
- Focus states on form elements

## 💾 State Management

### localStorage Persistence

All wizard state is automatically saved to localStorage under `pbip-wizard-state-v1`:

```javascript
{
  activeStep: number,
  tenantId: string,
  clientId: string,
  clientSecret: string,
  pbipFolder: string,
  changeConnectionReport: string,
  autoServer: string,
  autoDatabase: string,
  autoTargetTechnology: string,
  autoWorkspaceId: string,
  autoLakehouseId: string,
  complexityMatrix: object
}
```

**Behavior**: 
- Saves after every change
- Loads on app startup
- Persists across browser sessions
- Users can manually clear via browser DevTools

### Backend Integration

The wizard interfaces with backend APIs:

- `POST /api/pbi/config` - Save auth configuration
- `GET /api/pbi/list-pbix` - Get list of reports
- `POST /api/pbi/extract-metadata` - Load metadata for selected report
- `POST /api/save-report` - Save generated report to backend

## 🔧 Customization Guide

### Changing Colors

Edit `src/styles/WizardSteps.css`:

```css
/* Primary colors */
.btn-primary { background: linear-gradient(135deg, #2196f3, #1976d2); }

/* Success colors */
.btn-success { background: linear-gradient(135deg, #4caf50, #388e3c); }

/* Backgrounds */
.wizard-container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
```

### Customizing Complexity Matrix

Edit `src/WizardApp.js`:

```javascript
const DEFAULT_COMPLEXITY_MATRIX = {
  connection: { low: '2', medium: '2+', high: '5+' },
  table: { low: '20', medium: '20+', high: '40+' },
  sqlQueries: { low: '10', medium: '10+', high: '25+' }
};
```

### Adding/Removing Steps

Edit `src/WizardApp.js`:

```javascript
const STEPS = [
  'Settings',
  'Configuration',
  'Summary',
  'Details',
  'Download',
  // 'Extra Step' // Add here
];

// Add new case in renderCurrentStep()
```

### Changing Step Names

Edit `src/WizardApp.js`:

```javascript
const STEPS = [
  'Auth Setup',      // was Settings
  'Target Config',   // was Configuration
  // ... etc
];
```

## 🧪 Testing the Wizard

### Test Scenario 1: Complete Happy Path

1. Enter all Step 1 fields
2. Proceed to Step 2
3. Select report and enter connection details
4. Review Step 3 summary
5. Explore complexity matrix in Step 4
6. Download report from Step 5

### Test Scenario 2: Step Navigation

1. Complete Step 1
2. Go to Step 2
3. Click "Back to Step 1" → should return to Step 1
4. Go forward again
5. Click on "Summary" in stepper → should jump to Step 3

### Test Scenario 3: State Persistence

1. Complete Step 1
2. Reload page (F5)
3. Verify all Step 1 data still present
4. Go to Step 2 and verify Step 1 data is remembered
5. Complete wizard, reload, verify state persists

### Test Scenario 4: Responsive Design

1. Open on desktop → 2-column forms
2. Resize to tablet → 1-column forms
3. Resize to mobile → compact layout

## 🐛 Troubleshooting

### Issue: Material-UI components not rendering

**Solution**: Ensure npm install completed:
```bash
cd metadata-ui
npm install @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### Issue: Wizard not showing in browser

**Solution**: Check if index.js is importing WizardApp:
```javascript
import WizardApp from './WizardApp';  // Should be here
```

### Issue: Back button doesn't work

**Solution**: WizardApp only allows navigation backward to completed steps. Forward navigation is only one step at a time.

### Issue: Data not saving

**Solution**: Check browser console for localStorage errors. Verify backend APIs are running:
```bash
python app.py  # Should show "Backend running on http://localhost:5000"
```

## 📊 File Structure After Changes

```
metadata-ui/
├── src/
│   ├── components/
│   │   ├── WizardStepper.js       ✨ NEW
│   │   ├── Step1Settings.js       ✨ NEW
│   │   ├── Step2Configuration.js  ✨ NEW
│   │   ├── Step3Summary.js        ✨ NEW
│   │   ├── Step4DetailedForm.js   ✨ NEW
│   │   ├── Step5Download.js       ✨ NEW
│   │   └── ... (keep existing)
│   ├── styles/
│   │   ├── WizardSteps.css        ✨ NEW
│   │   └── ... (keep existing)
│   ├── WizardApp.js               ✨ NEW
│   ├── App.js                     (keep for fallback)
│   ├── index.js                   📝 MODIFY to use WizardApp
│   └── ... (keep existing)
├── package.json                   📝 MODIFIED (added @mui packages)
└── ... (keep existing)
```

## 🔄 Migration Path

**Existing Users**: If you have an existing App.js, you can:

1. Keep both components
2. Use URL parameter to switch: `?wizard=true`
3. Gradually migrate to WizardApp
4. Eventually retire old App.js

**Fresh Installation**: Use WizardApp directly as the main component.

## 📝 Notes

- WizardApp is self-contained with all state management
- All components are functional (hooks-based)
- CSS is organized in one file for easy customization
- No external dependencies beyond Material-UI and existing packages
- Backward compatible with existing backend APIs
- LocalStorage capacity: ~5MB per domain (plenty for this app)

## ✨ Future Enhancements

Suggestions for future improvements:

1. **Dark Mode**: Add theme toggle
2. **Form Validation**: Real-time validation feedback
3. **Undo/Redo**: Step back without losing data
4. **PDF Export**: Generate PDF report instead of just Excel/CSV
5. **Report Templates**: Choose from pre-defined report formats
6. **Progress Indicator**: Show % complete at top
7. **Help Documentation**: Tooltips for complex fields
8. **Multi-Language**: i18n support
9. **API Integration**: Trigger actual migration from Step 5
10. **Workflow History**: Track completed migrations

---

**Version**: 1.0  
**Created**: April 2026  
**Last Updated**: April 2026
