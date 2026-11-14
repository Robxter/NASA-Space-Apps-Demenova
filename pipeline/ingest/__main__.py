"""Ingest command line. Run from the repository root:

    uv run python -m pipeline.ingest <step> [--start YYYY-MM-DD] [--end YYYY-MM-DD] [--replay START:END]

Steps: auth (login check, prints no secrets), aoi (SRTM + catchment), ndvi (composite), lots (synthetic demo lots),
power (POWER daily [+ hourly for --replay]), imerg (catchment daily + top-15 72 h events; needs Earthdata),
replay (harmonized stack for --replay, default 2026-02-15:2026-03-05). Every step is idempotent (cached downloads).
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys

DEFAULT_REPLAY = "2026-02-15:2026-03-05"
HISTORY_START = "2015-01-01"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m pipeline.ingest")
    parser.add_argument("step", choices=["auth", "aoi", "ndvi", "lots", "power", "imerg", "replay"])
    parser.add_argument("--start", default=HISTORY_START)
    parser.add_argument("--end", default=None, help="default: yesterday (UTC)")
    parser.add_argument("--replay", default=DEFAULT_REPLAY, help="START:END frozen demo window")
    args = parser.parse_args(argv)
    end = args.end or (dt.datetime.now(dt.timezone.utc).date() - dt.timedelta(days=1)).isoformat()

    from pipeline.ingest import replay as replay_mod

    if args.step == "auth":
        from pipeline.ingest.auth import login
        print("authenticated:", login() is not None)
        return 0
    if args.step == "aoi":
        from pipeline.ingest import aoi
        result = aoi.run()
    elif args.step == "ndvi":
        from pipeline.common.grid import grid_from_lonlat
        from pipeline.ingest import aoi, ndvi
        start = args.start if args.start != HISTORY_START else "2025-11-01"
        result = ndvi.composite(aoi.FARM_BOX, grid_from_lonlat(*aoi.FARM_BOX), start, end, aoi.AOI_ID,
                                aoi.PROCESSED / "ndvi" / f"ndvi_composite_{start}_{end}.tif")
    elif args.step == "lots":
        from pipeline.ingest import lots
        result = [f["properties"]["id"] for f in lots.run()]
    elif args.step == "power":
        from pipeline.ingest import aoi, power
        a, b = args.replay.split(":")
        result = power.run(aoi.FARM_BOX, args.start, end, aoi.AOI_ID, a, b)
    elif args.step == "imerg":
        from pipeline.ingest import imerg
        try:
            result = imerg.run(dt.date.fromisoformat(args.start), dt.date.fromisoformat(end))
        except PermissionError as error:
            print(f"blocked: {error}", file=sys.stderr)
            return 3
    else:
        result = replay_mod.build(*replay_mod.parse_window(args.replay))
    print(json.dumps(result, default=str, indent=1)[:4000])
    return 0


if __name__ == "__main__":
    sys.exit(main())
