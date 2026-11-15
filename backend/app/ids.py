"""ULID generation (CONTRACTS.md §2) without a dependency: 48-bit millisecond time + 80 random bits, Crockford base32."""

import datetime as dt
import secrets

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def new_ulid(now: dt.datetime | None = None) -> str:
    now = now or dt.datetime.now(dt.UTC)
    millis = int(now.timestamp() * 1000) & ((1 << 48) - 1)
    value = (millis << 80) | secrets.randbits(80)
    chars = []
    for _ in range(26):
        chars.append(_CROCKFORD[value & 31])
        value >>= 5
    return "".join(reversed(chars))
