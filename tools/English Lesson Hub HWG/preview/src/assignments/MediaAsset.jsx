import React from 'react';
import {useMediaResource} from '../live/useMediaResource.jsx';
export function MediaAsset({asset}){const {url,error}=useMediaResource(asset?.id);if(!asset)return null;if(!url)return <p>{error||'素材載入中…'}</p>;return asset.kind==='image'?<img className="as-media" src={url} alt={asset.name||'題目圖片'}/>:asset.kind==='audio'?<audio src={url} controls preload="metadata"/>:<video src={url} controls playsInline preload="metadata"/>;}
