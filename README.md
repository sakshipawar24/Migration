# PBIP Converter & Metadata Viewer

A comprehensive solution for migrating Power BI Projects (PBIP) from SQL Server to Microsoft Fabric/Azure Synapse with an interactive UI for viewing and managing metadata transformations.

## 🎯 Overview

This tool helps you:
- Extract metadata from existing PBIP files
- View before/after comparison of data sources and connections
- Transform SQL Server connections to Microsoft Fabric Lakehouse or Azure Synapse
- Manage M Query transformations and validation

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Activate virtual environment: `.venv\Scripts\Activate.ps1`

### Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install React dependencies
cd metadata-ui
npm install
```

### Running the Application

**Terminal 1 - Start Backend:**
```bash
python app.py
```
Backend: `http://localhost:5000`

**Terminal 2 - Start Frontend:**
```bash
cd metadata-ui
npm start
```
Frontend: `http://localhost:3000`

### One-Command Bootstrap (Windows)

Run this from the project root to install dependencies and start backend/frontend:

```powershell
./scripts/bootstrap.ps1
```

Optional flags:

```powershell
# Skip dependency installation and only start backend/frontend
./scripts/bootstrap.ps1 -NoInstall

# Install dependencies only
./scripts/bootstrap.ps1 -InstallOnly
```

## Tester Documentation

For client-side testing setup and validation steps, see:

- [TECHNICAL_SETUP_FOR_TESTERS.md](TECHNICAL_SETUP_FOR_TESTERS.md)
