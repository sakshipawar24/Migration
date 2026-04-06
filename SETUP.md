# SETUP GUIDE - Configuration

This guide explains how to configure your server and database values for the PBIP migration tool.

## 🔧 Configuration Overview

When using the UI, you'll need to provide connection details for your target system. Below are the values you should use based on your target platform.

## 📍 Current Production Values (BEFORE)

Your existing PBIP is currently connected to:
- **Server**: `dta-eun-prod-sqlsrv-synapse-01.database.windows.net`
- **Database**: `dta-eun-prod-datawarehouse-synapse-01`
- **Connection Type**: SQL Server (Sql.Database)

These values are shown in the BEFORE column of the metadata table.

## 🎯 Target System Configuration (AFTER)

Choose your migration target and enter the corresponding values:

### Option 1: Microsoft Fabric (Recommended)

**Workspace Setup:**
- Go to `https://app.fabric.microsoft.com`
- Copy your Workspace ID from the workspace settings
- Go to your Lakehouse and copy its ID

**Configuration Fields:**
- **Server**: Your Workspace ID (e.g., `workspace-123abc`)
  - Can also use: `fabric_server` as placeholder
- **Database**: Your Lakehouse name (e.g., `fabric_lakehouse`)
  - Can also use: `fabric_lakehouse` as default

**Workspace ID Field**: Your actual Workspace ID
**Lakehouse ID Field**: Your actual Lakehouse ID

**In the Tool:**
```
Server: fabric_server                    (or your workspace ID)
Database: fabric_lakehouse               (or your lakehouse name)
Workspace ID: <your-workspace-id>
Lakehouse ID: <your-lakehouse-id>
```

### Option 2: Azure Synapse

**Workspace Setup:**
- Go to `https://web.azuresynapseanalytics.net`
- Create or use existing dedicated SQL pool
- Get your workspace URL: `https://<workspace>.dev.azuresynapse.net`

**Configuration Fields:**
- **Server**: `<workspace>.dev.azuresynapse.net`
  - Example: `my-synapse.dev.azuresynapse.net`
- **Database**: Your dedicated SQL pool name
  - Example: `dw-warehouse`

**In the Tool:**
```
Server: my-synapse.dev.azuresynapse.net
Database: dw-warehouse
Workspace ID: (leave as dummy_workspace_id)
Lakehouse ID: (leave as dummy_lakehouse_id)
```

### Option 3: Databricks

**Workspace Setup:**
- Go to your Databricks workspace
- Enable SQL warehouses feature
- Get workspace URL: `https://<region>.cloud.databricks.com`

**Configuration Fields:**
- **Server**: Your Databricks workspace URL
  - Example: `https://adb-123456789.cloud.databricks.com`
- **Database**: Your catalog and schema
  - Example: `main.default` or `my-catalog.my-schema`

**In the Tool:**
```
Server: https://adb-123456789.cloud.databricks.com
Database: main.default
Workspace ID: (leave as dummy_workspace_id)
Lakehouse ID: (leave as dummy_lakehouse_id)
```

## 📋 Step-by-Step: Entering Values in the UI

1. **Start Application**
   - Open `http://localhost:3000`

2. **Upload PBIP**
   - Workspace Name: `Migration`
   - Target System: Choose your platform
   - Select your PBIP folder

3. **Click "Convert PBIP"**
   - This shows the BEFORE metadata with current values

4. **Enter Connection Settings**
   - **Server**: Paste your target server address
   - **Database**: Enter target database/lakehouse name
   - **Workspace ID** (Fabric only): Your Workspace ID
   - **Lakehouse ID** (Fabric only): Your Lakehouse ID

5. **Click "Change Connection & SQL"**
   - System transforms all connections
   - Shows AFTER metadata with new values

6. **Review Results**
   - BEFORE columns: Original SQL Server
   - AFTER columns: Your new target system
   - Verify all values are correct

## ⚙️ Default Values

If you don't have specific values yet, you can use defaults:
- **Server**: `dummy_server`
- **Database**: `dummy_database`
- **Workspace ID**: `dummy_workspace_id`
- **Lakehouse ID**: `dummy_lakehouse_id`

These can be updated later when your target infrastructure is ready.

## ✅ Verification Checklist

Before running the migration:

- [ ] I have access to my target system (Fabric/Synapse/Databricks)
- [ ] I have the correct Server/Workspace endpoint
- [ ] I have the correct Database/Lakehouse name
- [ ] (For Fabric) I have my Workspace ID
- [ ] (For Fabric) I have my Lakehouse ID
- [ ] My target system has the required permissions
- [ ] I've backed up my original PBIP

## 🔄 Finding Your IDs

### Microsoft Fabric Workspace ID
1. Go to `https://app.fabric.microsoft.com`
2. Click on workspace settings (gear icon)
3. Copy the Workspace ID from the page

### Microsoft Fabric Lakehouse ID
1. Open your Lakehouse
2. Click on details (i icon)
3. Copy the Lakehouse ID

### Azure Synapse Workspace Name
1. Go to `https://portal.azure.com`
2. Find your Synapse workspace
3. Copy workspace name: `https://<name>.dev.azuresynapse.net`

### Databricks Workspace URL
1. Open your Databricks workspace
2. Look at the URL: `https://<region>.cloud.databricks.com`
3. Copy the workspace URL

## 📞 Common Issues

**Issue**: "Invalid server name"
- Solution: Ensure you've copied the complete endpoint address

**Issue**: "Database not found"
- Solution: Verify the database/lakehouse name exists in your target system

**Issue**: "Connection timeout"
- Solution: Check network connectivity and firewall rules allow your Fabric/Synapse workspace

For more detailed help, refer to the main README.md file.
