# Sets up a Windows workstation from the dotfiles repo. Safe to re-run: installs only what is missing and never upgrades.
# Fresh machine, in PowerShell as your own user (not elevated):
#   & ([scriptblock]::Create((irm https://raw.githubusercontent.com/KOliver94/dotfiles/main/bootstrap.ps1)))
# From a clone:
#   powershell -NoProfile -ExecutionPolicy Bypass -File .\bootstrap.ps1 [-DryRun]
[CmdletBinding()]
param(
    [string]$Path = (Join-Path $HOME 'dotfiles'),
    [switch]$DryRun
)
$ErrorActionPreference = 'Stop'

# Started from the web there is no clone yet: get git, clone, and hand over to the clone's copy of this script.
# A child powershell with -ExecutionPolicy Bypass, because fresh Windows refuses to run .ps1 files.
# throw, not exit: exit would close the interactive shell the web entry runs in.
$fromClone = $PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot 'sync.mjs'))
if (-not $fromClone) {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        if ($DryRun) { Write-Host 'would: install Git.Git' }
        else {
            winget install -e --id Git.Git --accept-package-agreements --accept-source-agreements --disable-interactivity
            $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
        }
    }
    if (-not (Test-Path $Path)) {
        if ($DryRun) { Write-Host "would: clone into $Path" }
        else { git clone https://github.com/KOliver94/dotfiles.git $Path }
    }
    if (-not (Test-Path (Join-Path $Path 'bootstrap.ps1'))) {
        if ($DryRun) { Write-Host "would: continue from $Path"; return }
        throw "No dotfiles clone at $Path (the folder holds something else, or the clone failed). Pass -Path to use another folder."
    }
    $childArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $Path 'bootstrap.ps1'))
    if ($DryRun) { $childArgs += '-DryRun' }
    & powershell @childArgs
    return
}

. (Join-Path $PSScriptRoot 'lib\windows.ps1')
$failures = New-Object System.Collections.Generic.List[string]

$tools = Get-Content -Raw (Join-Path $PSScriptRoot 'tools.json') | ConvertFrom-Json
foreach ($tool in $tools.winget) {
    if (Test-Tool $tool) { continue }
    Invoke-Step "install $($tool.id)" {
        winget install -e --id $tool.id --accept-package-agreements --accept-source-agreements --disable-interactivity
        if ($LASTEXITCODE -ne 0) { $failures.Add($tool.id) }
    } $failures -DryRun:$DryRun
}
foreach ($tool in $tools.scripts) {
    if (Test-Tool $tool) { continue }
    Invoke-Step "install $($tool.name)" { Invoke-RestMethod $tool.url | Invoke-Expression } $failures -DryRun:$DryRun
}

# mise shims must come before WindowsApps, whose python.exe aliases would otherwise win.
# Claude Code's native installer does not reliably put ~\.local\bin on PATH; it goes last, behind the shims.
$shims = '%LOCALAPPDATA%\mise\shims'
$currentPath = Get-UserPath
$newPath = Add-PathEntryBefore $currentPath $shims '%LOCALAPPDATA%\Microsoft\WindowsApps'
if (Test-Path (Join-Path $HOME '.local\bin\claude.exe')) { $newPath = Add-PathEntryLast $newPath '%USERPROFILE%\.local\bin' }
if ($newPath -ne $currentPath) {
    Invoke-Step 'update the user PATH (mise shims before WindowsApps, ~\.local\bin)' { Set-UserPath $newPath } $failures -DryRun:$DryRun
}
Update-SessionPath

# Seeded once so mise can install the Node that runs sync.mjs; from then on sync.mjs owns the file.
$miseConfig = Join-Path $HOME '.config\mise\config.toml'
if (-not (Test-Path $miseConfig)) {
    Invoke-Step "seed $miseConfig" {
        New-Item -ItemType Directory -Force -Path (Split-Path $miseConfig) | Out-Null
        Copy-Item (Join-Path $PSScriptRoot 'mise\config.toml') $miseConfig
    } $failures -DryRun:$DryRun
}
Invoke-Step 'mise install' {
    mise install
    if ($LASTEXITCODE -ne 0) { $failures.Add('mise install') }
} $failures -DryRun:$DryRun
Invoke-Step 'node sync.mjs deploy' {
    node (Join-Path $PSScriptRoot 'sync.mjs') deploy
    if ($LASTEXITCODE -ne 0) { $failures.Add('sync deploy (see node sync.mjs check)') }
} $failures -DryRun:$DryRun

# Windows searches the system PATH before the user PATH, so a system-wide install or a WindowsApps alias there silently beats the shims.
if (-not $DryRun) {
    Update-SessionPath
    foreach ($name in 'node', 'python', 'uv', 'pre-commit') {
        $sources = @(Get-Command $name -All -CommandType Application -ErrorAction SilentlyContinue | ForEach-Object { $_.Source })
        $problem = Get-ShimProblem $name $sources $shims
        if ($problem) { $failures.Add($problem) }
    }
}

Write-Host ''
Write-Host 'Manual steps:'
Write-Host '  gh auth login (answer No to "Authenticate Git with your GitHub credentials": Git Credential Manager already does that, and a yes rewrites ~/.gitconfig)'
Write-Host '  1Password: Settings > Developer > Use the SSH agent'
Write-Host '  Docker Desktop: start it once'
Write-Host '  JetBrains Toolbox: install the IDEs'
if ($failures.Count -gt 0) {
    Write-Host "Failed: $($failures -join ', ')"
    exit 1
}
