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

## 📋 How to Use

### Step 1: Upload PBIP Project
1. Enter your **Workspace Name** (e.g., "Migration")
2. Select **Target System** (Microsoft Fabric, Azure Synapse, or Databricks)
3. Choose your PBIP project folder (44+ files)
4. Project will load and show project info

### Step 2: Extract BEFORE Metadata
- Click **"Convert PBIP"** button
- Displays original metadata with SQL Server connections:
  - **Server (Before)**: `dta-eun-prod-sqlsrv-synapse-01.database.windows.net`
  - **Database (Before)**: `dta-eun-prod-datawarehouse-synapse-01`
- Shows connection types, sources, and M Query previews

### Step 3: Configure Target Connection
- **Server Name**: Enter your target server/workspace endpoint
  - *For Fabric*: `fabric_server` or your Fabric Workspace ID
  - *For Synapse*: `synapse-workspace.dev.azuresynapse.net`
  - *For Databricks*: Your Databricks workspace URL
  
- **Database Name**: Enter target lakehouse/database
  - *For Fabric*: `fabric_lakehouse` or your Lakehouse name
  - *For Synapse*: Target database name
  - *For Databricks*: Target catalog.schema

- **Workspace/Lakehouse ID** (for Fabric):
  - Workspace ID: Your Fabric workspace ID
  - Lakehouse ID: Your Lakehouse ID

### Step 4: Apply Changes
- Click **"Change Connection & SQL"** button
- System will:
  - Replace all connection strings
  - Update M Queries to use new endpoints
  - Generate AFTER metadata showing transformed state

### Step 5: Review Results
- **BEFORE Table**: Shows original SQL Server configuration
  - Connection Type (Before/After)
  - Server (Before/After)
  - Database (Before/After)
  - M Query Preview

- **AFTER Table**: Shows new Fabric/Synapse configuration
  - Mode: DirectQuery
  - Source: Fabric Lakehouse
  - Updated connection details

## 📊 Data Files

### CSV Metadata Files
- **pbip_before_metadata.csv**: Original PBIP metadata from SQL Server
  - Used for initial analysis and comparison
  - Contains actual production server/database references
  
- **pbip_after_metadata.csv**: Transformed metadata after migration
  - Shows target system configuration
  - Updated connection strings and M Queries

### Required Server/Database Values

| Target System | Server Example | Database Example | Notes |
|---|---|---|---|
| **Fabric** | `workspace-id` | `lakehouse-id` | Use Workspace ID and Lakehouse ID |
| **Synapse** | `synapse.dev.azuresynapse.net` | `dw-database` | Azure Synapse endpoint |
| **Databricks** | `workspace-url` | `catalog.schema` | Databricks workspace URL |
| **SQL Server** | `sqlserver.database.windows.net` | `database-name` | Keep original or point to new server |

## 🏗️ Project Structure

```
├── app.py                          # Flask backend
├── metadata-ui/                    # React frontend
│   ├── src/
│   │   ├── App.js                 # Main component
│   │   ├── components/
│   │   │   ├── FileUpload.js       # Project upload form
│   │   │   ├── ProcessButtons.js   # Action buttons
│   │   │   ├── MetadataTable.js    # Before/After data table
│   │   │   └── StatsCards.js       # Statistics dashboard
│   │   └── App.css                 # Styling
│   └── package.json
├── metadatacollection.py           # Extract PBIP metadata
├── changetech.py                   # Transform to Fabric/Synapse
├── dummyreplacement.py             # Replace dummy values
├── connection.py                   # Connection management
├── pbip_before_metadata.csv        # Original metadata
├── pbip_after_metadata.csv         # Transformed metadata
└── requirements.txt
```

## 🔄 Transformation Process

1. **Extract**: Read PBIP .tmdl files and extract M Query definitions
2. **Parse**: Identify data sources, connections, and query modes
3. **Transform**: Replace SQL Server connections with target system details
4. **Update**: Modify M Query syntax for new platform
5. **Generate**: Create updated PBIP with new connections

## 📈 UI Features

### BEFORE Metadata Table (11 columns)
- Type, Name
- Before/After Query Mode (DirectQuery/Import)
- Before/After Source (SQL Server/Fabric Lakehouse)
- Connection Type (Before/After)
- Server (Before): Original SQL Server endpoint
- Server (After): Target system endpoint (dummy_server default)
- Database (Before): Original database name
- Database (After): Target database/lakehouse name
- M Query Preview with full view modal

### AFTER Metadata Table (6 columns)
- Type, Name
- Query Mode (always DirectQuery for Fabric)
- Source (Fabric Lakehouse)
- Connection Type
- Server, Database, M Query Preview

### Statistics Dashboard
- **Total Tables**: Count of all tables being migrated
- **Connection Types**: Breakdown of connector types used

## 🛠️ Supported Operations

✅ Extract PBIP metadata  
✅ SQL Server → Microsoft Fabric conversion  
✅ SQL Server → Azure Synapse conversion  
✅ SQL Server → Databricks conversion  
✅ Batch replace connection strings  
✅ M Query transformation  
✅ Metadata export to CSV  
✅ Visual before/after comparison  

## 🔐 Default Values

If no custom values provided:
- **Server**: `dummy_server`
- **Database**: `dummy_database`
- **Workspace ID**: `dummy_workspace_id`
- **Lakehouse ID**: `dummy_lakehouse_id`

## ⚠️ Important Notes

1. **Backup**: Always backup your PBIP project before running transformations
2. **Testing**: Test with a sample PBIP first before production migration
3. **Connections**: Ensure target system credentials are valid before migration
4. **Permissions**: You need admin access to both source and target systems
5. **Data Sources**: Verify all M Queries work with new connection endpoints

## 🐛 Troubleshooting

**Issue**: "No metadata found"
- Solution: Ensure PBIP folder is uploaded correctly with all files

**Issue**: Connection error during transformation
- Solution: Verify server name/database name and network connectivity

**Issue**: M Query errors after transformation
- Solution: Review query syntax for platform-specific functions and update manually if needed

## 📞 Support

For issues or questions about the transformation process, review:
- The BEFORE/AFTER metadata comparison tables
- M Query previews showing actual transformation results
- Log messages in the browser console (Ctrl+Shift+K)
- Filter by connection type
- Click on M Query previews to view full queries

## Technology Stack

**Backend:** Flask, Flask-CORS
**Frontend:** React 18, Axios
