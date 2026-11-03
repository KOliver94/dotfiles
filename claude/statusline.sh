#!/usr/bin/env bash
# Runs caveman's statusline from whichever plugin version is cached: the cache folder is named after the version, so a fixed path breaks on every update.
cache="${CLAUDE_CONFIG_DIR:-$HOME/.claude}/plugins/cache/caveman/caveman"
script=$(ls -td "$cache"/*/hooks/caveman-statusline.sh 2>/dev/null | head -n 1)
if [ -n "$script" ]; then exec bash "$script"; fi
