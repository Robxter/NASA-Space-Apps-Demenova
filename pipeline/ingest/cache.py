"""Raw-download cache: pipeline/data/raw/<product>/<version>/<name>. Never re-downloads a cached file.

Partial downloads go to the system temp directory and are moved into place only when complete, so the scanned
data folder never holds a half file. Every cached file gets a provenance sidecar (scripts/check_provenance.py
scans raw/ too).
"""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path
from typing import Any, Callable

import httpx

from pipeline.common.provenance import REPO_ROOT, sidecar_path, write_sidecar

RAW_ROOT = REPO_ROOT / "pipeline" / "data" / "raw"
USER_AGENT = "demenova-pipeline"

Fetcher = Callable[[str, Path], None]


def cache_path(product: str, version: str, name: str, root: Path | None = None) -> Path:
    for part in (product, version, name):
        if not part or "/" in part or "\\" in part or part in (".", ".."):
            raise ValueError(f"invalid cache path component: {part!r}")
    return (root or RAW_ROOT) / product / version / name


def http_fetch(url: str, dest: Path) -> None:
    """Stream `url` to `dest` (no auth)."""
    with httpx.stream("GET", url, timeout=httpx.Timeout(60.0, read=300.0), follow_redirects=True, headers={"User-Agent": USER_AGENT}) as response:
        response.raise_for_status()
        with dest.open("wb") as handle:
            for chunk in response.iter_bytes(1 << 20):
                handle.write(chunk)


def is_cached(path: Path) -> bool:
    return path.is_file() and path.stat().st_size > 0


def cached_download(url: str, dest: Path, provenance: Any, fetch: Fetcher = http_fetch, origin: Any = "sourced") -> tuple[Path, bool]:
    """Download `url` to `dest` unless it is already cached. Returns (path, downloaded_now).

    The sidecar is (re)written only when the file is downloaded or when it is missing.
    """
    if is_cached(dest):
        if not sidecar_path(dest).is_file():
            write_sidecar(dest, provenance, origin=origin)
        return dest, False
    dest.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="demenova_dl_") as tmp:
        part = Path(tmp) / (dest.name + ".part")
        fetch(url, part)
        if not is_cached(part):
            raise RuntimeError(f"empty download from {url}")
        shutil.move(str(part), str(dest))
    write_sidecar(dest, provenance, origin=origin)
    return dest, True
