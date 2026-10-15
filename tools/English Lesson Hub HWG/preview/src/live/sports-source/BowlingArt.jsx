import {bowlingImage} from './bowling-media';
import React from 'react';
import {BALL_SKINS,CARD_META} from './bowling-model.mjs';

function Mark({type}){
  const common={stroke:'#fff',strokeWidth:7,strokeLinecap:'round',strokeLinejoin:'round',fill:'none'};
  switch(type){
    case 'hit-or-miss':return <>
      <path d="M20 20 L108 108" stroke="#f66d7e" strokeWidth="5"/><circle cx="42" cy="60" r="31" fill="#0ab86a"/><circle cx="101" cy="61" r="31" fill="#f14269"/>
      <path d="m28 60 10 10 19-23" {...common}/><path d="m89 49 24 24m0-24-24 24" {...common}/>
      <text x="72" y="114" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="950">HIT ? MISS</text>
    </>;
    case 'extra-shot':return <>
      <path d="M30 84q22-24 48-12" {...common} strokeWidth="5"/><circle cx="87" cy="54" r="34" fill="#164dbe" stroke="#fff" strokeWidth="5"/>
      <circle cx="77" cy="42" r="5" fill="#fff"/><circle cx="91" cy="35" r="5" fill="#fff"/><circle cx="97" cy="50" r="5" fill="#fff"/>
      <path d="M34 29v20m-10-10h20M106 19v22m-11-11h22" stroke="#ffef83" strokeWidth="6" strokeLinecap="round"/>
      <text x="72" y="117" textAnchor="middle" fill="#fff" stroke="#075a9b" strokeWidth="2" paintOrder="stroke" fontSize="43" fontWeight="1000">+5</text>
    </>;
    case 'no-shot':return <>
      <circle cx="72" cy="67" r="52" fill="#d62d57" stroke="#fff" strokeWidth="7"/>
      <circle cx="72" cy="67" r="35" fill="#422069"/><circle cx="62" cy="54" r="5" fill="#fff"/><circle cx="77" cy="46" r="5" fill="#fff"/><circle cx="82" cy="62" r="5" fill="#fff"/>
      <path d="M34 104 111 28" stroke="#fff" strokeWidth="11" strokeLinecap="round"/>
      <text x="72" y="119" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="950">NO SHOT</text>
    </>;
    case 'lose-points':return <>
      <ellipse cx="50" cy="89" rx="34" ry="18" fill="#d5e858" stroke="#fff" strokeWidth="4"/>
      <ellipse cx="50" cy="72" rx="34" ry="18" fill="#a9d324" stroke="#fff" strokeWidth="4"/>
      <ellipse cx="50" cy="55" rx="34" ry="18" fill="#d5e858" stroke="#fff" strokeWidth="4"/>
      <path d="M95 25v49m-18-18 18 20 18-20" {...common} strokeWidth="10"/>
      <text x="71" y="120" textAnchor="middle" fill="#fff" stroke="#3e6b0e" strokeWidth="3" paintOrder="stroke" fontSize="36" fontWeight="1000">−PTS</text>
    </>;
    case 'double-points':return <>
      <circle cx="49" cy="59" r="35" fill="#ffde62" stroke="#fff" strokeWidth="5"/><text x="49" y="70" textAnchor="middle" fill="#ad530a" fontSize="35" fontWeight="900">1</text>
      <circle cx="94" cy="60" r="35" fill="#ffbd36" stroke="#fff" strokeWidth="5"/><text x="94" y="71" textAnchor="middle" fill="#9c3903" fontSize="35" fontWeight="900">2</text>
      <path d="M37 100h70" {...common}/><text x="72" y="122" textAnchor="middle" fill="#fff" stroke="#ad5509" strokeWidth="2" paintOrder="stroke" fontSize="43" fontWeight="1000">×2</text>
    </>;
    case 'swap-points':return <>
      <rect x="14" y="38" width="48" height="57" rx="11" fill="#2eb8ec" stroke="#fff" strokeWidth="4"/>
      <rect x="83" y="38" width="48" height="57" rx="11" fill="#f45a79" stroke="#fff" strokeWidth="4"/>
      <text x="38" y="78" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="900">10</text>
      <text x="107" y="78" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="900">0</text>
      <path d="M29 24h82m-14-12 14 12-14 12M116 110H33m14-12-14 12 14 12" {...common} strokeWidth="5"/>
    </>;
    default:return null;
  }
}

export function PowerCardArt({type,compact=false}){
  const meta=CARD_META[type];if(!meta)return null;
  return <svg className={`bw-card-art ${compact?'bw-card-art-compact':''}`} viewBox="0 0 180 220" role="img" aria-label={`${meta.name} — ${meta.zh}`}>
    <rect x="7" y="7" width="166" height="206" rx="19" fill={meta.dark} stroke="#fff" strokeWidth="7"/>
    <rect x="16" y="17" width="148" height="184" rx="13" fill={meta.color} stroke="#ffe59f" strokeWidth="3"/>
    <path d="M17 35Q90 9 163 35" fill="none" stroke="#ffffff66" strokeWidth="11"/>
    <text x="90" y="38" textAnchor="middle" fill="#fff" fontSize="15" fontWeight="900" letterSpacing="2">POWER UP</text>
    <g transform="translate(18 43) scale(1.02)"><Mark type={type}/></g>
    <rect x="24" y="170" width="132" height="26" rx="9" fill="#190a3a" stroke="#fff" strokeWidth="2"/>
    <text x="90" y="188" textAnchor="middle" fill="#fff" fontSize={type==='double-points'?14:13} fontWeight="950">{meta.name.toUpperCase()}</text>
    <circle cx="31" cy="28" r="3" fill="#fff"/><circle cx="149" cy="28" r="3" fill="#fff"/>
  </svg>;
}

export function BowlingBall({skin=0,cardId=null,className='',size,style={},ref}){
  const [name,base,light,asset]=BALL_SKINS[skin]||BALL_SKINS[0];
  return <div ref={ref} className={`bw-ball ${cardId?'bw-ball-special':'bw-ball-generated'} ${className}`} role="img"
    aria-label={cardId?`${CARD_META[cardId]?.name||'Power-up'} special bowling ball`:`${name} bowling ball`}
    style={{'--ball-base':cardId?CARD_META[cardId]?.dark:base,'--ball-light':cardId?CARD_META[cardId]?.color:light,
      width:size,height:size,...style}}>
    {cardId?<span className="bw-ball-symbol">{CARD_META[cardId]?.symbol}</span>:<img src={bowlingImage(asset)} alt="" draggable="false"/>}
  </div>;
}

export function BowlingPin({className=''}) {
  return <img className={className} src={bowlingImage("pin-upright")} alt="bowling pin" draggable="false"/>;
}