// The intro video slot (D-036). app/public/site.json holds { "intro_video_url": "" }; Roberto pastes a YouTube link
// there (watch, youtu.be, shorts or embed form) and the page embeds it, muted, autoplaying and looping, from the
// privacy-enhanced host. Only an 11-character YouTube id ever reaches the iframe: no other URL is injected.

const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com', 'youtu.be']);

/** The YouTube video id from a pasted link, or null when the link is empty, foreign or malformed. */
export function parseYouTubeId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const text = input.trim();
  if (text === '' || text.length > 200) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;
  const parts = url.pathname.split('/').filter(Boolean);
  let id: string | null | undefined;
  if (host === 'youtu.be') id = parts[0];
  else if (parts[0] === 'watch') id = url.searchParams.get('v');
  else if (parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') id = parts[1];
  return id && ID.test(id) ? id : null;
}

/** The embed address for a parsed id: privacy-enhanced host, muted autoplay (required on phones), looping. */
export function embedUrl(id: string): string {
  if (!ID.test(id)) throw new Error('not a YouTube id');
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&playsinline=1&rel=0`;
}

/** Reads app/public/site.json at runtime (no build needed to change the video). Missing or broken file: null. */
export async function loadIntroVideoId(fetcher: typeof fetch = fetch): Promise<string | null> {
  try {
    const res = await fetcher('/site.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    const raw = json && typeof json === 'object' ? (json as Record<string, unknown>).intro_video_url : null;
    return parseYouTubeId(raw);
  } catch {
    return null;
  }
}
