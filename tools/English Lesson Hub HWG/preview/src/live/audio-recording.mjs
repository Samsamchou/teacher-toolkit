// PCM WAV keeps microphone recordings compatible with the existing media service.
export const RECORDING_SECONDS = 600;
export function encodeMonoWav(samples, sampleRate = 16000) {
  if (!(samples instanceof Float32Array) || samples.length > sampleRate * RECORDING_SECONDS) throw new Error('錄音限 10 分鐘。');
  const buffer = new ArrayBuffer(44 + samples.length * 2), view = new DataView(buffer);
  const ascii = (offset, value) => { for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i)); };
  ascii(0, 'RIFF'); view.setUint32(4, buffer.byteLength - 8, true); ascii(8, 'WAVE'); ascii(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, 'data'); view.setUint32(40, samples.length * 2, true);
  samples.forEach((sample, i) => { const s = Math.max(-1, Math.min(1, sample)); view.setInt16(44 + i * 2, Math.round(s * (s < 0 ? 32768 : 32767)), true); });
  return buffer;
}
export async function recordingFile(blob) {
  const Audio = window.AudioContext || window.webkitAudioContext;
  const context = new Audio();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    const length = Math.min(16000 * RECORDING_SECONDS, Math.ceil(audio.duration * 16000));
    const offline = new OfflineAudioContext(1, Math.max(1, length), 16000);
    const source = offline.createBufferSource(); source.buffer = audio; source.connect(offline.destination); source.start();
    const rendered = await offline.startRendering();
    return new File([encodeMonoWav(rendered.getChannelData(0))], `classroom-recording-${Date.now()}.wav`, { type: 'audio/wav' });
  } finally { await context.close(); }
}
