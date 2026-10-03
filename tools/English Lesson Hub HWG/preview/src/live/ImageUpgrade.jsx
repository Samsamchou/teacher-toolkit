import React, { useRef, useState, useEffect } from 'react';
import { api, cloudMode, callCloudService } from './transport.mjs';
import { assetUrl, saveAsset } from './media.mjs';
import { needsImageUpgrade, replaceImageAssets } from './image-optimization.mjs';

export async function upgradeQuestionImages(deck, cache = new Map(), progress = () => {}, beforeUpload = async () => {}) {
  const images = new Map(deck.blocks.filter(b => b.type !== 'slide').flatMap(b => b.media || [])
    .filter(needsImageUpgrade).map(a => [a.id, a]));
  const replacements = new Map();
  for (const [id, asset] of images) {
    if (!cache.has(id)) {
      progress(`正在壓縮：${asset.name}`);
      if (!asset.originalId) throw new Error(`「${asset.name}」缺少原圖識別碼，已保留原題；請重新上傳原圖。`);
      const source = id.startsWith('cloud-')
        ? (await callCloudService('liveMediaV2', { action:'read', id:asset.originalId, variant:'original' })).url
        : await assetUrl(asset.originalId);
      if (!source) throw new Error(`「${asset.name}」原圖尚未就緒。`);
      const response = await fetch(source);
      if (!response.ok) throw new Error(`「${asset.name}」原圖讀取失敗。`);
      const blob = await response.blob();
      if (asset.sha256) {
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(b => b.toString(16).padStart(2,'0')).join('');
        if (hash !== asset.sha256) throw new Error(`「${asset.name}」原圖雜湊不符，未替換。`);
      }
      await beforeUpload();
      const optimized = await saveAsset(new File([blob], asset.name, { type:blob.type }), {
        halfSize:true, derivedFrom:id.startsWith('cloud-')?id:null, onProgress:progress,
      });
      cache.set(id, { ...optimized, source:asset.source || optimized.source, previousAssetId:id,
        originalId:asset.originalId, imageOptimization:optimized.imageOptimization });
    }
    replacements.set(id, cache.get(id));
  }
  return { deck:replaceImageAssets(deck, replacements), count:images.size };
}

export function ImageUpgrade({ decks, onSaved }) {
  const [busy,setBusy] = useState(false), [message,setMessage] = useState('');
  const guard = useRef(false), cancelled = useRef(false);
  useEffect(() => { cancelled.current=false; return () => { cancelled.current=true; }; }, []);
  const count = new Set(decks.flatMap(d => d.blocks.filter(b => b.type !== 'slide').flatMap(b => b.media || [])).filter(needsImageUpgrade).map(a => a.id)).size;
  async function run() {
    if (guard.current) return;
    guard.current=true;setBusy(true);
    let changed=0, lastUpload=0;
    const cache=new Map();
    try {
      // Fresh versions prevent replacing edits from another teacher tab.
      const current = await api('decks');
      for (const deck of current.decks) {
        if (cancelled.current) break;
        const result = await upgradeQuestionImages(deck,cache,setMessage,async () => {
          if (cloudMode && lastUpload) await new Promise(r => setTimeout(r,Math.max(0,6500-(Date.now()-lastUpload))));
          if(cancelled.current)throw new Error('已停止升級；完成的課程與原圖仍保留。');
          lastUpload=Date.now();
        });
        if (result.count && !cancelled.current) {
          const saved = await api('saveDeck',null,{deck:result.deck,expectedVersion:deck.version || 0});
          onSaved(saved.deck);changed+=result.count;
        }
      }
      if(!cancelled.current)setMessage(changed?`已升級 ${changed} 張題目圖片引用；原圖保留。`:'所有題目圖片已是縮半版。');
    } catch(e) { if(!cancelled.current)setMessage(`已完成 ${changed} 張引用；${e.message} 其餘課程未替換，可稍後重試。`); }
    finally {guard.current=false;if(!cancelled.current)setBusy(false);}
  }
  return <section className="lh-image-upgrade">
    <button disabled={busy || count===0} onClick={run}>{busy?'圖片升級中…':`將舊題目圖片縮半（${count} 張）`}</button>
    <small>保留原圖、逐堂儲存；已縮半的图片不會再次縮小。教材投影片保持原尺寸。</small>
    {message && <p role="status">{message}</p>}
  </section>;
}
