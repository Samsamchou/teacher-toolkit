export const IMAGE_OPTIMIZATION_VERSION = 2;
export function halfDimensions(width, height) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1)
    throw new Error('圖片尺寸無效。');
  return { width: Math.max(1, Math.round(width / 2)), height: Math.max(1, Math.round(height / 2)) };
}
export function needsImageUpgrade(asset) {
  return asset.kind === 'image' && asset.imageOptimization?.version !== IMAGE_OPTIMIZATION_VERSION;
}
export function replaceImageAssets(deck, replacements) {
  return { ...deck, blocks: deck.blocks.map(block => {
    if (block.type === 'slide') return block;
    const remap = id => replacements.get(id)?.id || id;
    return { ...block, media: (block.media || []).map(a => replacements.has(a.id) ? { ...a, ...replacements.get(a.id) } : a),
      ...(block.vowelWords ? { vowelWords:block.vowelWords.map(w=>({...w,imageId:remap(w.imageId)})) } : {}),
      ...(block.background ? { background: { ...block.background, assetId: remap(block.background.assetId) } } : {}),
      ...(block.objects ? { objects: block.objects.map(o => ({ ...o, ...(o.assetId ? { assetId: remap(o.assetId) } : {}) })) } : {}) };
  }) };
}
