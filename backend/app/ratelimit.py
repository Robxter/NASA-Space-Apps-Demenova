"""In-process sliding-window rate limits (one Render instance; a restart clears them, which is acceptable)."""

import threading
import time
from collections import deque
from collections.abc import Callable

MAX_KEYS = 20_000  # memory bound: the oldest keys are dropped first


class SlidingWindowLimiter:
    def __init__(self, limit: int, window_s: float, clock: Callable[[], float] = time.monotonic) -> None:
        self.limit, self.window_s, self._clock = limit, window_s, clock
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        hits = self._hits.get(key)
        if hits is None:
            return deque()
        while hits and now - hits[0] >= self.window_s:
            hits.popleft()
        if not hits:
            del self._hits[key]
        return hits

    def allowed(self, key: str) -> bool:
        """True when one more hit fits; does not record it."""
        with self._lock:
            return len(self._prune(key, self._clock())) < self.limit

    def hit(self, key: str) -> None:
        with self._lock:
            now = self._clock()
            hits = self._prune(key, now)
            if key not in self._hits:
                if len(self._hits) >= MAX_KEYS:
                    del self._hits[next(iter(self._hits))]
                self._hits[key] = hits
            hits.append(now)

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()


class GlobalWindowLimiter:
    """One counter for the whole process: nothing to evict, so flooding other keys cannot reset it."""

    def __init__(self, limit: int, window_s: float, clock: Callable[[], float] = time.monotonic) -> None:
        self.limit, self.window_s, self._clock = limit, window_s, clock
        self._hits: deque[float] = deque()
        self._lock = threading.Lock()

    def take(self) -> bool:
        """Record one use and return True if it fits in the window; otherwise record nothing and return False."""
        with self._lock:
            now = self._clock()
            while self._hits and now - self._hits[0] >= self.window_s:
                self._hits.popleft()
            if len(self._hits) >= self.limit:
                return False
            self._hits.append(now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
