// The Welcome routing hook (D-036): empty hash and #welcome... open the reception; every app hash is unchanged.
import { describe, expect, it } from 'vitest';
import { href, parseHash } from '../../state/nav';

describe('Welcome routing', () => {
  it('opens Welcome on an empty hash and on #welcome', () => {
    for (const h of ['', '#', '#/', '#welcome', '#welcome/']) {
      expect(parseHash(h).route).toEqual({ name: 'welcome', tab: 'home' });
    }
    expect(parseHash('#welcome/instructions').route).toEqual({ name: 'welcome', tab: 'instructions' });
    expect(parseHash('#welcome/qa').route).toEqual({ name: 'welcome', tab: 'qa' });
    expect(parseHash('#welcome/nonsense').route).toEqual({ name: 'welcome', tab: 'home' });
  });

  it('keeps every app hash as before', () => {
    expect(parseHash('#home').route).toEqual({ name: 'home' });
    expect(parseHash('#map?d=2026-02-22')).toEqual({ route: { name: 'map' }, date: '2026-02-22' });
    expect(parseHash('#alerts').route).toEqual({ name: 'alerts' });
    expect(parseHash('#learn').route).toEqual({ name: 'learn' });
    expect(parseHash('#settings').route).toEqual({ name: 'settings' });
    expect(parseHash('#setup').route).toEqual({ name: 'setup' });
    expect(parseHash('#lot/lot_demo-el-oro_1').route).toEqual({ name: 'lot', id: 'lot_demo-el-oro_1' });
    expect(parseHash('#strategies/lot_demo-el-oro_1').route).toEqual({ name: 'strategies', id: 'lot_demo-el-oro_1' });
    expect(parseHash('#unknown-screen').route).toEqual({ name: 'home' });
  });

  it('writes Welcome links', () => {
    expect(href({ name: 'welcome', tab: 'home' })).toBe('#welcome');
    expect(href({ name: 'welcome', tab: 'qa' })).toBe('#welcome/qa');
    expect(href({ name: 'home' })).toBe('#home');
  });
});
