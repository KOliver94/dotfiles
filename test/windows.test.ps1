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

if ($script:failed) { exit 1 }
