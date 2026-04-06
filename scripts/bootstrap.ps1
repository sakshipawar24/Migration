param(
    [switch]$NoInstall,
    [switch]$InstallOnly
)

$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Get-PythonExe {
    $venvPython = Join-Path $repoRoot '.venv\Scripts\python.exe'
    if (Test-Path $venvPython) {
        return $venvPython
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        return $pythonCommand.Source
    }

    throw 'Python was not found. Install Python 3.8+ or create .venv first.'
}

if (-not $NoInstall) {
    $pythonExe = Get-PythonExe

    Write-Host 'Installing Python dependencies...'
    & $pythonExe -m pip install -r requirements.txt

    Write-Host 'Installing frontend dependencies...'
    npm --prefix metadata-ui install
}

if ($InstallOnly) {
    Write-Host 'Dependencies installed. Exiting because -InstallOnly was provided.'
    exit 0
}

$pythonExe = Get-PythonExe

Write-Host 'Starting backend in a new terminal...'
Start-Process pwsh -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$repoRoot'; & '$pythonExe' app.py"
)

$frontendDir = Join-Path $repoRoot 'metadata-ui'
Write-Host 'Starting frontend in a new terminal...'
Start-Process pwsh -ArgumentList @(
    '-NoExit',
    '-Command',
    "Set-Location '$frontendDir'; npm start"
)

Write-Host 'Bootstrap complete.'
Write-Host 'Backend:  http://localhost:5000'
Write-Host 'Frontend: http://localhost:3000'