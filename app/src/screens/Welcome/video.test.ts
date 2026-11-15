import { describe, expect, it } from 'vitest';
import { embedUrl, loadIntroVideoId, parseYouTubeId } from './video';

const ID = 'dQw4w9WgXcQ';

describe('parseYouTubeId', () => {
  it('reads the watch, short, embed and shorts forms', () => {
    expect(parseYouTubeId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://youtube.com/watch?v=${ID}&t=12s`)).toBe(ID);
    expect(parseYouTubeId(`https://m.youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://youtu.be/${ID}?si=abc`)).toBe(ID);
    expect(parseYouTubeId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(parseYouTubeId(`https://www.youtube-nocookie.com/embed/${ID}?autoplay=1`)).toBe(ID);
    expect(parseYouTubeId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(parseYouTubeId(`  https://youtu.be/${ID}  `)).toBe(ID);
  });

  it('rejects empty, foreign and malformed input', () => {
    for (const bad of [
      '',
      '   ',
      null,
      undefined,
      42,
      ID, // a bare id is not a link
      `https://evil.example/watch?v=${ID}`,
      `https://youtube.com.evil.example/watch?v=${ID}`,
      `javascript:alert(1)//youtu.be/${ID}`,
      `ftp://youtu.be/${ID}`,
      'https://www.youtube.com/watch?v=short',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ1', // 12 characters
      'https://youtu.be/dQw4w9WgX"Q', // a quote is not an id character
      'https://www.youtube.com/watch?list=PL123',
      'https://www.youtube.com/',
    ]) {
      expect(parseYouTubeId(bad)).toBeNull();
    }
  });
});

describe('embedUrl', () => {
  it('builds the privacy-enhanced, muted, looping address', () => {
    expect(embedUrl(ID)).toBe(
      `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1&mute=1&loop=1&playlist=${ID}&playsinline=1&rel=0`,
    );
  });

  it('refuses anything that is not an id', () => {
    expect(() => embedUrl('../../x')).toThrow();
  });
});

describe('loadIntroVideoId', () => {
  const reply = (body: unknown, ok = true) =>
    (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

  it('is null for the shipped empty file', async () => {
    expect(await loadIntroVideoId(reply({ intro_video_url: '' }))).toBeNull();
  });

  it('returns the id of a valid link', async () => {
    expect(await loadIntroVideoId(reply({ intro_video_url: `https://youtu.be/${ID}` }))).toBe(ID);
  });

  it('is null when the file is missing or broken', async () => {
    expect(await loadIntroVideoId(reply({}, false))).toBeNull();
    expect(await loadIntroVideoId(reply('not an object'))).toBeNull();
    const failing = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await loadIntroVideoId(failing)).toBeNull();
  });
});
