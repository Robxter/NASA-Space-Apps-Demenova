"""Server-side hCaptcha verification.

Checked 2026-11-15 against https://docs.hcaptcha.com/ ("Verify the User Response Server Side"): POST
https://api.hcaptcha.com/siteverify, application/x-www-form-urlencoded (not JSON), parameters `secret` and `response`
(required), `remoteip` (recommended), `sitekey` (optional, recommended); JSON reply with `success` and optional
`error-codes`. Tokens are single use and expire shortly after issue.
"""

import logging

import httpx

log = logging.getLogger("demenova.captcha")

SITEVERIFY_URL = "https://api.hcaptcha.com/siteverify"


class CaptchaUnavailable(RuntimeError):
    """hCaptcha could not be reached or answered nonsense (not the user's fault)."""


class HCaptchaVerifier:
    def __init__(self, secret: str, sitekey: str | None = None, client: httpx.Client | None = None) -> None:
        self._secret, self._sitekey = secret, sitekey
        self._client = client or httpx.Client(timeout=8.0)

    def verify(self, token: str, remoteip: str | None = None) -> bool:
        form = {"secret": self._secret, "response": token}
        if remoteip:
            form["remoteip"] = remoteip
        if self._sitekey:
            form["sitekey"] = self._sitekey
        try:
            response = self._client.post(SITEVERIFY_URL, data=form)
            data = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise CaptchaUnavailable(type(exc).__name__) from None
        if not isinstance(data, dict):
            raise CaptchaUnavailable("unexpected reply")
        if data.get("success") is True:
            return True
        codes = data.get("error-codes")
        codes = [c for c in codes if isinstance(c, str)][:5] if isinstance(codes, list) else []
        if any(c in {"missing-input-secret", "invalid-input-secret"} for c in codes):
            log.error("hCaptcha rejected the server configuration: %s", ",".join(codes))
            raise CaptchaUnavailable("configuration")
        log.info("hCaptcha token rejected: %s", ",".join(codes) or "no code")
        return False
