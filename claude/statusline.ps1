# Runs caveman's statusline from whichever plugin version is cached: the cache folder is named after the version, so a fixed path breaks on every update.
$claudeDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }
$cache = Join-Path $claudeDir 'plugins\cache\caveman\caveman'
$script = Get-ChildItem -Path $cache -Directory -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    ForEach-Object { Join-Path $_.FullName 'hooks\caveman-statusline.ps1' } |
    Where-Object { Test-Path $_ } |
    Select-Object -First 1
if ($script) { & $script }
