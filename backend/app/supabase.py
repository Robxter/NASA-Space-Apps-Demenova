"""Minimal Supabase PostgREST client over httpx (no extra dependency). Service role key: server side only.

Errors carry the table, the method and the HTTP status only, never the response body (it may hold personal data)
nor any header.
"""

from typing import Any

import httpx


class SupabaseError(RuntimeError):
    """A Supabase call failed. The message names no secret and no row content."""


class SupabaseRest:
    def __init__(self, base_url: str, service_role_key: str, client: httpx.Client | None = None) -> None:
        self._base = f"{base_url.rstrip('/')}/rest/v1"
        self._headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }
        self._client = client or httpx.Client(timeout=10.0)

    def _call(self, method: str, table: str, *, params: dict[str, str] | None = None,
              json: Any = None, prefer: str | None = None) -> Any:
        headers = dict(self._headers)
        if prefer:
            headers["Prefer"] = prefer
        try:
            response = self._client.request(method, f"{self._base}/{table}", params=params, json=json, headers=headers)
        except httpx.HTTPError as exc:
            raise SupabaseError(f"{method} {table}: {type(exc).__name__}") from None
        if response.status_code >= 400:
            raise SupabaseError(f"{method} {table}: HTTP {response.status_code}")
        if not response.content:
            return None
        try:
            return response.json()
        except ValueError:
            raise SupabaseError(f"{method} {table}: response is not JSON") from None

    def select(self, table: str, params: dict[str, str]) -> list[dict[str, Any]]:
        rows = self._call("GET", table, params=params)
        if not isinstance(rows, list):
            raise SupabaseError(f"GET {table}: expected a list")
        return rows

    def insert(self, table: str, row: dict[str, Any]) -> None:
        self._call("POST", table, json=row, prefer="return=minimal")

    def update(self, table: str, filters: dict[str, str], values: dict[str, Any]) -> None:
        self._call("PATCH", table, params=filters, json=values, prefer="return=minimal")

    def update_returning(self, table: str, filters: dict[str, str], values: dict[str, Any],
                         select: str = "id") -> list[dict[str, Any]]:
        """PATCH and return the rows it changed: a conditional update is an atomic claim (one UPDATE ... WHERE)."""
        rows = self._call("PATCH", table, params={**filters, "select": select}, json=values,
                          prefer="return=representation")
        if not isinstance(rows, list):
            raise SupabaseError(f"PATCH {table}: expected a list")
        return rows

    def upsert(self, table: str, row: dict[str, Any], on_conflict: str) -> None:
        self._call("POST", table, params={"on_conflict": on_conflict}, json=row,
                   prefer="resolution=merge-duplicates,return=minimal")

    def delete(self, table: str, filters: dict[str, str]) -> None:
        self._call("DELETE", table, params=filters, prefer="return=minimal")
