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

## Email Summary Configuration

The Summary page can send a migration summary by email through the backend API endpoint `/api/send-summary-email`.

### Email Provider

Set `EMAIL_PROVIDER` to one of:

- `smtp` (default)
- `graph` (Microsoft Graph, recommended when SMTP basic auth is blocked)
- `webhook` (Power Automate/Logic App/custom HTTP endpoint)
- `auto` (try SMTP first, then Graph if SMTP basic auth is disabled)

Set these environment variables before starting `app.py`:

- `SMTP_HOST` (required)
- `SMTP_PORT` (optional, default: `587`)
- `SMTP_USERNAME` (optional, required if your SMTP server needs auth)
- `SMTP_PASSWORD` (optional, required if your SMTP server needs auth)
- `SMTP_FROM_EMAIL` (optional, defaults to `SMTP_USERNAME`)
- `SMTP_USE_TLS` (optional, `true`/`false`, default: `true`)

For Graph mode (`EMAIL_PROVIDER=graph`), set:

- `GRAPH_TENANT_ID`
- `GRAPH_CLIENT_ID`
- `GRAPH_CLIENT_SECRET`
- `GRAPH_SENDER_EMAIL` (or `SMTP_FROM_EMAIL`)
- Optional: `GRAPH_SENDER_USER_ID` (Azure AD user object ID; preferred if UPN lookup fails)

Graph app must have application permission `Mail.Send` with admin consent.
The sender must be a real mailbox user in the same tenant (consumer Outlook addresses not in tenant will fail).

For webhook mode (`EMAIL_PROVIDER=webhook`), set:

- `EMAIL_WEBHOOK_URL`

The webhook should accept JSON payload with: `recipientEmail`, `subject`, `summaryContent`, `fileName`.

You can set them either in shell environment variables or in a local `.env` file at the project root.
Use `.env.example` as a template.

PowerShell example:

```powershell
$env:SMTP_HOST = "smtp.office365.com"
$env:SMTP_PORT = "587"
$env:SMTP_USERNAME = "you@company.com"
$env:SMTP_PASSWORD = "app-password-or-smtp-password"
$env:SMTP_FROM_EMAIL = "you@company.com"
$env:SMTP_USE_TLS = "true"
python app.py
```

If backend was already running, restart it after updating environment variables or `.env`.
