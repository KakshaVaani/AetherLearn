"""Dev helper: editable-install workspace packages via pip."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


def main() -> int:
    backend_root = Path(__file__).resolve().parent.parent
    packages_root = backend_root / "packages"
    if not packages_root.is_dir():
        print(f"No packages dir at {packages_root}", file=sys.stderr)
        return 1

    dirs = sorted(
        p for p in packages_root.iterdir() if p.is_dir() and (p / "pyproject.toml").exists()
    )
    if not dirs:
        print("No package directories with pyproject.toml found.", file=sys.stderr)
        return 1

    exit_code = 0
    for pkg in dirs:
        print(f"Installing {pkg.name} (editable)...")
        cmd = [sys.executable, "-m", "pip", "install", "-e", str(pkg)]
        rv = subprocess.run(cmd, shell=False)  # noqa: S603
        if rv.returncode != 0:
            print(f"Failed to install {pkg.name} (exit {rv.returncode})", file=sys.stderr)
            exit_code = rv.returncode or 1
    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
