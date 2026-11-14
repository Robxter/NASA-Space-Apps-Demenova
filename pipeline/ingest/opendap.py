"""NASA cloud OPeNDAP (Hyrax) helpers: CMR granule listing, cached DAP4 CSV subsets, CSV parsing.

A subset request is `<granule OPeNDAP URL>.dap.csv?dap4.ce=<var>[a:b][c:d];...`. Response lines are either
`/var, v0, v1, ...` (1-D) or `/var[i]...[j], v0, v1, ...` (the last dimension runs along the line).
Note: a hyperslab one element wide in the last dimension returns empty rows, so request at least two.
"""

from __future__ import annotations

import datetime as dt
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Any, Callable

import httpx
import numpy as np

from pipeline.common.provenance import write_sidecar
from pipeline.ingest.cache import USER_AGENT

CMR_GRANULES = "https://cmr.earthdata.nasa.gov/search/granules.umm_json"
_INDEX = re.compile(r"\[(\d+)\]")


def parse_dap_csv(text: str) -> dict[str, np.ndarray]:
    """Parse Hyrax DAP4 CSV into {variable path: array}; leading indices become leading dimensions."""
    rows: dict[str, dict[tuple[int, ...], list[float]]] = {}
    for line in text.splitlines():
        if not line.startswith("/"):
            continue
        head, _, values = line.partition(",")
        name = head.split("[", 1)[0].strip()
        index = tuple(int(i) for i in _INDEX.findall(head))
        rows.setdefault(name, {})[index] = [float(v) for v in values.split(",") if v.strip()]
    out = {}
    for name, entries in rows.items():
        keys = sorted(entries)
        if keys == [()]:
            out[name] = np.array(entries[()], dtype="float64")
            continue
        lead = tuple(max(k[d] for k in keys) + 1 for d in range(len(keys[0])))
        out[name] = np.array([entries[k] for k in keys], dtype="float64").reshape(*lead, -1)
    return out


def list_granules(short_name: str, version: str, start: dt.date, end: dt.date) -> list[dict[str, Any]]:
    """All granules of a collection in [start, end] from CMR (no login): begin time, GranuleUR, OPeNDAP URL."""
    out: list[dict[str, Any]] = []
    headers = {"User-Agent": USER_AGENT}
    params = {"short_name": short_name, "version": version, "page_size": 2000, "sort_key": "start_date",
              "temporal": f"{start.isoformat()}T00:00:00Z,{end.isoformat()}T23:59:59Z"}
    with httpx.Client(timeout=120, headers=headers) as client:
        while True:
            response = client.get(CMR_GRANULES, params=params)
            response.raise_for_status()
            items = response.json().get("items", [])
            for it in items:
                umm = it["umm"]
                op = [u["URL"] for u in umm.get("RelatedUrls", []) if "opendap.earthdata.nasa.gov" in u.get("URL", "")]
                out.append({"begin": umm["TemporalExtent"]["RangeDateTime"]["BeginningDateTime"], "ur": umm["GranuleUR"],
                            "opendap": op[0] if op else None})
            after = response.headers.get("CMR-Search-After")
            if not items or not after or len(items) < params["page_size"]:
                break
            headers["CMR-Search-After"] = after
            client.headers.update(headers)
    return out


_local = threading.local()


def _session(factory: Callable[[], Any]):
    if not hasattr(_local, "session"):
        _local.session = factory()
    return _local.session


def fetch_subsets(jobs: list[tuple[str, str, Path, dict]], session_factory: Callable[[], Any], workers: int = 6) -> list[Path | None]:
    """Fetch (opendap_url, constraint, cache_path, provenance) jobs in parallel; cached files are not re-fetched.

    Returns the path per job, or None when the request failed (the caller records it as missing).
    """

    def one(job):
        url, ce, path, prov = job
        if path.is_file() and path.stat().st_size > 0:
            return path
        for _ in range(3):
            try:
                response = _session(session_factory).get(url + ".dap.csv", params={"dap4.ce": ce}, timeout=180)
                if response.status_code == 200 and response.text.startswith("Dataset:"):
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_text(response.text, encoding="utf-8")
                    write_sidecar(path, prov, origin="sourced")
                    return path
            except Exception:  # network hiccup: retry, then report missing
                pass
        return None

    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(one, jobs))
