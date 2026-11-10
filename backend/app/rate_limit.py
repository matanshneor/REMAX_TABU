"""In-memory sliding-window rate limit. The backend runs as one instance, so memory is enough."""

import threading
import time
from collections import deque


class RateLimiter:
    def __init__(self, limit: int, window_seconds: float) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def allow(self, key: str) -> bool:
        """Records a hit for `key` and says whether it is within the limit."""
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                return False
            hits.append(now)
            # Forget keys that went quiet, so the dict doesn't grow forever.
            if len(self._hits) > 10_000:
                self._hits = {k: v for k, v in self._hits.items() if v and now - v[-1] <= self.window}
            return True

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()
