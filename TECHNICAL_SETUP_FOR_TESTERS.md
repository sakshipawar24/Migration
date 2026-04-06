# Technical Setup Guide for Testers

This guide is for anyone who wants to clone the repository and test the app in a client environment.

## 1. What This App Needs

- Windows 10 or Windows 11
- Python 3.8+
- Node.js 16+
- npm (comes with Node.js)
- PowerShell access
- Internet access to install packages
- Access to Fabric/Synapse/Databricks/Power BI environment for real migration testing

## 2. Clone the Repository

Use one of these repositories:

- Main repo: https://github.com/sakshipawar24/Migration
- Client mirror: https://github.com/Cloudaeon-India/power-bi-migration (branch: Power-BI-migration-tool)

Commands:

```powershell
git clone https://github.com/sakshipawar24/Migration.git
cd Migration
```

## 3. One-Command Start (Recommended)

From the project root:

```powershell
./scripts/bootstrap.ps1
```

What this does:

- Installs Python dependencies from requirements.txt
- Installs frontend dependencies from metadata-ui/package.json
- Starts backend on port 5000
- Starts frontend on port 3000

Optional commands:

```powershell
./scripts/bootstrap.ps1 -NoInstall
./scripts/bootstrap.ps1 -InstallOnly
```

## 4. Manual Start (Alternative)

If not using bootstrap, run these commands.

Terminal 1 (Backend):

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Terminal 2 (Frontend):

```powershell
cd metadata-ui
npm install
npm start
```

## 5. Open in Browser

- Frontend UI: http://localhost:3000
- Backend API: http://localhost:5000

## 6. Folder Locations on the Tester Machine

The app ships with default fallback paths like `D:\PBIX` and `D:\PBIP`, but testers do not need to use those exact locations.

- They can clone the repo anywhere on their laptop.
- They can store PBIX and PBIP files in any folder they prefer, such as `C:\PBIX`, `C:\PBIP`, `E:\Work\PBIP`, or a shared drive.
- They should simply enter the correct local path in the app UI if their files are stored somewhere else.

If the default folders do not exist on their machine, they can either:

- Create those folders, or
- Change the folder path in the UI before running download, convert, or metadata actions.

For client testing, it is usually better to use a folder path that is convenient for the tester rather than changing their system to match the default path.

## 7. Minimum Validation Checklist

After app start, confirm all below:

- Frontend opens on localhost:3000
- No backend crash in app.py terminal
- Upload PBIP works
- Convert PBIP works
- Change Connection and SQL works
- Before/After metadata table loads
- Report tracker updates and remains after page refresh
- Download/Publish/Refresh actions can be triggered (if credentials and workspace access are valid)
- File paths entered in the UI point to folders that exist on the tester machine
- The app works after refresh without losing the report tracker state

## 8. Power BI / Fabric Configuration Needed for Full Testing

For real client testing, tester should have:

- Tenant ID
- Client ID
- Client Secret
- Source Workspace ID
- Target Workspace ID
- PBIX folder path (if download/publish flow is used)

Set these values through the app UI in the Power BI configuration section.

If the tester is only validating the UI and metadata flow, they can use local dummy folders and sample PBIP/PBIX files first before connecting to a live client workspace.

## 9. Common Setup Issues

1. PowerShell script blocked

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

2. Python not found

- Install Python and ensure it is on PATH, then reopen terminal.

3. npm not found

- Install Node.js LTS and reopen terminal.

4. Port already in use

- Stop existing process using ports 3000 or 5000 and restart app.

5. Frontend cannot call backend

- Ensure backend terminal is running without errors.

6. Wrong folder path entered in the UI

- Make sure the selected PBIX/PBIP folder exists on the tester machine.
- Use a local folder that the tester can access without admin permissions.

## 10. Security Notes

- Do not commit real credentials into .env or source files.
- Use local environment variables or UI input for secrets.
- Keep client workspace IDs and secrets private.
- If using a shared client laptop, do not save real credentials into the repo.

## 11. Quick Share Message (You Can Forward)

Please clone the repo and run the app with the bootstrap script:

1. git clone https://github.com/sakshipawar24/Migration.git
2. cd Migration
3. ./scripts/bootstrap.ps1
4. Open http://localhost:3000

If bootstrap is blocked in PowerShell, run:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

Then test upload, conversion, metadata comparison, and Power BI operations in the UI.

For file locations, use any local folder that is convenient on your machine. The app does not require the same `D:\PBIX` or `D:\PBIP` path for everyone.