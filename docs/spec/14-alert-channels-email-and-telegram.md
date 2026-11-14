## Alert channels: email and Telegram · New

Email ships first, a Telegram bot is the second channel, and WhatsApp goes on the roadmap with the reason stated in the video and the docs.

| Channel | Setup | Constraint | Status |
| --- | --- | --- | --- |
| Email (Resend) | API key, as in Email alerts | Without a domain, the test sender reaches only your own account's email | Must have |
| Telegram bot | Free; one chat with @BotFather gives a bot token; alerts are plain HTTPS calls ([Telegram](https://core.telegram.org/bots)) | Bots cannot start conversations: the farmer opens the bot and presses Start once ([Telegram](https://core.telegram.org/bots)) | Nice to have, after email |
| WhatsApp Business Platform | Meta business account and message templates | Business-initiated messages need pre-approved templates and prior opt-in; scaling past the initial limit requires business verification and display-name approval ([tyntec](https://www.tyntec.com/helpcenter/docs/channels/whatsapp-business/message-templates/message-types/)) | Roadmap |

**Why not WhatsApp, for the video and the docs.** "WhatsApp is where most of our farmers chat, but Meta requires a verified business, pre-approved message templates and opt-in before any alert can be pushed: no team can clear that in a hackathon weekend. Telegram's bot platform is free and open to any developer in minutes. The trade-off is reach, since fewer farmers have Telegram installed, so email stays the default and WhatsApp is the first item on our roadmap."

**Telegram onboarding.** The Alerts screen shows a QR code and a link of the form t.me/\<bot>?start=\<farm code>. When the farmer presses Start, the bot saves their chat id against the farm in Supabase and confirms in Spanish. From then on it mirrors the email: Severe alerts only, plus an optional daily summary. Commands such as /estado return the farm status.

**Prompt for Claude Code.** "Add a Telegram channel to the FastAPI backend: TELEGRAM\_BOT\_TOKEN from the environment; a webhook that handles /start with a farm code and stores the chat id in a Supabase telegram\_subscribers table; send\_severe\_telegram reusing the email's deduplication per lot and episode; an /estado command returning farm status in Spanish; never log the token."

