"""Earthdata authentication for the ingest pipeline.

Credentials come only from the process environment (EARTHDATA_USERNAME / EARTHDATA_PASSWORD). For local runs, the
EARTHDATA_* keys of the git-ignored `.env` at the repository root are copied into the environment if they are not
already set. Nothing here ever prints or logs a credential value.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
_PREFIX = "EARTHDATA_"


def load_earthdata_env(env_file: Path | None = None) -> list[str]:
    """Copy EARTHDATA_* keys from `.env` into os.environ (existing values win). Returns key names only."""
    path = env_file or REPO_ROOT / ".env"
    loaded: list[str] = []
    if not path.exists():
        return loaded
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key.startswith("export "):
            key = key[len("export ") :].strip()
        value = value.strip().strip('"').strip("'")
        if key.startswith(_PREFIX) and value:
            os.environ.setdefault(key, value)
            loaded.append(key)
    return sorted(loaded)


def login():
    """Log in to NASA Earthdata with strategy="environment". Returns the earthaccess Auth or None."""
    import earthaccess

    load_earthdata_env()
    if not (os.environ.get("EARTHDATA_USERNAME") and os.environ.get("EARTHDATA_PASSWORD")):
        return None
    logging.getLogger("earthaccess").setLevel(logging.WARNING)
    try:
        auth = earthaccess.login(strategy="environment")
    except Exception:  # never surface the exception text: it could echo the username
        return None
    return auth if auth is not None and getattr(auth, "authenticated", False) else None


if __name__ == "__main__":
    keys = load_earthdata_env()
    print("EARTHDATA keys present in .env:", keys)
    print("authenticated:", login() is not None)
