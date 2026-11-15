// Alerts screen channels (block 4): a test Severe email (hCaptcha, api-engineer's /alerts/test-email) and the Telegram
// bot link. hCaptcha loads only when the user focuses the form or taps send (data/hcaptcha.ts); the address is sent
// once in the request and never stored.
import { useEffect, useRef, useState } from 'react';
import { Button, Card } from './ui';
import { hcaptchaSiteKey, loadHCaptcha, type HCaptchaApi } from '../data/hcaptcha';
import { looksLikeEmail, sendTestEmail, type TestEmailOutcome } from '../data/testEmail';
import { usePrefs } from '../state/prefs';
import type { MessageKey } from '../i18n';

type Phase = 'idle' | 'captcha' | 'sending' | 'waking';

const OUTCOME: Record<TestEmailOutcome, MessageKey> = {
  sent: 'alerts.email.sent',
  limited_demo: 'alerts.email.limited',
  captcha: 'alerts.email.captcha',
  invalid: 'alerts.email.invalid',
  rate_limited: 'alerts.email.rate',
  provider: 'alerts.email.provider',
  not_configured: 'alerts.email.notConfigured',
  network: 'alerts.email.network',
  timeout: 'alerts.email.timeout',
  unexpected: 'alerts.email.unexpected',
};

function resolvedTheme(pref: 'system' | 'light' | 'dark'): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function EmailAlertCard() {
  const { prefs, t } = usePrefs();
  const [email, setEmail] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState<MessageKey | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const api = useRef<HCaptchaApi | null>(null);
  const widget = useRef<string | undefined>(undefined);
  const token = useRef<string | null>(null);
  const emailRef = useRef(email);
  emailRef.current = email;

  useEffect(
    () => () => {
      try {
        api.current?.remove?.(widget.current);
      } catch {
        /* widget already gone */
      }
    },
    [],
  );

  const reset = () => {
    token.current = null;
    try {
      api.current?.reset(widget.current);
    } catch {
      /* ignore */
    }
  };

  const send = async (captchaToken: string) => {
    const address = emailRef.current;
    if (!looksLikeEmail(address)) {
      setMessage('alerts.email.invalid');
      return;
    }
    setPhase('sending');
    setMessage(null);
    const outcome = await sendTestEmail({ email: address, captchaToken, lang: prefs.language }, { onSlow: () => setPhase('waking') });
    // A captcha token is single use: reset after every request, whatever the answer.
    reset();
    setPhase('captcha');
    setMessage(OUTCOME[outcome]);
  };

  /** Loads hCaptcha once (on focus or on the first send) and renders the checkbox. */
  const ensureCaptcha = async (): Promise<boolean> => {
    if (api.current) return true;
    const siteKey = hcaptchaSiteKey();
    if (!siteKey) {
      setMessage('alerts.email.notConfigured');
      return false;
    }
    if (!box.current) return false;
    try {
      api.current = await loadHCaptcha();
    } catch {
      setMessage('alerts.email.captchaLoad');
      return false;
    }
    widget.current = api.current.render(box.current, {
      sitekey: siteKey,
      size: 'compact',
      theme: resolvedTheme(prefs.theme),
      hl: prefs.language,
      callback: (tok: string) => {
        token.current = tok;
        void send(tok);
      },
      'expired-callback': () => {
        reset();
        setMessage('alerts.email.captchaExpired');
      },
      'error-callback': () => {
        reset();
        setMessage('alerts.email.captcha');
      },
    });
    setPhase('captcha');
    return true;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!looksLikeEmail(email)) return setMessage('alerts.email.invalid');
    if (!(await ensureCaptcha())) return;
    if (token.current) return void send(token.current);
    setMessage('alerts.email.tick');
  };

  const busy = phase === 'sending' || phase === 'waking';
  return (
    <Card title={t('alerts.email.title')}>
      <form className="flex flex-col gap-3" onSubmit={onSubmit} onFocus={() => void ensureCaptcha()} noValidate>
        <label className="flex flex-col gap-1 text-footnote font-semibold text-ink-2">
          {t('alerts.email.label')}
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            enterKeyHint="send"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            maxLength={254}
            className="min-h-12 w-full rounded-control border border-line-strong bg-surface px-3 text-[17px] text-ink"
          />
        </label>
        <p className="m-0 text-footnote text-ink-3">{t('alerts.email.help')}</p>
        <div ref={box} />
        <Button type="submit" disabled={busy}>
          {t('alerts.email.send')}
        </Button>
        <p role="status" aria-live="polite" className="m-0 text-callout text-ink">
          {phase === 'waking' ? t('alerts.email.waking') : phase === 'sending' ? t('alerts.email.sending') : message ? t(message) : ''}
        </p>
      </form>
    </Card>
  );
}

export function TelegramAlertCard() {
  const { t } = usePrefs();
  return (
    <Card title={t('alerts.telegram.title')}>
      <p className="m-0 mb-3 text-callout text-ink-2">{t('alerts.telegram.help')}</p>
      <a
        href="https://t.me/DemenovaBot?start"
        target="_blank"
        rel="noopener noreferrer"
        className="dn-press inline-flex min-h-12 items-center justify-center rounded-control bg-surface-2 px-5 text-body font-semibold text-ink no-underline"
      >
        {t('alerts.telegram.open')}
      </a>
    </Card>
  );
}
