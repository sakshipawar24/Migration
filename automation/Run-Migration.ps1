########################################
# Power BI Workspace Migration Script
########################################

[CmdletBinding()]
param(
    [Parameter()][string]$TenantId = $env:POWERBI_TENANT_ID,
    [Parameter()][string]$ClientId = $env:POWERBI_CLIENT_ID,
    [Parameter()][string]$ClientSecret = $env:POWERBI_CLIENT_SECRET,
    [Parameter()][string]$SourceWorkspace = "c38cd878-f307-4fef-a88e-ff605111f08c",
    [Parameter()][string]$TargetWorkspace = "85606eaa-1e83-4443-aba5-b0a965cc390f",
    [Parameter()][string]$PbixFolder = "D:\PBIX",
    [Parameter()][string]$PbipFolder = "D:\PBIP",
    [Parameter()][string]$PbiTools = "C:\Tools\pbi-tools\pbi-tools.exe",
    [Parameter()][ValidateSet('Keep Same','SQL Server','Fabric Lakehouse')][string]$TargetTechnology = "Keep Same",
    [Parameter()][string]$Server = "dummy_server",
    [Parameter()][string]$Database = "dummy_database",
    [Parameter()][string]$WorkspaceId = "dummy_workspace_id",
    [Parameter()][string]$LakehouseId = "dummy_lakehouse_id",
    [Parameter()][string]$ReportNames = "",
    [Parameter()][switch]$UsePython,
    [Parameter()][ValidateSet('download','convert','publish','refresh','all')][string]$Action = "all"
)

function ConvertTo-ReportNameKey {
    param([string]$Name)

    if ([string]::IsNullOrWhiteSpace($Name)) {
        return ""
    }

    $value = $Name.Trim()
    if ($value.ToLower().EndsWith(".pbix")) {
        $value = $value.Substring(0, $value.Length - 5)
    }
    return $value.ToLower()
}

$SelectedReportSet = @{}
if (-not [string]::IsNullOrWhiteSpace($ReportNames)) {
    $ReportNames -split '\|' | ForEach-Object {
        $normalized = ConvertTo-ReportNameKey $_
        if (-not [string]::IsNullOrWhiteSpace($normalized)) {
            $SelectedReportSet[$normalized] = $true
        }
    }
}

function Test-ReportSelection {
    param([string]$Name)

    if ($SelectedReportSet.Count -eq 0) {
        return $true
    }

    $normalized = ConvertTo-ReportNameKey $Name
    return $SelectedReportSet.ContainsKey($normalized)
}

if ([string]::IsNullOrWhiteSpace($TenantId) -or [string]::IsNullOrWhiteSpace($ClientId) -or [string]::IsNullOrWhiteSpace($ClientSecret)) {
    throw "TenantId, ClientId, and ClientSecret are required."
}

########################################
# STEP 1 — Get Access Token
########################################

Write-Host "Getting token..."

$body = @{
    grant_type    = "client_credentials"
    scope         = "https://analysis.windows.net/powerbi/api/.default"
    client_id     = $ClientId
    client_secret = $ClientSecret
}

$token = Invoke-RestMethod `
    -Method Post `
    -Uri "https://login.microsoftonline.com/$tenantId/oauth2/v2.0/token" `
    -Body $body

$headers = @{
    Authorization = "Bearer $($token.access_token)"
}

Write-Host "Token acquired."

########################################
# STEP 2 — Download PBIX
########################################

if ($Action -eq "download" -or $Action -eq "all") {
    Write-Host "Downloading PBIX files..."

    New-Item -ItemType Directory -Force -Path $PbixFolder | Out-Null

    $totalReports = 0
    $downloadedReports = 0
    $skippedReports = 0

    $reports = Invoke-RestMethod `
        -Uri "https://api.powerbi.com/v1.0/myorg/groups/$SourceWorkspace/reports" `
        -Headers $headers

    foreach ($r in $reports.value) {
        $totalReports++

        $file = "$PbixFolder\$($r.name).pbix"

        if (Test-Path -LiteralPath $file) {
            $skippedReports++
            Write-Host "Skipping $($r.name) (already downloaded)."
            continue
        }

        Write-Host "Downloading $($r.name)..."

        Invoke-RestMethod `
            -Uri "https://api.powerbi.com/v1.0/myorg/groups/$SourceWorkspace/reports/$($r.id)/Export" `
            -Headers $headers `
            -OutFile $file

        $downloadedReports++
    }

    Write-Host "Download complete. Downloaded: $downloadedReports, Skipped: $skippedReports, Total: $totalReports."
    Write-Host "DOWNLOAD_SUMMARY|total=$totalReports|downloaded=$downloadedReports|skipped=$skippedReports"
}

########################################
# STEP 3 — Convert PBIX → PBIP
########################################

if ($Action -eq "convert" -or $Action -eq "all") {
    Write-Host "Converting PBIX to PBIP..."

    New-Item -ItemType Directory -Force -Path $PbipFolder | Out-Null

    Get-ChildItem "$PbixFolder\*.pbix" | ForEach-Object {

        $name = $_.BaseName
        $outPath = "$PbipFolder\$name"

        Write-Host "Converting $name..."

        & $PbiTools extract "$($_.FullName)" -extractFolder "$outPath"
    }
}

########################################
# STEP 3b — Update Connections + Rebuild PBIX (All Flow Only)
########################################

if ($Action -eq "all") {
    Write-Host "Updating PBIP connections and rebuilding PBIX..."

    New-Item -ItemType Directory -Force -Path $PbipFolder | Out-Null
    $metadataFolder = Join-Path $PbipFolder "_metadata"
    New-Item -ItemType Directory -Force -Path $metadataFolder | Out-Null

    $repoRoot = Split-Path -Parent $PSScriptRoot
    $invokeScript = Join-Path $repoRoot "invoke.js"
    $tempParamsPath = Join-Path $repoRoot "temp_params.json"

    Get-ChildItem "$PbipFolder\*" -Directory | ForEach-Object {
        $pbipPath = $_.FullName
        $pbixName = "$($_.Name).pbix"
        $outputPbix = Join-Path $PbixFolder $pbixName
        $metadataFile = Join-Path $metadataFolder "$($_.Name).json"

        $params = @{
            pbip_path = $pbipPath
            server = $Server
            database = $Database
            workspace_id = $WorkspaceId
            lakehouse_id = $LakehouseId
            target_technology = $TargetTechnology
            use_python = [bool]$UsePython
        }

        $params | ConvertTo-Json -Depth 4 | Set-Content -Path $tempParamsPath -Encoding UTF8

        Write-Host "Updating connections for $($_.Name)..."
        $metadataJson = & node $invokeScript
        if ($LASTEXITCODE -ne 0) {
            throw "Connection update failed for $($_.Name)."
        }

        if ($metadataJson) {
            $metadataJson | Set-Content -Path $metadataFile -Encoding UTF8
        }

        Write-Host "Compiling PBIP to PBIX for $($_.Name)..."
        & $PbiTools compile "$pbipPath" -outPath "$outputPbix"
        if ($LASTEXITCODE -ne 0) {
            throw "PBIP compile failed for $($_.Name)."
        }
    }
}

########################################
# STEP 4 — Publish PBIX (FIXED UPLOAD)
########################################

if ($Action -eq "publish" -or $Action -eq "all") {
    Write-Host "Publishing to target workspace..."

    Add-Type -AssemblyName System.Net.Http

    if (-not (Get-ChildItem "$PbixFolder\*.pbix" -ErrorAction SilentlyContinue)) {
        throw "No PBIX files found to publish in $PbixFolder."
    }

    Get-ChildItem "$PbixFolder\*.pbix" | ForEach-Object {

        if (-not (Test-ReportSelection $_.BaseName)) {
            Write-Host "Skipping $($_.Name) (already completed)."
            return
        }

        $name = $_.Name
        Write-Host "Publishing $name..."

        $uri = "https://api.powerbi.com/v1.0/myorg/groups/$TargetWorkspace/imports?datasetDisplayName=$name"

        $fileStream = [System.IO.File]::OpenRead($_.FullName)

        $content = New-Object System.Net.Http.MultipartFormDataContent
        $fileContent = New-Object System.Net.Http.StreamContent($fileStream)
        $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/octet-stream")

        $content.Add($fileContent, "file", $name)

        $client = New-Object System.Net.Http.HttpClient
        $client.DefaultRequestHeaders.Authorization =
            New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token.access_token)

        $response = $client.PostAsync($uri, $content).Result

        Write-Host "Response:" $response.StatusCode

        $fileStream.Close()
    }

    Write-Host "Publish complete."
}

########################################
# STEP 5 — Refresh datasets
########################################

if ($Action -eq "refresh" -or $Action -eq "all") {
    Write-Host "Refreshing datasets..."

    $datasets = Invoke-RestMethod `
        -Uri "https://api.powerbi.com/v1.0/myorg/groups/$TargetWorkspace/datasets" `
        -Headers $headers

    foreach ($d in $datasets.value) {

        if (-not (Test-ReportSelection $d.name)) {
            Write-Host "Skipping $($d.name) (already completed)."
            continue
        }

        Write-Host "Refreshing $($d.name)..."

        Invoke-RestMethod `
            -Method Post `
            -Uri "https://api.powerbi.com/v1.0/myorg/groups/$TargetWorkspace/datasets/$($d.id)/refreshes" `
            -Headers $headers `
            -Body '{ "notifyOption": "NoNotification" }'
    }

    Write-Host "Refresh complete."
}

Write-Host "All done."
