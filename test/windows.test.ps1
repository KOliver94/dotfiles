$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\lib\windows.ps1')

$script:failed = 0
function Assert-Equal($Actual, $Expected, [string]$Name) {
    if ($Actual -ceq $Expected) { Write-Host "ok   $Name" }
    else { Write-Host "FAIL $Name`n  expected: $Expected`n  actual:   $Actual"; $script:failed++ }
}

$shims = '%LOCALAPPDATA%\mise\shims'
$apps = '%LOCALAPPDATA%\Microsoft\WindowsApps'
$appsExpanded = "$env:LOCALAPPDATA\Microsoft\WindowsApps\"

Assert-Equal (Add-PathEntryBefore "C:\a;$apps;C:\b" $shims $apps) "C:\a;$shims;$apps;C:\b" 'inserts right before WindowsApps'
Assert-Equal (Add-PathEntryBefore "C:\a;$shims;$apps" $shims $apps) "C:\a;$shims;$apps" 'a second run changes nothing'
Assert-Equal (Add-PathEntryBefore "$apps;C:\b;$shims" $shims $apps) "$shims;$apps;C:\b" 'moves a later copy forward'
Assert-Equal (Add-PathEntryBefore "C:\a;$appsExpanded" $shims $apps) "C:\a;$shims;$appsExpanded" 'matches the expanded anchor'
Assert-Equal (Add-PathEntryBefore "C:\a;;%USERPROFILE%\bin" $shims $apps) "$shims;C:\a;%USERPROFILE%\bin" 'keeps %VAR% entries, drops empties, goes first without the anchor'
Assert-Equal (Add-PathEntryBefore '' $shims $apps) $shims 'empty PATH'

$shimsDir = "$env:LOCALAPPDATA\mise\shims"
$stub = "$env:LOCALAPPDATA\Microsoft\WindowsApps\python.exe"
Assert-Equal (Get-ShimProblem 'python' @("$shimsDir\python.exe", $stub) $shims) $null 'the shim comes first'
Assert-Equal (Get-ShimProblem 'python' @("$($shimsDir.ToUpperInvariant())\python.exe") "$shimsDir\") $null 'case and a trailing backslash do not matter'
Assert-Equal (Get-ShimProblem 'python' @($stub, "$shimsDir\python.exe") $shims) "python resolves to $stub before mise's shim" 'something ahead of the shim is reported'
Assert-Equal (Get-ShimProblem 'node' @() $shims) 'node not found on PATH' 'a missing command is reported'

Assert-Equal (Add-PathEntryBefore "$shims;C:\a;$apps" $shims $apps) "$shims;C:\a;$apps" 'an entry already ahead of the anchor stays where it is'

$localBin = '%USERPROFILE%\.local\bin'
Assert-Equal (Add-PathEntryLast "C:\a;$apps" $localBin) "C:\a;$apps;$localBin" 'appends a missing entry'
Assert-Equal (Add-PathEntryLast "C:\a;$env:USERPROFILE\.local\bin\" $localBin) "C:\a;$env:USERPROFILE\.local\bin\" 'leaves an entry that is there in expanded form'
Assert-Equal (Add-PathEntryLast '' $localBin) $localBin 'appends to an empty PATH'

$failures = New-Object System.Collections.Generic.List[string]
Invoke-Step 'broken step' { throw 'boom' } $failures
Assert-Equal ($failures -join '|') 'broken step (boom)' 'a throwing step is recorded and the run goes on'
$script:ran = $false
Invoke-Step 'dry step' { $script:ran = $true } $failures -DryRun
Assert-Equal $script:ran $false 'a dry run never executes the step'

Assert-Equal (Invoke-Quiet { cmd /c 'echo noise 1>&2 & exit 3' }) 3 'stderr from a native command does not stop a Stop-mode script'

# Run as the web entry does (a script block, so no $PSScriptRoot); git must exist, or it would try to install it.
if (Get-Command git -ErrorAction SilentlyContinue) {
    $notAClone = Join-Path ([IO.Path]::GetTempPath()) ([Guid]::NewGuid().ToString())
    New-Item -ItemType Directory -Path $notAClone | Out-Null
    $entry = [scriptblock]::Create((Get-Content -Raw (Join-Path $PSScriptRoot '..\bootstrap.ps1')))
    $message = ''
    try { & $entry -Path $notAClone *> $null } catch { $message = $_.Exception.Message }
    Assert-Equal ($message -like "No dotfiles clone at $notAClone*") $true 'the web entry stops with a message when the folder is not a clone'
    Remove-Item -Recurse -Force $notAClone
}

if ($script:failed) { exit 1 }
