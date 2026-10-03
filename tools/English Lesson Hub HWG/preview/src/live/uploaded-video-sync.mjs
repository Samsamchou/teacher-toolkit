export const VIDEO_COMMAND_WAIT_MS = 12000;

// A local teacher gesture must not be undone by the last polled room snapshot
// while its authoritative control request is still in flight.
export function videoCommandStatus(pending, state, blockId, assetId, now) {
  if (!pending) return 'none';
  const matchesSource = state?.blockId === blockId && state?.assetId === assetId;
  const newer = Number.isInteger(state?.sequence) && state.sequence > pending.sequence;
  const matchesAction = pending.action === 'play'
    ? state?.playing === true
    : pending.action === 'pause'
      ? state?.playing === false
      : Math.abs((state?.position ?? NaN) - pending.position) < 0.5;
  if (matchesSource && newer && matchesAction) return 'confirmed';
  return now - pending.startedAt < VIDEO_COMMAND_WAIT_MS ? 'waiting' : 'expired';
}

// Programmatic play/pause from room sync must not echo back as a new teacher command.
export function shouldSendNativePlaybackEvent(event, state, pending) {
  const expectedPlaying = pending ? pending.expectedPlaying : state?.playing === true;
  return event === 'play' ? !expectedPlaying : expectedPlaying;
}

export function isSyncSeekEvent(mark, position, now) {
  return Boolean(mark && now - mark.at >= 0 && now - mark.at < 10000
    && Math.abs(position - mark.position) < 0.75);
}
