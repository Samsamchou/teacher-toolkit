// Only canonical HTTPS provider URLs; never accept executable iframe markup.
export function videoSource(input) {
  if(!input)return null;
  let u;try{u=new URL(input);}catch{return null;}
  if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
  let id;
  if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(u.hostname)) {
    id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)\/?$/)?.[1];
  } else if(u.hostname==='youtu.be')id=u.pathname.slice(1);
  if(id&&/^[\w-]{11}$/.test(id))return {provider:'youtube',id,url:`https://www.youtube-nocookie.com/embed/${id}`};
  if(u.hostname==='drive.google.com'){
    id=u.pathname.match(/^\/file\/d\/([\w-]+)\/(?:view|preview)\/?$/)?.[1]||(u.pathname==='/open'?u.searchParams.get('id'):null);
    if(id&&/^[\w-]{10,200}$/.test(id))return {provider:'drive',id,url:`https://drive.google.com/file/d/${id}/preview`};
  }
  return null;
}
export const MIN_VIDEO_CLIP_SECONDS = 5;
export function validateVideoTrim(trim, url) {
  if (trim === undefined || trim === null) return;
  if (videoSource(url)?.provider !== 'youtube') throw new Error('只有 YouTube 影片可以設定修剪範圍。');
  if (typeof trim !== 'object' || Array.isArray(trim) || !Number.isInteger(trim.start) || !Number.isInteger(trim.end) || trim.start < 0 || trim.end > 86400 || trim.end - trim.start < MIN_VIDEO_CLIP_SECONDS) throw new Error('請設定有效的起訖時間，片段至少 5 秒，時間最多 24 小時。');
}
export function blockVideoTrim(block) {
  const source = videoSource(block?.embed);
  if (source?.provider !== 'youtube') return undefined;
  return block.slideCanvas?.elements?.find(e => e.kind === 'embed' && videoSource(e.url)?.id === source.id)?.trim;
}
export function clampVideoPosition(position, trim) {
  return Math.min(trim?.end ?? 86400, Math.max(trim?.start ?? 0, Number.isFinite(position) ? position : 0));
}
export function videoPosition(state,serverNow,trim) {
  return clampVideoPosition((state?.position||0)+(state?.playing?Math.max(0,serverNow-state.updatedAt)/1000:0),trim);
}
export function videoClipEnded(state, serverNow, trim) {
  return !!trim && videoPosition(state, serverNow, trim) >= trim.end;
}
export function videoTime(seconds) {
  const value = Math.max(0, Math.floor(seconds || 0));
  return `${String(Math.floor(value / 60)).padStart(2,'0')}:${String(value % 60).padStart(2,'0')}`;
}
