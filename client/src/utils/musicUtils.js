export function isHttpUrl(url) {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function detectMusicService(url) {
  if (!isHttpUrl(url)) {
    return 'Other link';
  }

  const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');

  if (hostname === 'youtu.be' || hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
    return 'YouTube';
  }

  if (hostname === 'spotify.com' || hostname.endsWith('.spotify.com')) {
    return 'Spotify';
  }

  if (hostname === 'soundcloud.com' || hostname.endsWith('.soundcloud.com')) {
    return 'SoundCloud';
  }

  if (hostname === 'bandcamp.com' || hostname.endsWith('.bandcamp.com')) {
    return 'Bandcamp';
  }

  if (hostname === 'music.apple.com' || hostname.endsWith('.music.apple.com')) {
    return 'Apple Music';
  }

  return 'Other link';
}

function safeVideoId(value) {
  return /^[A-Za-z0-9_-]{11}$/.test(value || '') ? value : '';
}

export function getSafeYouTubeEmbedUrl(url) {
  if (!isHttpUrl(url)) {
    return '';
  }

  const parsed = new URL(url);
  const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
  let videoId = '';

  if (hostname === 'youtu.be') {
    videoId = parsed.pathname.split('/').filter(Boolean)[0] || '';
  } else if (hostname === 'youtube.com' || hostname.endsWith('.youtube.com')) {
    if (parsed.pathname === '/watch') {
      videoId = parsed.searchParams.get('v') || '';
    } else if (parsed.pathname.startsWith('/shorts/')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
    } else if (parsed.pathname.startsWith('/embed/')) {
      videoId = parsed.pathname.split('/').filter(Boolean)[1] || '';
    }
  }

  const cleanVideoId = safeVideoId(videoId);
  return cleanVideoId ? `https://www.youtube-nocookie.com/embed/${cleanVideoId}` : '';
}

export function getSongSummary({ profileSongTitle, profileSongArtist }) {
  const title = profileSongTitle || 'Untitled';
  const artist = profileSongArtist || 'Unknown Artist';
  return `${title} by ${artist}`;
}
