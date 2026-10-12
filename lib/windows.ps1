# Helpers for bootstrap.ps1, kept apart so test/windows.test.ps1 can load them without running the bootstrap.

function Resolve-PathKey([string]$Entry) {
    [Environment]::ExpandEnvironmentVariables($Entry).TrimEnd('\').ToLowerInvariant()
}

# Puts $Entry right before $Anchor (first when the anchor is absent) and drops any other copy of it.
# Entries keep their %VAR% form because the user PATH is REG_EXPAND_SZ.
function Add-PathEntryBefore([string]$Path, [string]$Entry, [string]$Anchor) {
    $entryKey = Resolve-PathKey $Entry
    $anchorKey = Resolve-PathKey $Anchor
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

function Test-Tool($Tool) {
    if ($Tool.command -and (Get-Command $Tool.command -ErrorAction SilentlyContinue)) { return $true }
    if (-not $Tool.id) { return $false }
    winget list -e --id $Tool.id --disable-interactivity --accept-source-agreements *> $null
    $LASTEXITCODE -eq 0
}
