## Email alerts: how to send them · New

Use a transactional email service called through its web API from the Python backend; it is about 20 lines of code and Claude Code can write all of it. Plan A is Resend; Plan B is Gmail with an app password.

**Plan A: Resend.**

1. Create a free Resend account and an API key.
2. Without a domain of your own, Resend's test sender delivers only to the email address of your Resend account. That is enough for the demo: send the alert to yourself and film it arriving. With a domain you own, verify it in Resend to email anyone. Check Resend's current docs for the exact limits.
3. Save the key as `RESEND_API_KEY` in Render's environment variables and in GitHub's encrypted secrets. Never in the code.
4. Send only on a confirmed transition into Severe, once per lot per Severe episode: log every send in Supabase `email_log` with lot, episode start, status and provider id, and skip a send that already exists.

```python
import os, requests

def send_severe_email(to: str, lot: str, w: float, factors: str, updated_at: str) -> str:
    r = requests.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
        json={
            "from": "Demenova Alerts <onboarding@resend.dev>",
            "to": [to],
            "subject": f"SEVERE flood risk / Riesgo SEVERO: {lot}",
            "html": f"<p>Lot {lot} reached Severe (W = {w:.2f}).</p>"
                    f"<p>Main factors: {factors}</p>"
                    f"<p>Data updated: {updated_at}</p>",
        },
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["id"]
```

**Plan B: Gmail SMTP.** Turn on 2-step verification on a Gmail account, create an app password, and send with Python's built-in `smtplib`. It reaches any address without a domain, but is less reliable for volume; fine for a demo.

**Prompt for Claude Code.** "Add an email module to the FastAPI backend: send\_severe\_email via Resend's API using RESEND\_API\_KEY from the environment; call it only when a lot transitions into Severe; deduplicate per lot and episode using the Supabase email\_log table; add a protected /email/test endpoint that requires an X-Admin-Token header; never log the API key."

**In the video.** Show the lot turning red in replay, then the phone receiving the email: two seconds that prove the system acts, not just displays.

