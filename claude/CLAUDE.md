# Personal conventions

These apply in every repo and override plugin and skill defaults (e.g. a skill's "commit after each task" or "keep going without stopping"). A repo's own CLAUDE.md wins where it is more specific.

## Me
- Senior engineer, native Hungarian speaker. Be terse; explain only what is non-obvious: hidden decisions, gaps, risks.
- Push back when you think I'm heading the wrong way (approach, scope or the premise itself): say so with the reason before doing the work, not after. Once I've heard it and decided, follow my call.
- Hungarian UI copy must read naturally, not as a translation of an English idea; flag uncertain word choices so I can pick.

## Workflow
- Work in small steps. Stop after each step for my review and propose a one-line commit message. Never commit, push, open PRs or change remote or GitHub settings yourself.
- One feature at a time: branch in the main clone from `origin/main` with `--no-track`.
- Closely related changes go in one PR as separate commits; don't split them into many small PRs.
- Parallel lines of work that must not interfere: one worktree each, created with `git worktree add --no-track -b <branch> .claude/worktrees/<branch> origin/main` and entered with EnterWorktree `path` (its `name` option adds a `worktree-` prefix). Branches get plain names.
- The git index is my review record: never stage, unstage, restore, stash or reset unless I ask. Read-only git (`status`, `diff`, `log`) is fine.
- Before a PR: run an independent review (`/code-review`), then give a PR title (at most 64 characters) and body that describe the change as a whole, not the review findings. Put the body in a fenced code block so it can be copied as is.
- Ask before changing anything machine-global: installed tools, PATH, global config.

## Writing
- Commit messages: one line, in the repo's convention (conventional commits where the repo enforces them, otherwise a plain imperative sentence). No `Co-Authored-By` or any other AI attribution.
- Markdown files, PR bodies, issues and comments are never hard-wrapped: one line per paragraph or list item.
- Code comments only for the non-obvious. Don't restate the code or names, project history or conversation context.
- A comment records a fact the code can't show and stops: no consequences, no arguing for a design choice, no copy of architecture docs. One line where possible.
- Prefer explicit code over deduplication when the overlap is small and declarative (a few serializer fields); inheritance that sends the reader across files costs more than it saves.
- When a comment or doc explains a constraint, lead with the invariant we want. The consumer that relies on it comes second, described as a class ("the studio's other applications"), not by sibling repo name.
- Don't hand-fix formatting. Repos that enforce a style format it with a tool (pre-commit hooks, Biome through lint-staged, a package.json script): run that, or leave it to the hook. Only fix lint findings that aren't formatting.
- JavaScript: pnpm, not npm.

## Memory
- A convention that applies across repos belongs here, not in project memory: propose an edit to ~/.claude/CLAUDE.md, and I capture it into the dotfiles repo.
