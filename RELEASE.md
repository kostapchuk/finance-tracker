# Release Script

A Python script for managing releases with semver version bumping and branch targeting.

## Requirements

- Python 3
- Git

## Usage

```
python release.py -m <message> [--patch|--minor|--major] [-b <branch>]
```

### Arguments

| Argument          | Required | Description                                    |
| ----------------- | -------- | ---------------------------------------------- |
| `-m`, `--message` | Yes      | Commit message                                 |
| `--patch`         | No       | Bump patch version (e.g., 0.1.124 → 0.1.125)   |
| `--minor`         | No       | Bump minor version (e.g., 0.1.124 → 0.2.0)     |
| `--major`         | No       | Bump major version (e.g., 0.1.124 → 1.0.0)     |
| `-b`, `--branch`  | No       | Target branch name. Defaults to current branch |

### Version Flags

Version flags are mutually exclusive. Only one can be specified at a time.

| Flag      | Before  | After   |
| --------- | ------- | ------- |
| `--patch` | 0.1.124 | 0.1.125 |
| `--minor` | 0.1.124 | 0.2.0   |
| `--major` | 0.1.124 | 1.0.0   |

If no version flag is provided, no version bump occurs.

### Branch Behavior

1. No `--branch`: Commits to current branch
2. `--branch <name>` (exists): Checks out existing branch, commits and pushes
3. `--branch <name>` (new): Creates new branch, commits and pushes

## Examples

### 1. Simple commit to main (no version bump)

```bash
python release.py -m "fix: resolve login bug"
```

### 2. Patch release on main

```bash
python release.py -m "fix: resolve login bug" --patch
```

### 3. Minor release on main

```bash
python release.py -m "feat: add dark mode" --minor
```

### 4. Major release on main

```bash
python release.py -m "feat!: redesign dashboard" --major
```

### 5. Commit to new feature branch (no version bump)

```bash
python release.py -m "feat: start dark mode" -b feature/dark-mode
```

### 6. Commit to existing feature branch

```bash
python release.py -m "feat: finish dark mode" -b feature/dark-mode
```

### 7. Patch release on a feature branch

```bash
python release.py -m "fix: dark mode toggle" --patch -b feature/dark-mode
```

## Help

```bash
python release.py --help
```
