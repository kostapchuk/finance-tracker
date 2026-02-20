#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys


def get_current_branch():
    result = subprocess.run(
        ["git", "rev-parse", "--abbrev-ref", "HEAD"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def branch_exists(branch_name):
    result = subprocess.run(
        ["git", "branch", "--list", branch_name],
        capture_output=True,
        text=True,
        check=True,
    )
    return bool(result.stdout.strip())


def create_or_checkout_branch(branch_name):
    if branch_exists(branch_name):
        subprocess.run(["git", "checkout", branch_name], check=True)
        print(f"Checked out existing branch: {branch_name}")
    else:
        subprocess.run(["git", "checkout", "-b", branch_name], check=True)
        print(f"Created and checked out new branch: {branch_name}")


def bump_version(bump_type):
    with open("package.json", "r") as f:
        pkg = json.load(f)

    parts = pkg["version"].split(".")
    parts = [int(p) for p in parts]

    if bump_type == "patch":
        parts[2] += 1
    elif bump_type == "minor":
        parts[1] += 1
        parts[2] = 0
    elif bump_type == "major":
        parts[0] += 1
        parts[1] = 0
        parts[2] = 0

    parts = [str(p) for p in parts]
    pkg["version"] = ".".join(parts)

    with open("package.json", "w") as f:
        json.dump(pkg, f, indent=2)
        f.write("\n")

    return pkg["version"]


def main():
    parser = argparse.ArgumentParser(
        description="Release script with semver support and branch targeting."
    )
    parser.add_argument(
        "-m",
        "--message",
        required=True,
        help="Commit message (required)",
    )
    parser.add_argument(
        "--patch",
        action="store_true",
        help="Bump patch version (e.g., 0.1.124 -> 0.1.125)",
    )
    parser.add_argument(
        "--minor",
        action="store_true",
        help="Bump minor version (e.g., 0.1.124 -> 0.2.0)",
    )
    parser.add_argument(
        "--major",
        action="store_true",
        help="Bump major version (e.g., 0.1.124 -> 1.0.0)",
    )
    parser.add_argument(
        "-b",
        "--branch",
        help="Target branch name. If omitted, commits to current branch.",
    )

    args = parser.parse_args()

    version_flags = [args.patch, args.minor, args.major]
    if sum(version_flags) > 1:
        print("Error: Only one version bump flag can be specified at a time.")
        sys.exit(1)

    bump_type = None
    if args.patch:
        bump_type = "patch"
    elif args.minor:
        bump_type = "minor"
    elif args.major:
        bump_type = "major"

    original_branch = get_current_branch()

    if args.branch:
        create_or_checkout_branch(args.branch)

    new_version = None
    if bump_type:
        new_version = bump_version(bump_type)
        print(f"Version bumped to {new_version}")

    subprocess.run(["git", "add", "-A"], check=True)
    subprocess.run(["git", "commit", "-m", args.message], check=True)
    subprocess.run(["git", "push"], check=True)

    if new_version:
        print(f"Released v{new_version}")
    else:
        print(f"Committed and pushed to {args.branch or original_branch}")


if __name__ == "__main__":
    main()