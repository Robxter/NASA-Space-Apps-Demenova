// "Connect this device for sync" (D-032): loads hCaptcha only on tap, then signs in anonymously with the token.
// Any failure leaves the app working on this device; the message says what happened.
import { useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { hcaptchaSiteKey } from '../data/hcaptcha';
import { startConnect, syncConfigured, type ConnectError } from '../data/identity';
import { useData } from '../state/data';
import { usePrefs } from '../state/prefs';
import type { MessageKey } from '../i18n';

const MESSAGES: Record<ConnectError, MessageKey> = {
  unconfigured: 'connect.unconfigured',
  offline: 'connect.offline',
  'captcha-load': 'connect.captchaLoad',
  captcha: 'connect.captcha',
  'captcha-expired': 'connect.captchaExpired',
  'captcha-closed': 'connect.captchaClosed',
  supabase: 'connect.supabase',
};

function resolvedTheme(pref: 'system' | 'light' | 'dark'): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ConnectDevice() {
  const { prefs, t } = usePrefs();
  const { identity, setIdentity, online } = useData();
  const box = useRef<HTMLDivElement>(null);
  const cleanup = useRef<(() => void) | null>(null);
  const [state, setState] = useState<'idle' | 'loading' | 'widget'>('idle');
  const [message, setMessage] = useState<MessageKey | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  if (identity.status === 'signed-in' || identity.status === 'pending') return null;

  const connect = async () => {
    if (!box.current || state !== 'idle') return;
    setMessage(null);
    setState('loading');
    cleanup.current = await startConnect({
      siteKey: hcaptchaSiteKey(),
      supabaseConfigured: syncConfigured(),
      online,
      container: box.current,
      lang: prefs.language,
      theme: resolvedTheme(prefs.theme),
      onResult: (r) => {
        if (r.ok) {
          setIdentity(r.identity);
          setMessage('connect.done');
          cleanup.current?.();
          cleanup.current = null;
          setState('idle');
        } else setMessage(MESSAGES[r.error]);
      },
    });
    setState(cleanup.current ? 'widget' : 'idle');
  };

  return (
    <div className="flex flex-col gap-2">
      {state === 'idle' ? (
        <Button variant="secondary" block onClick={() => void connect()}>
          {t('connect.button')}
        </Button>
      ) : (
        <p className="m-0 text-callout text-ink-2">{state === 'loading' ? t('common.loading') : t('connect.help')}</p>
      )}
      <div ref={box} />
      {message ? (
        <p role="status" className="m-0 text-callout text-ink">
          {t(message)}
        </p>
      ) : null}
    </div>
  );
}
