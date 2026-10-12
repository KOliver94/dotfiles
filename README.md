# dotfiles

My Windows workstation setup: dev tools, runtime versions through mise, Claude Code and git. One bootstrap for a fresh machine, and a sync script that keeps machines and this repo in step without overwriting edits made on a machine.

## Fresh machine

In PowerShell, as your own user (not elevated):

```powershell
& ([scriptblock]::Create((irm https://raw.githubusercontent.com/KOliver94/dotfiles/main/bootstrap.ps1)))
```

It installs Git, clones this repo to `~\dotfiles` and continues from the clone: the tools in `tools.json` that are missing (never upgrading anything), mise's shims on the user PATH ahead of `WindowsApps`, the runtimes from `mise/config.toml`, then `node sync.mjs deploy`. It ends with the steps that need a person: `gh auth login`, 1Password's SSH agent, Docker Desktop's first run, IDEs through JetBrains Toolbox.

Machine-specific git settings (`safe.directory`, credential helpers) go into `~/.gitconfig.local`, which `~/.gitconfig` includes and which is never synced.

## Existing machine

Run once: remove other Node, Python and uv installs so mise's shims are the only ones on PATH (Windows puts the system PATH first, so a system-wide Node would shadow them), move machine-only git settings into `~/.gitconfig.local`, then from the clone:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\bootstrap.ps1
node sync.mjs deploy --force
```

## Daily loop

```bash
node sync.mjs check     # what differs, without writing anything
node sync.mjs capture   # copy edits made on this machine into the clone, then review with git diff
node sync.mjs deploy    # after git pull: apply repo changes to this machine
```

`deploy` never overwrites a file edited on the machine since the last sync; it reports `machine-edit` or `conflict` and exits 1. `capture` brings those edits into the clone, where git shows them as a diff and resolves conflicts with what you pulled. Discard a captured change with `git checkout` and the next `deploy` restores the repo version. `deploy --force` overwrites from the repo.

`claude/settings.json` holds only the shared keys. On deploy they replace their values in `~/.claude/settings.json` and every other key stays; capture copies those keys back. To share a machine-only key, add it to the repo file. Deploy also adds the marketplaces and installs the plugins the shared settings enable; it never uninstalls.

## What syncs

| Repo | Machine |
| --- | --- |
| `claude/CLAUDE.md` | `~/.claude/CLAUDE.md` |
| `claude/settings.json` | shared keys of `~/.claude/settings.json` |
| `claude/statusline.ps1` | `~/.claude/statusline.ps1` |
| `claude/skills/`, `agents/`, `rules/`, `output-styles/`, `keybindings.json` | same under `~/.claude/`, once they exist here |
| `git/gitconfig` | `~/.gitconfig` |
| `git/ignore` | `~/.config/git/ignore` |
| `git/allowed_signers` | `~/.config/git/allowed_signers` |
| `mise/config.toml` | `~/.config/mise/config.toml` |

Never touched: credentials, `~/.claude.json`, transcripts and memory under `~/.claude/projects/`, plugin caches, anything claude.ai account sync owns, `~/.gitconfig.local`.

## Runtimes

mise provides `node`, `python`, `uv` and `pre-commit` through shims, so PowerShell, Git Bash, IDEs and Claude Code all resolve them the same way. Inside a repo, `.nvmrc` and `.python-version` pick the version; elsewhere `mise/config.toml` sets the defaults. Java stays with JetBrains-managed JDKs, pnpm is the standalone build from winget.

## Tests

```bash
node --test "test/*.test.mjs"
powershell -NoProfile -ExecutionPolicy Bypass -File test/windows.test.ps1
```
