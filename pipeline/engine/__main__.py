"""Engine command line (owner: data-scientist). Run from the repository root:

    uv run python -m pipeline.engine kirpich | farm-rain | replay
"""

from __future__ import annotations

import argparse
import json
import sys


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m pipeline.engine")
    parser.add_argument("step", choices=["kirpich", "farm-rain", "replay"])
    parser.add_argument("--generated-at", default=None, help="UTC timestamp written as generated_at (default: now)")
    args = parser.parse_args(argv)
    if args.step == "kirpich":
        from pipeline.engine.catchment import kirpich_inputs

        result = kirpich_inputs()
    elif args.step == "farm-rain":
        from pipeline.engine.run import build_farm_rain

        result = build_farm_rain()
    else:
        from pipeline.engine.run import run_replay

        result = run_replay(args.generated_at)
    print(json.dumps(result, default=str, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
