# CONNECTION SETTINGS GUIDE

## What to Enter in Server and Database Boxes

When you click "Change Connection & SQL", you'll see a Connection Settings form. Here's what to enter:

---

## 📍 CURRENT PRODUCTION VALUES (Your Original PBIP)

**What's currently in your PBIP:**
- Server: `dta-eun-prod-sqlsrv-synapse-01.database.windows.net`
- Database: `dta-eun-prod-datawarehouse-synapse-01`
- Type: SQL Server

---

## 🎯 WHAT TO ENTER IN THE BOXES

### Option 1: Microsoft Fabric (Recommended)

**Server Box:**
```
Enter one of:
1. Your Workspace ID (preferred)
   Example: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

2. Or use placeholder: fabric_server
```

**Database Box:**
```
Enter one of:
1. Your Lakehouse name (preferred)
   Example: my_lakehouse

2. Or use placeholder: fabric_lakehouse
```

**Additional Fields (Fabric Only):**
- **Workspace ID**: Your actual Fabric Workspace ID
- **Lakehouse ID**: Your actual Lakehouse ID

**How to Find IDs:**
1. Go to https://app.fabric.microsoft.com
2. Open your workspace → Settings → Copy Workspace ID
3. Open your Lakehouse → Details → Copy Lakehouse ID

---

### Option 2: Azure Synapse

**Server Box:**
```
Format: <workspace-name>.dev.azuresynapse.net

Example: my-synapse-workspace.dev.azuresynapse.net
```

**Database Box:**
```
Your SQL Pool name

Example: dw_warehouse
```

**How to Find:**
1. Go to https://portal.azure.com
2. Find your Synapse workspace
3. Copy the workspace URL from overview page

---

### Option 3: Databricks

**Server Box:**
```
Your workspace URL

Example: https://adb-1234567890.12.azuredatabricks.net
```

**Database Box:**
```
Format: catalog.schema

Example: main.default
```

---

### Option 4: Keep SQL Server (Test/Dev)

**Server Box:**
```
Your SQL Server endpoint

Example: myserver.database.windows.net
```

**Database Box:**
```
Your database name

Example: my_database
```

---

## 💡 QUICK REFERENCE TABLE

| Target System | Server Example | Database Example |
|--------------|----------------|------------------|
| **Fabric** | `workspace-id` or `fabric_server` | `my_lakehouse` or `fabric_lakehouse` |
| **Synapse** | `workspace.dev.azuresynapse.net` | `dw_warehouse` |
| **Databricks** | `https://adb-xxx.azuredatabricks.net` | `main.default` |
| **SQL Server** | `server.database.windows.net` | `database_name` |

---

## ⚡ DEFAULT PLACEHOLDERS

If you don't have the actual values yet, use these defaults:

**Server:** `dummy_server`  
**Database:** `dummy_database`  
**Workspace ID:** `dummy_workspace_id`  
**Lakehouse ID:** `dummy_lakehouse_id`

You can update them later when your infrastructure is ready.

---

## ✅ EXAMPLE: Migrating to Fabric

**Before running the tool, you need:**

1. **Server/Workspace ID**: 
   - From Fabric portal: `12345678-1234-1234-1234-123456789abc`

2. **Database/Lakehouse name**: 
   - Your lakehouse: `analytics_lakehouse`

3. **Workspace ID**: 
   - Same as above: `12345678-1234-1234-1234-123456789abc`

4. **Lakehouse ID**: 
   - From lakehouse details: `87654321-4321-4321-4321-cba987654321`

**What you enter in the UI:**

```
┌─────────────────────────────────────────────────┐
│ Connection Settings                             │
├─────────────────────────────────────────────────┤
│ Server:        12345678-1234-...                │
│ Database:      analytics_lakehouse              │
│ Workspace ID:  12345678-1234-...                │
│ Lakehouse ID:  87654321-4321-...                │
└─────────────────────────────────────────────────┘
```

---

## 🚨 COMMON MISTAKES

❌ **DON'T** enter the full connection string  
✅ **DO** enter just the server endpoint

❌ **DON'T** include protocol (https://) for SQL Server/Synapse  
✅ **DO** include it for Databricks

❌ **DON'T** use SQL Server endpoint for Fabric migration  
✅ **DO** use Workspace ID or 'fabric_server' placeholder

---

For more detailed information, see SETUP.md and README.md
