#!/usr/bin/env python3
import json
import subprocess
import sys

def main():
    if len(sys.argv) < 2:
        print("Usage: python release.py <commit message>")
        sys.exit(1)

    message = " ".join(sys.argv[1:])

    # Read and bump patch version
    with open("package.json", "r") as f:
        pkg = json.load(f)

    parts = pkg["version"].split(".")
    parts[2] = str(int(parts[2]) + 1)
    pkg["version"] = ".".join(parts)

    with open("package.json", "w") as f:
        json.dump(pkg, f, indent=2)
        f.write("\n")

    print(f"Version bumped to {pkg['version']}")

    # Stage, commit, push
    subprocess.run(["git", "add", "-A"], check=True)
    subprocess.run(["git", "commit", "-m", message], check=True)
    subprocess.run(["git", "push"], check=True)

    print(f"Released v{pkg['version']}")

if __name__ == "__main__":
    main()
