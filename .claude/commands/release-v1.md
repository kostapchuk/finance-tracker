Run the release script to commit changes with optional version bump and branch targeting.

Before running, ask the user:

1. What commit message to use (required)
2. Whether to bump version (patch/minor/major) — optional, skip if not needed
3. Which branch to target — optional, defaults to current branch

Then run:

```
python release.py -m "<message>" [--patch|--minor|--major] [-b <branch>]
```

Examples:

- Simple commit: `python release.py -m "fix: resolve login bug"`
- Patch release: `python release.py -m "fix: resolve login bug" --patch`
- Minor release: `python release.py -m "feat: add dark mode" --minor`
- Major release: `python release.py -m "feat!: redesign dashboard" --major`
- Feature branch: `python release.py -m "feat: start dark mode" -b feature/dark-mode`

Do not include a Co-Authored-By line in the commit.
