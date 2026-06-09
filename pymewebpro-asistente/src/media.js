// media.js — inbound WhatsApp media (Twilio).
//  - classifyMedia: turn a MIME type into a coarse kind.
//  - transcribeVoice: fetch a Twilio audio media URL (auth-gated) and run it
//    through OpenAI Whisper, if OPENAI_API_KEY is configured.

export function classifyMedia(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('audio/')) return 'audio';
  if (m.startsWith('video/')) return 'video';
  return 'file';
}

// Spanish-default label for a media kind (clients are Colombian).
export function mediaLabel(kind) {
  return kind === 'image' ? 'imagen'
    : kind === 'audio' ? 'nota de voz'
    : kind === 'video' ? 'video'
    : 'archivo';
}

// Fetch the Twilio media (needs Basic auth) and transcribe with Whisper.
// Returns the transcript string, or null if not possible.
export async function transcribeVoice(env, mediaUrl, mime) {
  if (!env.OPENAI_API_KEY || !env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !mediaUrl) return null;
  try {
    const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
    const audio = await fetch(mediaUrl, { headers: { Authorization: 'Basic ' + auth } });
    if (!audio.ok) { console.error('media fetch failed', audio.status); return null; }
    const buf = await audio.arrayBuffer();

    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: mime || 'audio/ogg' }), 'audio.ogg');
    fd.append('model', 'whisper-1');

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.OPENAI_API_KEY },
      body: fd,
    });
    if (!r.ok) { console.error('whisper error', await r.text()); return null; }
    const j = await r.json();
    return (j.text || '').trim() || null;
  } catch (e) {
    console.error('transcribe error', e);
    return null;
  }
}
