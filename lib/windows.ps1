# Helpers for bootstrap.ps1, kept apart so test/windows.test.ps1 can load them without running the bootstrap.

# A failing step is recorded and the run goes on, so the remaining checks and the summary still happen.
function Invoke-Step([string]$Description, [scriptblock]$Action, $Failures, [switch]$DryRun) {
    if ($DryRun) { Write-Host "would: $Description"; return }
    Write-Host "==> $Description"
    try { & $Action } catch { $Failures.Add("$Description ($($_.Exception.Message))") }
}

function Resolve-PathKey([string]$Entry) {
    [Environment]::ExpandEnvironmentVariables($Entry).TrimEnd('\').ToLowerInvariant()
}

# Puts $Entry right before $Anchor (first when the anchor is absent) and drops any other copy of it.
# A PATH where it already comes before the anchor is returned as is, so hand-made order survives re-runs.
# Entries keep their %VAR% form because the user PATH is REG_EXPAND_SZ.
function Add-PathEntryBefore([string]$Path, [string]$Entry, [string]$Anchor) {
    $entryKey = Resolve-PathKey $Entry
    $anchorKey = Resolve-PathKey $Anchor
    $keys = @($Path -split ';' | Where-Object { $_ -ne '' } | ForEach-Object { Resolve-PathKey $_ })
    $entryAt = [array]::IndexOf($keys, $entryKey)
    $anchorAt = [array]::IndexOf($keys, $anchorKey)
    if ($entryAt -ge 0 -and ($anchorAt -lt 0 -or $entryAt -lt $anchorAt)) { return $Path }
    $entries = @($Path -split ';' | Where-Object { $_ -ne '' -and (Resolve-PathKey $_) -ne $entryKey })
    $index = 0
    for ($i = 0; $i -lt $entries.Count; $i++) {
        if ((Resolve-PathKey $entries[$i]) -eq $anchorKey) { $index = $i; break }
    }
    $result = @()
    if ($index -gt 0) { $result += $entries[0..($index - 1)] }
    $result += $Entry
    if ($entries.Count -gt $index) { $result += $entries[$index..($entries.Count - 1)] }
    $result -join ';'
}

function Add-PathEntryLast([string]$Path, [string]$Entry) {
    $entryKey = Resolve-PathKey $Entry
    $entries = @($Path -split ';' | Where-Object { $_ -ne '' })
    if (@($entries | Where-Object { (Resolve-PathKey $_) -eq $entryKey }).Count -gt 0) { return $Path }
    (@($entries) + $Entry) -join ';'
}

# $Sources is every match on PATH in search order; the first one is what runs.
function Get-ShimProblem([string]$Name, [string[]]$Sources, [string]$ShimsDir) {
    if (-not $Sources -or $Sources.Count -eq 0) { return "$Name not found on PATH" }
    if ((Resolve-PathKey (Split-Path $Sources[0] -Parent)) -eq (Resolve-PathKey $ShimsDir)) { return $null }
    "$Name resolves to $($Sources[0]) before mise's shim"
}

function Get-UserPath {
    (Get-Item -Path 'HKCU:\Environment').GetValue('Path', '', 'DoNotExpandEnvironmentNames')
}

function Set-UserPath([string]$Value) {
    Set-ItemProperty -Path 'HKCU:\Environment' -Name 'Path' -Value $Value -Type ExpandString
    # A registry write alone does not reach running programs; setting and clearing a variable broadcasts the change to new terminals.
    [Environment]::SetEnvironmentVariable('DOTFILES_PATH_CHANGED', '1', 'User')
    [Environment]::SetEnvironmentVariable('DOTFILES_PATH_CHANGED', $null, 'User')
}

function Update-SessionPath {
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
}

# Windows PowerShell turns a redirected stderr line of a native command into a terminating error under Stop; only the exit code matters here.
function Invoke-Quiet([scriptblock]$Command) {
    $ErrorActionPreference = 'Continue'
    & $Command *> $null
    $LASTEXITCODE
}

function Test-Tool($Tool) {
    if ($Tool.command -and (Get-Command $Tool.command -ErrorAction SilentlyContinue)) { return $true }
    if (-not $Tool.id) { return $false }
    (Invoke-Quiet { winget list -e --id $Tool.id --disable-interactivity --accept-source-agreements }) -eq 0
}
