// A lesson slide is always silent; question pages request teacher-only music.
// Browser autoplay can still reject a request until the teacher enables audio.
export function teacherMusicMode({ blockType, phase, videoPlaying = false }) {
  if (phase === 'complete') return 'ended';
  if (phase === 'lobby') return 'lobby';
  if (blockType === 'slide') return 'slide';
  if (videoPlaying) return 'video';
  return 'question';
}

export function shouldPlayTeacherMusic(context, manuallyPaused = false) {
  return teacherMusicMode(context) === 'question' && !manuallyPaused;
}
