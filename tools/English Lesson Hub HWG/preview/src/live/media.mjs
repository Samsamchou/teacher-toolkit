import {cloudMode,callCloudService,activeRoomCode} from './transport.mjs';
import { halfDimensions, IMAGE_OPTIMIZATION_VERSION } from './image-optimization.mjs';
const urlCache=new Map();
export async function imageAsset(file, { halfSize = true } = {}) {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error("圖片限 JPG、PNG、WebP，最多 20 MB。");
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width, originalHeight = bitmap.height;
  const ratio = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const dimensions = halfSize ? halfDimensions(bitmap.width, bitmap.height) : {width:Math.round(bitmap.width*ratio),height:Math.round(bitmap.height*ratio)};
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  let optimized = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
  // Avoid a larger derivative where a lower quality encode can reduce its size.
  for (const quality of [0.72, 0.6]) {
    if (!optimized || optimized.size < file.size) break;
    const candidate = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
    if (candidate && candidate.size < optimized.size) optimized = candidate;
  }
  if (!optimized) throw new Error("圖片轉換失敗。");
  return {
    original: file,
    playback: optimized,
    imageOptimization: halfSize ? { version:IMAGE_OPTIMIZATION_VERSION, originalWidth, originalHeight, originalBytes:file.size, playbackBytes:optimized.size } : null,
    width: canvas.width,
    height: canvas.height,
    sha256: [
      ...new Uint8Array(
        await crypto.subtle.digest("SHA-256", await file.arrayBuffer()),
      ),
    ]
      .map((v) => v.toString(16).padStart(2, "0"))
      .join(""),
  };
}
function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("lesson-hub-lab-media-v2", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("assets", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function saveAsset(file,options={}) {
  let asset;
  if (file.type.startsWith("image/")) asset = await imageAsset(file, { halfSize:options.halfSize !== false });
  else {
    if (
      ![
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "video/mp4",
        "video/webm",
      ].includes(file.type) ||
      file.size > 100 * 1024 * 1024
    )
      throw new Error("音訊限 MP3／WAV，影片限 MP4／WebM；本機上限 100 MB。");
    asset = { original: file, playback: file };
  }
  if(cloudMode){
    const blobs=file.type.startsWith('image/')?{original:asset.original,playback:asset.playback}:{original:asset.original};
    const variants={};for(const [name,blob] of Object.entries(blobs))variants[name]={bytes:blob.size,mime:blob.type,sha256:[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(v=>v.toString(16).padStart(2,'0')).join('')};
    options.onProgress?.('取得教師上傳授權…');
    const grant=await callCloudService('liveMediaV2',{action:'begin',input:{name:file.name,variants,source:options.source||null,derivedFrom:options.derivedFrom||null}});
    const [{getApp},{getStorage,ref,uploadBytesResumable}]=await Promise.all([import('firebase/app'),import('firebase/storage')]);
    for(const [name,blob] of Object.entries(blobs)){
      await new Promise((resolve,reject)=>{
        const task=uploadBytesResumable(ref(getStorage(getApp()),grant.paths[name]),blob,{contentType:blob.type});
        task.on('state_changed',s=>options.onProgress?.(`上傳 ${name}：${Math.round(s.bytesTransferred/s.totalBytes*100)}%`),reject,resolve);
      });
    }
    options.onProgress?.('驗證原檔與雜湊…');
    const {asset:stored}=await callCloudService('liveMediaV2',{action:'finalize',id:grant.id});
    options.onProgress?.(stored.status==='queued'?'影片已排入轉檔，可繼續備課。':'素材已保存。');
    return {...stored,width:asset.width||null,height:asset.height||null,...(asset.imageOptimization?{imageOptimization:asset.imageOptimization}:{})};
  }
  async function upload(blob) {
    const response = await fetch("/api/lab-media", {
      method: "POST",
      headers: { "Content-Type": blob.type },
      body: blob,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "素材儲存失敗。");
    return result;
  }
  const original = await upload(asset.original);
  const playback =
    asset.playback === asset.original ? original : await upload(asset.playback);
  const id = playback.id;
  return {
    id,
    name: file.name,
    kind: file.type.split("/")[0],
    width: asset.width || null,
    height: asset.height || null,
    sha256: original.sha256,
    originalId: original.originalId || original.id,
    posterId: original.posterId || null,
    source: options.source || null,
    ...(asset.imageOptimization ? {imageOptimization:asset.imageOptimization} : {}),
  };
}
export async function assetUrl(id) {
  if(id?.startsWith('cloud-')){
    const key=`${activeRoomCode()}:${id}`,cached=urlCache.get(key);if(cached&&cached.expiresAt>Date.now()+30000)return cached.url;
    const result=await callCloudService('liveMediaV2',{action:'read',id,code:activeRoomCode()||null});
    if(result.status!=='ready')throw new Error(result.status==='failed'?'影片轉檔失敗，可由教師重試。':'素材上傳／轉檔中，請稍候。');
    urlCache.set(key,result);return result.url;
  }
  if (/^[a-f0-9]{64}\.(jpg|png|webp|mp3|wav|mp4|webm)$/.test(id))
    return `/api/lab-media/${id}`;
  const db = await database();
  const asset = await new Promise((resolve, reject) => {
    const r = db.transaction("assets").objectStore("assets").get(id);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return asset ? URL.createObjectURL(asset.playback) : null;
}
