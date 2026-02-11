# Update Release Script

## Context
The current `release.py` only supports patch version bumps and commits directly to the current branch. The user needs a more flexible release script that supports semver level selection, branch targeting, and mandatory commit messages.

## Current State
- **Script**: `release.py` — always bumps patch, takes commit message as positional args, stages all, commits, pushes
- **Claude command**: `.claude/commands/release-v1.md` — instructs Claude to bump patch only
- **Current version**: `0.1.124` in `package.json`

## Changes

### 1. Rewrite `release.py` with argparse

**New CLI interface:**
```
python release.py -m "commit message" [--patch|--minor|--major] [--branch branch_name]
```

**Arguments:**
- `-m` / `--message` (required): Commit message
- `--patch`: Bump patch version (e.g., 0.1.124 → 0.1.125)
- `--minor`: Bump minor version, reset patch (e.g., 0.1.124 → 0.2.0)
- `--major`: Bump major version, reset minor+patch (e.g., 0.1.124 → 1.0.0)
- `-b` / `--branch` (optional): Target branch name. If omitted, commits to `main`
- Version flags are mutually exclusive and optional — if none supplied, no version bump happens

**Branch logic:**
1. If no `--branch` → stay on current branch (main), commit and push
2. If `--branch <name>` and branch exists locally → `git checkout <name>`, commit and push
3. If `--branch <name>` and branch doesn't exist → `git checkout -b <name>`, commit and push

**Version bump logic:**
- Only runs if `--patch`, `--minor`, or `--major` is provided
- `--patch`: increment `parts[2]`
- `--minor`: increment `parts[1]`, set `parts[2] = 0`
- `--major`: increment `parts[0]`, set `parts[1] = 0`, `parts[2] = 0`

### 2. Update `.claude/commands/release-v1.md`

Update the Claude command to reflect the new script interface and instruct Claude to ask the user for the required parameters or infer them from context.

### 3. Create `RELEASE.md` — Usage documentation

A README specifically for the release script with all use cases:

- **Overview**: What the script does
- **Requirements**: Python 3, git
- **Usage syntax**: Full CLI reference
- **Use cases with examples**:
  1. Simple commit to main (no version bump): `python release.py -m "fix: resolve login bug"`
  2. Patch release on main: `python release.py -m "fix: resolve login bug" --patch`
  3. Minor release on main: `python release.py -m "feat: add dark mode" --minor`
  4. Major release on main: `python release.py -m "feat!: redesign dashboard" --major`
  5. Commit to new feature branch (no version bump): `python release.py -m "feat: start dark mode" -b feature/dark-mode`
  6. Commit to existing feature branch: `python release.py -m "feat: finish dark mode" -b feature/dark-mode`
  7. Patch release on a feature branch: `python release.py -m "fix: dark mode toggle" --patch -b feature/dark-mode`
- **Version bump behavior table**: Shows before/after for each flag
- **Branch behavior**: Explains create-if-new, checkout-if-exists logic

## Files to Modify
- `release.py` — rewrite with argparse
- `.claude/commands/release-v1.md` — update instructions
- `RELEASE.md` — new file, usage documentation

## Verification
1. Run `python release.py --help` to verify help output
2. Test: `python release.py -m "test"` — should commit without version bump
3. Test: `python release.py -m "test" --patch` — should bump patch
4. Test: `python release.py -m "test" --minor` — should bump minor, reset patch to 0
5. Test: `python release.py -m "test" --major` — should bump major, reset minor+patch to 0
6. Test: `python release.py -m "test" -b feature/test` — should create/checkout branch and commit
