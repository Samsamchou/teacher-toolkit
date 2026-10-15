import React, {useId} from 'react';
import {getCountry} from './worldpup-countries.mjs';

// Every illustration is original inline vector work. The kit silhouettes adapt
// official home colors/patterns to a pup, without official crests or brand marks.
const SHIRT = 'M30 18 Q80 47 130 18 L143 126 Q145 163 111 170 Q80 180 49 170 Q15 163 17 126Z';
const OUTLINE = '#292037';
function KitPattern({country:c}) {
  const a=c.accent;
  const lines=Array.from({length:10},(_,i)=>i);
  switch(c.pattern){
    case 'stripes': return <>{[24,64,104].map(x=><rect key={x} x={x} y="18" width="24" height="164" fill={a}/>)}<path d="M24 18v150M64 18v160M104 18v150" stroke="#b2dcf2" strokeWidth="6"/></>;
    case 'checks': return <>{Array.from({length:9},(_,r)=>Array.from({length:8},(_,col)=>(r+col)%2===0&&<rect key={`${r}-${col}`} x={10+col*18} y={15+r*18} width="18" height="18" fill={a}/>))}<path d="M67 31h26v69H67Z" fill={c.base}/></>;
    case 'pinstripe': return <>{[36,58,80,102,124].map(x=><path key={x} d={`M${x} 16v162`} stroke={a} opacity=".6" strokeWidth="2"/>)}<path d="M17 20h24l-9 54H13M119 20h24l5 54h-20" fill={c.collar}/></>;
    case 'tonal-stripes': return <>{lines.map(i=><path key={i} d={`M${12+i*15} 10v180`} stroke={a} opacity=".3" strokeWidth="7"/>)}</>;
    case 'rough-stripes': return <>{[25,65,105].map((x,i)=><path key={i} d={`M${x} 5l5 44-3 41 3 41-2 53h-21l2-57-3-35 4-39-2-48Z`} fill={a}/>)}</>;
    case 'germany': return <><path d="M0 35 80 88 160 35" stroke="#171b22" fill="none" strokeWidth="17"/><path d="M0 49 80 102 160 49" stroke="#d72c39" fill="none" strokeWidth="9"/><path d="M0 58 80 111 160 58" stroke="#efc936" fill="none" strokeWidth="8"/>{[35,58,102,125].map(x=><path key={x} d={`m${x} 49 8 7-8 7-8-7Z`} fill="#f7f7ef"/>)}</>;
    case 'sash': return <path d="M144 17 16 170" stroke={a} strokeWidth="30"/>;
    case 'side-panels':return <><path d="M17 24h17l8 68-12 75H8ZM143 24h-17l-8 68 12 75h22Z" fill={a}/></>;
    case 'shoulders':return <><path d="M20 16h30l-9 16-19 52-9-3ZM140 16h-30l9 16 19 52 9-3Z" fill={a}/><path d="m29 25-8 36m15-32-8 36m95-40 8 36m-15-32 8 36" stroke={c.base} strokeWidth="3"/></>;
    case 'cross': return <><path d="M60 14v163M10 69h140" stroke="#fff" strokeWidth="28"/><path d="M60 14v163M10 69h140" stroke={a} strokeWidth="20"/></>;
    case 'wavy-stripes':return <>{Array.from({length:6},(_,i)=><path key={i} d={`M0 ${27+i*28}C40 ${5+i*28} 68 ${54+i*28} 108 ${29+i*28}S145 ${6+i*28} 172 ${20+i*28}`} fill="none" stroke={a} strokeWidth="13"/>)}</>;
    case 'chest-band':return <><path d="M15 56h130v30H15Z" fill={a}/><path d="m20 79 20-17 20 15 21-18 20 13 17-11 21 14" stroke={c.base} opacity=".4" fill="none" strokeWidth="3"/></>;
    case 'wales':return <><path d="M15 66h130v34H15Z" fill={a}/><path d="M15 67h130M15 78h130M15 90h130M15 100h130" stroke="#fff" strokeWidth="3"/></>;
    case 'armor':return <><path d="M15 15h37L35 56l10 19-13 20 12 20-10 47H9ZM145 15h-37l17 41-10 19 13 20-12 20 10 47h25Z" fill={a}/><path d="M25 27 43 45 25 65m110-38-18 18 18 20" stroke="#43885a" fill="none" strokeWidth="4"/></>;
    case 'maple':return <path d="m80 41 10 22 10-10 2 20 24-5-8 16 15 5-29 26 4 14-25-4v31h-6v-31l-25 4 4-14-29-26 15-5-8-16 24 5 2-20 10 10Z" fill={a} opacity=".7"/>;
    case 'sun':return <g fill="none" stroke={a} opacity=".55"><circle cx="80" cy="109" r="52" strokeWidth="5"/><circle cx="80" cy="109" r="40" strokeWidth="3"/><path d="M80 61v21m0 54v21M32 109h21m54 0h21M45 74l15 15m40 40 15 15M45 144l15-15m40-40 15-15" strokeWidth="9"/><path d="m67 99 13-10 13 10-4 27H71Z" strokeWidth="4"/>{lines.map(i=><path key={i} d="M77 53h6v8h-6Z" transform={`rotate(${i*36} 80 109)`}/>)}</g>;
    case 'taiwan':return <>{[0,1,2,3,4].map(i=><path key={i} d={`M0 ${42+i*31}C45 ${48+i*31} 60 ${-2+i*31} 160 ${5+i*31}L160 ${18+i*31}C76 ${9+i*31} 60 ${66+i*31} 0 ${57+i*31}Z`} fill={a} opacity={i%2 ? '.8':'.5'}/>)}</>;
    case 'waves': return <>{lines.map(i=><path key={i} d={`M0 ${23+i*17}Q40 ${i*17} 80 ${23+i*17}T160 ${23+i*17}`} stroke={a} fill="none" strokeWidth="3"/>)}</>;
    case 'horizon':return <>{lines.map(i=><path key={i} d={`M${14+i%3*5} ${42+i*11}h${140-i%4*17}`} stroke={a} opacity={.2+i*.035} strokeWidth="2"/>)}</>;
    case 'speed':return <>{lines.map(i=><path key={i} d={`M-10 ${28+i*18} 120 ${-40+i*18}M43 ${155+i*18} 170 ${86+i*18}`} stroke={a} opacity=".45" strokeWidth="2"/>)}</>;
    case 'soundwave':return <>{lines.map(i=><path key={i} d={`M${15+i*15} ${40+(i%3)*7}v${90-(i%4)*12}`} stroke={a} strokeWidth="4" opacity=".65"/>)}</>;
    case 'tiger':return <>{[0,1,2,3,4].map(i=><g key={i}><path d={`M9 ${41+i*26}q58 0 65 20Q35 ${53+i*26} 9 ${63+i*26}Z`} fill={a} opacity=".7"/><path d={`M151 ${30+i*26}q-58 0-65 20Q125 ${42+i*26} 151 ${52+i*26}Z`} fill={a} opacity=".7"/></g>)}</>;
    case 'mountains':return <>{[0,1,2,3].map(i=><path key={i} d={`M0 ${70+i*35} 34 ${22+i*35} 66 ${67+i*35} 97 ${31+i*35} 132 ${60+i*35} 160 ${38+i*35}v50H0Z`} fill={a} opacity={.22+i*.1}/>)}</>;
    case 'pyramids':return <>{[0,1,2].map(i=><g key={i} transform={`translate(${i%2*-20} ${i*53})`} fill={a} opacity=".6"><path d="m30 31 28 45H4ZM90 31l28 45H64ZM150 31l28 45h-54Z"/><path d="m29 45 11 23H17Zm60 0 11 23H77Z" fill={c.base}/></g>)}</>;
    case 'textile':return <>{Array.from({length:4},(_,r)=>Array.from({length:4},(_,col)=><g key={`${r}-${col}`} transform={`translate(${col*38} ${r*42})`} fill="none" stroke={a} opacity=".6" strokeWidth="2"><path d="m10 12 13 11-13 12-12-12ZM22 4v37M1 8l35 32"/></g>))}</>;
    case 'tartan':return <><path d="M30 10v180M68 10v180M110 10v180M5 66h150M5 109h150M5 147h150" stroke={a} strokeWidth="11" opacity=".65"/><path d="M34 10v180M114 10v180M5 72h150M5 151h150" stroke="#88a3b5" opacity=".3" strokeWidth="2"/></>;
    case 'grid':return <><path d="M31 10v180M64 10v180M97 10v180M130 10v180M5 62h150M5 96h150M5 130h150M5 164h150" stroke={a} strokeWidth="3" opacity=".5"/></>;
    case 'flames':return <>{[26,60,96,132].map((x,i)=><path key={x} d={`M${x} 162q-20-28 0-43t-4-30q34 17 13 48 9-12 13-17 5 25-22 42Z`} fill={a} opacity={.3+i*.1}/>)}</>;
    case 'diamond':return <>{[0,1,2].map(i=><path key={i} d={`m80 ${25+i*39} 49 32-49 32-49-32Z`} stroke="#dac52d" fill="none" strokeWidth="3" opacity=".55"/>)}</>;
    case 'butterflies':return <>{[0,1,2,3,4,5].map(i=><path key={i} d="M0 0C-18-17-27 7-5 9-25 26-7 30 0 13 7 30 25 26 5 9 27 7 18-17 0 0Z" transform={`translate(${42+i%2*74} ${54+Math.floor(i/2)*46}) scale(.7)`} fill={a} opacity=".65"/>)}</>;
    case 'cheetah':return <g fill={a} opacity=".75">{Array.from({length:18},(_,i)=><ellipse key={i} cx={i%2 ? 129-i%4*4 : 22+i%4*4} cy={31+Math.floor(i/2)*7} rx="3" ry="2"/>)}<path d="m34 102 7-14 12 8 14-4 11 11-7 28-14 12-16-15Zm14 5 5 3-1 7-6-4Zm14-1 6-1-1 8-6 3Zm-8 16 6 1-2 6-5-1Z" fillRule="evenodd"/><path d="m42 108 6 21m19-22-6 24" fill="none" stroke={c.base} strokeWidth="3"/></g>;
    case 'cameroon':return <><path d="M32 24q5 42 48 74 43-32 48-74" stroke="#d7c72a" strokeWidth="6" strokeDasharray="2 7" fill="none"/><path d="M38 19q4 53 42 84 38-31 42-84" stroke="#bb2834" strokeWidth="6" strokeDasharray="3 8" fill="none"/>{Array.from({length:24},(_,i)=><circle key={i} cx={20+(i*31)%122} cy={42+(i*31)%122} r="3" fill={a}/>)}</>;
    case 'stars':return <>{[40,80,120].map((x,i)=><path key={x} d="m0-10 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z" transform={`translate(${x} ${80+i*18})`} fill={a}/>)}</>;
    case 'feathers':return <><path d="m27 35 21 25-19 14 13 16-18 14m109-69-21 25 19 14-13 16 18 14" stroke={a} fill="none" strokeWidth="7"/></>;
    case 'collar-geo':return <><path d="M25 22 80 52 135 22" fill="none" stroke={a} strokeWidth="9"/><path d="M31 25 41 38 53 34 62 46 80 43 98 46 109 34 120 38 130 25" fill="none" stroke="#e5b749" strokeWidth="2"/></>;
    default:return null;
  }
}
function JerseyDrawing({countryCode,number}) {
  const c=getCountry(countryCode); const uid=useId().replace(/:/g,'');
  return <g className="wp-jersey__body">
    <defs><clipPath id={`${uid}-kit`}><path d={SHIRT}/></clipPath><linearGradient id={`${uid}-shade`} x1="0" x2="1"><stop offset="0" stopColor="#000" stopOpacity=".13"/><stop offset=".35" stopColor="#fff" stopOpacity=".15"/><stop offset=".62" stopColor="#fff" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".26"/></linearGradient></defs>
    <path d={SHIRT} fill={c.base}/><g clipPath={`url(#${uid}-kit)`}><KitPattern country={c}/><path d={SHIRT} fill={`url(#${uid}-shade)`}/></g>
    <path d={SHIRT} stroke={OUTLINE} strokeWidth="3" fill="none"/>
    <path d="M31 18Q80 41 129 18Q111 43 80 47Q49 43 31 18Z" fill={c.collar} stroke={OUTLINE} strokeWidth="1.5"/>
    <path d="M36 20Q80 39 124 20" fill="none" stroke="#fff" strokeOpacity=".8" strokeWidth="2.5"/>
    <path d="M109 53h18v19q-9 12-18 0Z" fill={c.collar} stroke="#fff" strokeWidth="2"/><circle cx="118" cy="64" r="4" fill={c.base}/>
    {number!==undefined&&<text x="80" y="131" textAnchor="middle" fill="#fff" stroke="#212036" strokeWidth="2" paintOrder="stroke" fontFamily="Comic Relief, sans-serif" fontSize="48" fontWeight="bold">{number}</text>}
    <path d="M24 145q7 18 27 20M130 64l4 53" stroke="#fff" strokeOpacity=".22" strokeWidth="4" fill="none" strokeLinecap="round"/>
  </g>;
}
export function Jersey({countryCode='TPE',number,className='',...props}) {
  const c=getCountry(countryCode);
  return <svg viewBox="0 0 160 185" className={`wp-jersey ${className}`} role="img" aria-label={`${c.name} ${c.year} home jersey`} {...props}><title>{`${c.name} · ${c.year}`}</title><ellipse cx="80" cy="174" rx="51" ry="6" fill="#152b21" opacity=".16"/><JerseyDrawing countryCode={c.code} number={number}/></svg>;
}

const DOGS=[
  {fur:'#dfab63',dark:'#875432',light:'#fff0cb',ear:'floppy'},
  {fur:'#f8eee2',dark:'#ad6743',light:'#fffafa',ear:'long',patch:true},
  {fur:'#869ba8',dark:'#3e586a',light:'#f4fafb',ear:'pointy',mask:true},
  {fur:'#43434b',dark:'#272630',light:'#89848c',ear:'floppy'},
  {fur:'#e7a34d',dark:'#c97830',light:'#fff4df',ear:'pointy',mask:true},
  {fur:'#a26746',dark:'#553d30',light:'#e7c59b',ear:'long'},
  {fur:'#f7f4e9',dark:'#303039',light:'#fffdf5',ear:'long',patch:true,spots:true},
  {fur:'#c66b38',dark:'#84442c',light:'#fff1da',ear:'pointy',mask:true},
];
export function Dog({countryCode='TPE',variant=0,pose='idle',number,className='',...props}) {
  const d=DOGS[((Math.floor(Number(variant)||0)%DOGS.length)+DOGS.length)%DOGS.length];
  const uid=useId().replace(/:/g,''); const happy=pose==='cheer';
  const armL=happy?'rotate(140 60 160)':pose==='dive'?'rotate(150 60 160)':'rotate(8 60 160)';
  const armR=happy?'rotate(-140 160 160)':pose==='dive'?'rotate(-100 160 160)':'rotate(-8 160 160)';
  return <svg viewBox="0 0 220 290" className={`wp-dog wp-dog--${pose} ${className}`} role="img" aria-label={`${getCountry(countryCode).name} soccer pup`} {...props}>
    <defs><radialGradient id={`${uid}-fur`} cx=".36" cy=".25" r=".78"><stop offset="0" stopColor={d.light}/><stop offset=".38" stopColor={d.fur}/><stop offset="1" stopColor={d.dark}/></radialGradient><linearGradient id={`${uid}-boot`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#54465f"/><stop offset="1" stopColor="#1f1b2b"/></linearGradient></defs>
    <ellipse cx="112" cy="274" rx="71" ry="10" fill="#142d20" opacity=".22"/>
    <g className="wp-dog__figure" transform={pose==='dive'?'rotate(-36 110 153)':undefined}>
      <path className="wp-dog__tail" d="M162 203q45-44 35-18-4 24-34 39" fill={d.fur} stroke={OUTLINE} strokeWidth="4" strokeLinecap="round"/>
      <g className="wp-dog__leg-left" transform={pose==='kick'?'rotate(20 86 220)':undefined}><path d="M72 214h29l-1 44H74Z" fill={d.fur} stroke={OUTLINE} strokeWidth="3"/><path d="M73 234h28v21H73Z" fill="#faf9f3"/><path d="M74 239h26" stroke={getCountry(countryCode).collar} strokeWidth="4"/><path d="M72 252q16-7 30 1l2 17H51q-3-16 21-18Z" fill={`url(#${uid}-boot)`} stroke={OUTLINE} strokeWidth="3"/><path d="M80 257h12m-18 5h17" stroke="#e6ddeb" strokeWidth="2"/></g>
      <g className="wp-dog__leg-right" transform={pose==='kick'?'rotate(-48 139 219)':undefined}><path d="M121 214h29l1 44h-28Z" fill={d.fur} stroke={OUTLINE} strokeWidth="3"/><path d="M121 234h29v21h-29Z" fill="#faf9f3"/><path d="M122 239h27" stroke={getCountry(countryCode).collar} strokeWidth="4"/><path d="M149 252q-16-7-30 1l-2 17h54q3-16-22-18Z" fill={`url(#${uid}-boot)`} stroke={OUTLINE} strokeWidth="3"/><path d="M130 257h12m-12 5h18" stroke="#e6ddeb" strokeWidth="2"/></g>
      <g className="wp-dog__arm-left" transform={armL}><path d="M66 152q-21-4-27 18l-11 34q-2 15 12 16 11 0 14-15l18-36Z" fill={`url(#${uid}-fur)`} stroke={OUTLINE} strokeWidth="3.5"/><path d="m31 208 5-9m5 13 4-10" stroke={d.dark} strokeWidth="2" strokeLinecap="round"/></g>
      <g className="wp-dog__arm-right" transform={armR}><path d="M155 152q21-4 27 18l11 34q2 15-12 16-11 0-14-15l-18-36Z" fill={`url(#${uid}-fur)`} stroke={OUTLINE} strokeWidth="3.5"/><path d="m189 208-5-9m-5 13-4-10" stroke={d.dark} strokeWidth="2" strokeLinecap="round"/></g>
      <g transform="translate(48 125) scale(.78 .64)"><JerseyDrawing countryCode={countryCode} number={number}/></g>
      <g className="wp-dog__head" transform={happy?'rotate(-5 110 90)':undefined}>
        <g className="wp-dog__ear-left">{d.ear==='pointy'?<path d="M51 90Q36 57 47 21q31 8 35 49Z" fill={d.dark} stroke={OUTLINE} strokeWidth="4"/>:<path d={d.ear==='long'?'M64 57Q16 49 21 113q5 43 23 23L69 87Z':'M61 52Q23 42 24 85q-1 49 19 31l28-31Z'} fill={d.dark} stroke={OUTLINE} strokeWidth="4"/>}{d.ear==='pointy'&&<path d="m47 35 20 35-17 1Z" fill="#df9c95" opacity=".8"/>}</g>
        <g className="wp-dog__ear-right">{d.ear==='pointy'?<path d="M169 90q15-33 4-69-31 8-35 49Z" fill={d.dark} stroke={OUTLINE} strokeWidth="4"/>:<path d={d.ear==='long'?'M156 57q48-8 43 56-5 43-23 23l-25-49Z':'M159 52q38-10 37 33 1 49-19 31l-28-31Z'} fill={d.dark} stroke={OUTLINE} strokeWidth="4"/>}{d.ear==='pointy'&&<path d="m173 35-20 35 17 1Z" fill="#df9c95" opacity=".8"/>}</g>
        <path d="M51 74Q57 41 88 43l8-12 8 12 12-14 6 14q40-6 48 31 10 29-1 51-13 28-59 29-46-1-59-29-11-22 0-51Z" fill={`url(#${uid}-fur)`} stroke={OUTLINE} strokeWidth="4"/>
        {d.mask&&<path d="M60 74q20 4 32 16l18-38 18 38q12-12 32-16l-8 43-42 28-42-28Z" fill={d.light} opacity=".94"/>}
        {d.patch&&<path d="M55 70q10-20 29-16 22 9 16 30-5 26-29 21-23-6-16-35Z" fill={d.dark}/>}
        {d.spots&&<><ellipse cx="151" cy="71" rx="9" ry="12" fill={d.dark}/><circle cx="62" cy="113" r="5" fill={d.dark}/></>}
        <path d="M63 106q7-19 26-9l21 7 21-7q19-10 26 9 10 29-20 31h-54q-30-2-20-31Z" fill={d.light}/>
        {happy?<g stroke={OUTLINE} strokeWidth="4" fill="none" strokeLinecap="round"><path d="M72 85q8-12 16 0m44 0q8-12 16 0"/></g>:<><ellipse cx="80" cy="84" rx="11" ry="14" fill="#fff"/><ellipse cx="140" cy="84" rx="11" ry="14" fill="#fff"/><ellipse cx="82" cy="86" rx="6" ry="9" fill="#242032"/><ellipse cx="138" cy="86" rx="6" ry="9" fill="#242032"/><circle cx="84" cy="82" r="2.3" fill="#fff"/><circle cx="140" cy="82" r="2.3" fill="#fff"/></>}
        <path d="M69 66q10-6 19 0m44 0q10-6 19 0" stroke={d.dark} fill="none" strokeWidth="4" strokeLinecap="round"/>
        <path d="M97 106q13-8 26 0-2 11-13 13-11-2-13-13Z" fill="#262032"/><ellipse cx="107" cy="106" rx="6" ry="2.3" fill="#84778b"/>
        <path d="M110 119v5q-9 12-20 1m20-1q9 12 20 1" fill="none" stroke={OUTLINE} strokeWidth="3" strokeLinecap="round"/>
        <path d="M102 130h16v8q-8 13-16 0Z" fill="#ef7890" stroke={OUTLINE} strokeWidth="2"/><path d="M110 132v7" stroke="#bd4766" strokeWidth="1.5"/>
        <g fill="#b17565" opacity=".65"><circle cx="80" cy="115" r="1.5"/><circle cx="88" cy="112" r="1.5"/><circle cx="83" cy="121" r="1.5"/><circle cx="140" cy="115" r="1.5"/><circle cx="132" cy="112" r="1.5"/><circle cx="137" cy="121" r="1.5"/></g>
      </g>
    </g>
  </svg>;
}

export function Football({gold=false,silver=false,className='',...props}){
  const uid=useId().replace(/:/g,''); const fill=gold?'#ffe87a':silver?'#f2f4ff':'#ffffff'; const shade=gold?'#d68a05':silver?'#737f9c':'#a7b4c4'; const panel=gold?'#f3bb0c':silver?'#b9c3d8':'#2b324b';
  return <svg viewBox="0 0 100 100" className={`wp-football ${className}`} role="img" aria-label={gold?'Golden soccer ball':silver?'Silver soccer ball':'Soccer ball'} {...props}><defs><radialGradient id={`${uid}-ball`} cx=".3" cy=".25" r=".8"><stop stopColor={fill}/><stop offset=".62" stopColor={fill}/><stop offset="1" stopColor={shade}/></radialGradient><clipPath id={`${uid}-clip`}><circle cx="50" cy="50" r="45"/></clipPath></defs><circle cx="50" cy="50" r="45" fill={`url(#${uid}-ball)`} stroke={shade} strokeWidth="2.5"/><g clipPath={`url(#${uid}-clip)`} fill={panel} stroke={shade} strokeWidth="1"><path d="m50 30 19 14-7 22H38l-7-22ZM13 20l21-13 1 19-15 15ZM68 8l19 11-6 21-16-14ZM5 59l19-1 11 22-13 14ZM95 59l-19-1-11 22 13 14ZM40 96l-2-15h24l-2 15Z"/><path d="M50 30 35 26m30 0L50 30M31 44 20 41m-7 13 11 4m14 8-3 14m27-14 3 14m11-22 9-14M69 44l12-4M38 81l-3-1m27 1 3-1" fill="none"/></g><path d="M19 33q4-14 20-17" fill="none" stroke="#fff" opacity=".6" strokeWidth="5" strokeLinecap="round"/></svg>;
}
export function PowerCardArt({cardId='normal',className='',...props}){
  const positive=cardId==='win5'||cardId==='win10';const ten=cardId==='win10'||cardId==='lose10';
  return <svg viewBox="0 0 150 155" className={`wp-card-art wp-card-art--${cardId} ${className}`} role="img" aria-label={cardId} {...props}>
    {positive||cardId==='normal'?<><Football x="13" y="9" width="124" height="124" gold={cardId==='win10'} silver={cardId==='win5'}/>{positive&&<text x="76" y="91" textAnchor="middle" fontSize="45" fontFamily="Comic Relief, sans-serif" fontWeight="bold" fill="#fff" stroke={OUTLINE} strokeWidth="5" paintOrder="stroke">+{ten?10:5}</text>}{positive&&<path d="m23 22 3-12 4 12 12 3-12 4-4 12-3-12-12-4ZM127 116l3-10 4 10 10 4-10 3-4 10-3-10-10-3Z" fill={ten?'#fff08d':'#fff'}/>}</>:
    cardId==='miss'?<g stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round">
      <path d="m29 74-12-45 34 19m48 0 34-19-12 45" fill="#db974c"/><path d="m25 40 18 17-12 11m94-28-18 17 12 11" fill="#ecb7aa" strokeWidth="2"/>
      <path d="M28 65q47-31 94 0l8 38-15-5 3 17-20-4-22 20-22-20-20 4 3-17-15 5Z" fill="#e8a54e"/>
      <path d="M33 60q1-33 42-34 41 1 42 34Z" fill="#a89578"/><path d="M45 49q30-18 60 0M53 32l7 27m21-32v28m14-24 6 24" fill="none"/><path d="M25 59q49-16 100 0l-4 10q-49-13-92 0Z" fill="#9a866c"/>
      <path d="M37 82q16-14 30 0-16 16-30 0Zm46 0q16-14 30 0-16 16-30 0Z" fill="#a9db48"/><path d="M53 76v13m44-13v13" strokeWidth="4"/><path d="m41 75 26 6m16 0 26-6" fill="none"/>
      <path d="M48 100q8-14 27-2 19-12 27 2 0 18-27 11-27 7-27-11Z" fill="#fff0c1"/><path d="m67 94 8 7 8-7Z" fill="#87463f"/><path d="M75 101v8m-20-3-33-2m33 10-30 7m70-15 33-2m-33 10 30 7" fill="none" strokeWidth="2"/>
      <path d="M47 125q28 12 56 0l-2 12q-27 13-52 0Z" fill="#50b9bb"/><circle cx="75" cy="137" r="8" fill="#e7c964"/>
    </g>:<g transform="rotate(-5 75 80)" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round">
      <rect x="60" y="10" width="49" height="79" rx="5" fill={ten?'#f02035':'#ffd432'}/><path d="M66 16h36v8H66Z" fill="#fff" opacity=".25" stroke="none"/>
      <text x="84" y="61" fill="#fff" stroke="#352437" strokeWidth="3" paintOrder="stroke" textAnchor="middle" fontSize={ten?28:32} fontWeight="bold" fontFamily="Comic Relief, sans-serif">−{ten?10:5}</text>
      <path d="m63 146-28-23q-12-12-5-30l9-25q5-10 14-6l15 7q5 6-1 13l-11-1 17 11 9 19 14 14Z" fill="#e89b2b"/>
      <path d="m38 75 16 5m-18 7 16 6m-19 6 16 6m4-16q3-20 10-19 9 0 8 10l-1 16 10 12" fill="none" strokeWidth="2.3" strokeLinecap="round"/><path d="m64 145 28-24 7 7-28 25Z" fill="#f5b640"/>
    </g>}
  </svg>;
}
