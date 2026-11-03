#!/usr/bin/env bash
# Runs caveman's statusline from whichever plugin version is cached: the cache folder is named after the version, so a fixed path breaks on every update.
latest=
for script in "${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/caveman/caveman/*/hooks/caveman-statusline.sh; do
  if [ -z "$latest" ] || [ "$script" -nt "$latest" ]; then latest=$script; fi
done
if [ -f "$latest" ]; then exec bash "$latest"; fi
