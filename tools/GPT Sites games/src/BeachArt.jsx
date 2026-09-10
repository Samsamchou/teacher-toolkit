import React,{useId} from 'react';

// Articulated toy-like vector characters. All five use the same reach and timing.
export const BeachCharacter=React.memo(function BeachCharacter({id='taro',className='',phase='idle',progress=0,holding=null,reduced=false,...props}){
 const uid=useId().replace(/:/g,''),url=n=>`url(#${uid}-${n})`;
 const palette={taro:['#ffe1ef','#f39bbd','#bf477d'],muntjac:['#ffead0','#e2ae72','#a96532'],deer:['#f9d7b1','#c88e59','#884e32'],monkey:['#e8dafa','#b397d8','#765291'],wave:['#d5fcff','#60cfe4','#1685ac']}[id]||['#ffe1ef','#f39bbd','#bf477d'];
 const ease=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);},mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*ease(t));
 const working=['bending','lifting','packing'].includes(phase),reach=ease((progress-.53)/.17),rise=ease((progress-.7)/.25);
 const crouch=working?reach*(1-rise):0,tilt=working?crouch*20:0;
 let hand=[185,185];
 if(working){if(progress<.7)hand=mix([185,185],[216,207],(progress-.53)/.17);else if(progress<.86)hand=mix([216,207],[151,170],(progress-.7)/.16);else if(progress<.96)hand=mix([151,170],[53,152],(progress-.86)/.1);else hand=mix([53,152],[185,185],(progress-.96)/.04);}
 if(phase==='hurt')hand=[183,172];
 // Shoulder sockets share the torso transform so bending never detaches an arm.
 const torsoPoint=(x,y)=>{const a=tilt*Math.PI/180,dx=x-123,dy=y-184;return [123+crouch*2+dx*Math.cos(a)-dy*Math.sin(a),184+crouch*7+dx*Math.sin(a)+dy*Math.cos(a)];};
 const shoulder=torsoPoint(161,157),bucketShoulder=torsoPoint(85,157),elbow=[(shoulder[0]+hand[0])/2+12,(shoulder[1]+hand[1])/2+8];
 const held=holding&&progress>=.7&&progress<.985,release=progress>.955,eDrop=ease((progress-.955)/.03);
 const heldPos=release?[53,152+eDrop*35]:[hand[0],hand[1]+7];
 const Gradient=({name,colors})=><radialGradient id={`${uid}-${name}`} cx="28%" cy="23%" r="85%"><stop offset="0" stopColor={colors[0]}/><stop offset=".48" stopColor={colors[1]}/><stop offset="1" stopColor={colors[2]}/></radialGradient>;
 const Arm=({d})=><><path d={d} fill="none" stroke={palette[2]} strokeWidth="20" strokeLinecap="round"/><path d={d} fill="none" stroke={url('fur')} strokeWidth="16" strokeLinecap="round"/></>;
 const Glove=({x,y,grip=false})=><g transform={`translate(${x} ${y})`} className={grip?'toy-bucket-hand':'toy-pick-hand'}><ellipse cx="0" cy="1" rx="13" ry="12" fill="#70462e" opacity=".16"/><path d="M-11 1Q-14-5-8-10Q-3-14 5-10Q12-9 12-1Q15 6 6 11Q-5 15-11 1Z" fill={url('glove')} stroke="#a99470" strokeWidth="1.4"/><path d="M-6-5-4 2M0-7 1 1M6-5 7 1" fill="none" stroke="#c8bdaa" strokeWidth="1.2" strokeLinecap="round"/><ellipse cx="-10" cy="3" rx="4" ry="7" transform="rotate(-25)" fill="#fff5df" stroke="#b4a38d" strokeWidth="1.1"/></g>;
 return <svg viewBox="0 0 260 240" className={`beach-character toy-character ${className}`} data-pose={phase} data-holding={held?holding:''} {...props} aria-hidden="true">
 <defs><Gradient name="fur" colors={palette}/><Gradient name="glove" colors={['#fff','#fff4dc','#d9c5a2']}/><Gradient name="vest" colors={['#b5f7cc','#50be98','#208069']}/><Gradient name="boots" colors={['#fff0a6','#ffc657','#dc8830']}/><Gradient name="bucket" colors={['#baf5ff','#52bfd9','#247693']}/><Gradient name="eye" colors={['#547c8c','#243c51','#101c33']}/><Gradient name="cream" colors={['#fff7e5','#f2d4b8','#d1a986']}/><linearGradient id={`${uid}-rim`} x2="0" y2="1"><stop stopColor="#defbff"/><stop offset="1" stopColor="#439db2"/></linearGradient></defs>
 <ellipse cx="124" cy="226" rx="90" ry="9" fill="#3b5e67" opacity=".13"/><ellipse cx="123" cy="225" rx="59" ry="5" fill="#385063" opacity=".12"/>
 {id==='monkey'&&<path d="M155 174Q214 194 196 147Q187 130 175 147" fill="none" stroke={palette[2]} strokeWidth="13" strokeLinecap="round"/>}
 <g className="toy-legs"><g className="toy-leg-left"><path d={`M108 ${177+crouch*8}Q${94-crouch*6} ${198+crouch*4} 99 218`} fill="none" stroke={palette[2]} strokeWidth="18" strokeLinecap="round"/><path d="M90 210Q79 212 78 222Q101 232 116 223L114 211Z" fill={url('boots')} stroke="#b47834" strokeWidth="1.8"/><path d="M83 223Q101 229 114 223" fill="none" stroke="#a16a34" strokeWidth="3"/></g><g className="toy-leg-right"><path d={`M138 ${179+crouch*8}Q${153+crouch*7} 199 147 219`} fill="none" stroke={palette[2]} strokeWidth="18" strokeLinecap="round"/><path d="M138 211 154 210Q174 214 173 224Q157 233 137 225Z" fill={url('boots')} stroke="#b47834" strokeWidth="1.8"/><path d="M139 225Q157 230 171 224" fill="none" stroke="#a16a34" strokeWidth="3"/></g></g>
 <g transform={`translate(${crouch*2} ${crouch*7}) rotate(${tilt} 123 184)`} className="toy-torso">
 <ellipse cx="124" cy="155" rx="44" ry="43" fill={url('fur')} stroke={palette[2]} strokeWidth="1.8"/>
 <path d="M83 136Q122 159 164 136L159 180Q125 204 88 179Z" fill={url('vest')} stroke="#348575" strokeWidth="1.8"/>
 <path d="M96 142 99 186M150 142 146 187" stroke="#ffe592" strokeWidth="8" strokeLinecap="round"/><rect x="108" y="157" width="30" height="25" rx="9" fill={url('glove')}/><path d="m116 169 5 5 10-11" fill="none" stroke="#37947b" strokeWidth="3.3" strokeLinecap="round"/>
 <g className="toy-head" transform="translate(124 125) scale(.88) translate(-124 -135)">
 {(id==='muntjac'||id==='deer')&&<><path d="M84 62Q49 23 45 61Q48 84 77 85M155 62Q190 25 190 62Q184 84 161 85" fill={url('fur')} stroke={palette[2]} strokeWidth="2"/><path d="M72 71Q51 48 54 66M169 71Q188 47 179 68" stroke="#f6c4af" strokeWidth="9" strokeLinecap="round"/><path d="M99 51 88 21m4 13-13-7M142 49l12-31m-6 16 15-9" stroke="#b98452" strokeWidth={id==='deer'?7:4} strokeLinecap="round"/></>}
 {id==='monkey'&&<><circle cx="68" cy="87" r="23" fill={url('fur')} stroke={palette[2]} strokeWidth="2"/><circle cx="175" cy="87" r="23" fill={url('fur')} stroke={palette[2]} strokeWidth="2"/><circle cx="68" cy="87" r="13" fill={url('cream')}/><circle cx="175" cy="87" r="13" fill={url('cream')}/></>}
 <path d={id==='wave'?'M76 77Q67 44 132 28Q114 47 139 48Q181 45 180 99Q181 144 126 150Q69 148 68 112Q64 90 76 77Z':'M70 85Q68 40 122 39Q177 39 179 85L182 106Q181 149 125 152Q67 151 65 109Z'} fill={url('fur')} stroke={palette[2]} strokeWidth="2"/>
 {id==='taro'&&<><path d="M116 40Q98 12 127 11Q147 17 116 40" fill="#62b884" stroke="#3c9563" strokeWidth="2"/><path d="M118 31 127 17" stroke="#bff2ae" strokeWidth="3"/><ellipse cx="89" cy="64" rx="10" ry="18" transform="rotate(33 89 64)" fill="white" opacity=".35"/></>}
 {id==='wave'&&<path d="M85 68Q95 52 111 48" fill="none" stroke="#e6ffff" strokeWidth="7" opacity=".6" strokeLinecap="round"/>}
 {id==='monkey'&&<path d="M84 81Q99 62 121 77Q145 62 163 83Q176 128 124 139Q74 130 84 81" fill={url('cream')}/>}
 {id==='deer'&&<g fill="#fff0d3"><ellipse cx="78" cy="107" rx="5" ry="7"/><ellipse cx="168" cy="108" rx="5" ry="7"/><circle cx="85" cy="126" r="4"/><circle cx="159" cy="126" r="4"/></g>}
 <ellipse cx="124" cy="123" rx="24" ry="14" fill={id==='deer'||id==='muntjac'?url('cream'):'white'} opacity={id==='deer'||id==='muntjac'?1:.12}/>
 <g fill={url('eye')}><ellipse cx="102" cy="98" rx="9" ry="12"/><ellipse cx="150" cy="97" rx="9" ry="12"/></g><g fill="white"><ellipse cx="99" cy="94" rx="3.5" ry="4.5"/><ellipse cx="147" cy="93" rx="3.5" ry="4.5"/><circle cx="105" cy="102" r="1.6"/><circle cx="153" cy="101" r="1.6"/></g>
 <ellipse cx="84" cy="115" rx="10" ry="6" fill="#f180a1" opacity=".55"/><ellipse cx="167" cy="113" rx="10" ry="6" fill="#f180a1" opacity=".55"/>
 <path d="M114 121Q126 137 139 120Q127 130 114 121" fill="#5b344a" stroke="#5b344a" strokeWidth="2"/><path d="M119 127Q127 131 134 126" fill="none" stroke="#ffb1bd" strokeWidth="3" strokeLinecap="round"/>
 {(id==='deer'||id==='muntjac')&&<ellipse cx="127" cy="114" rx="5" ry="3.5" fill="#81563d"/>}
 </g></g>
 <g className="toy-bucket" data-testid="character-bucket"><path d="M26 172Q15 135 54 141Q92 134 86 172" fill="none" stroke="#47778b" strokeWidth="5"/><path d="M26 172Q15 135 54 141Q92 134 86 172" fill="none" stroke="#cee9f0" strokeWidth="2"/><path d="M23 170 31 215Q54 233 81 215L89 170Z" fill={url('bucket')} stroke="#33788a" strokeWidth="2.3"/><ellipse cx="56" cy="171" rx="33" ry="11" fill="#246579" stroke={url('rim')} strokeWidth="5"/><ellipse cx="56" cy="174" rx="23" ry="5" fill="#183e51" opacity=".55"/><path d="M34 184 38 207" stroke="#d4f8ff" strokeWidth="6" opacity=".7" strokeLinecap="round"/><path d="M48 197 53 191 59 197M53 191v14M63 209H49" fill="none" stroke="#e7ffff" strokeWidth="3" strokeLinecap="round"/></g>
 <g className="toy-holding-arm"><Arm d={`M${bucketShoulder[0]} ${bucketShoulder[1]}Q70 174 54 143`}/><circle cx={bucketShoulder[0]} cy={bucketShoulder[1]} r="11" fill={url('vest')} stroke="#348575" strokeWidth="2"/><Glove x={54} y={143} grip/></g>
 <g className="toy-reaching-arm"><Arm d={`M${shoulder[0]} ${shoulder[1]}Q${elbow[0]} ${elbow[1]} ${hand[0]} ${hand[1]}`}/><circle cx={shoulder[0]} cy={shoulder[1]} r="11" fill={url('vest')} stroke="#348575" strokeWidth="2"/></g>
 {held&&<g className="character-held-item" data-testid="held-litter" transform={`translate(${heldPos[0]-24} ${heldPos[1]-15}) scale(${.48*(release?1-eDrop*.5:1)})`} opacity={release?1-eDrop:1}><BeachItem id={holding} embedded/></g>}
 <Glove x={hand[0]} y={hand[1]}/>
 </svg>;
});
export function BeachItem({id,embedded=false,...props}){
 const maskId=useId();
 if(id==='bag'){const art=<><defs><clipPath id={maskId}><path clipRule="evenodd" d="M97 344C109 284 161 242 236 231C326 232 389 252 448 267L603 298L732 332L849 347Q887 371 892 408L934 466Q979 502 981 565L989 644Q975 686 926 715L879 740Q770 783 680 748L562 731Q519 765 445 752L305 726Q182 765 117 713L69 677Q33 657 43 627L63 574Q80 548 146 531L230 490Q269 465 225 439L151 415Q97 389 97 344Z M128 337Q134 305 184 283Q223 279 249 299L286 334L280 354Q244 386 197 380L143 364Q125 354 128 337Z M82 620Q92 582 133 567Q160 552 193 568Q247 583 268 612Q269 632 242 656Q201 685 163 681Q106 674 85 647Z"/></clipPath></defs><image href="/beach/plastic-bag-v2.png" width="1024" height="1024" clipPath={`url(#${maskId})`}/></>;return embedded?<g transform="translate(0 20) scale(.101) translate(-20 -210)">{art}</g>:<svg viewBox="20 210 990 580" {...props} className="beach-plastic-bag" aria-hidden="true">{art}</svg>;}
 const ItemRoot=embedded?'g':'svg';
 return <ItemRoot viewBox={embedded?undefined:"0 0 100 100"} {...props} aria-hidden="true"><ellipse cx="50" cy="84" rx="35" ry="7" fill="#243847" opacity=".14"/><g stroke="#344457" strokeWidth="3.5" strokeLinejoin="round">
 {id==='wood'&&<><path d="m13 65 61-35 15 22-62 32Z" fill="#c79768"/><ellipse cx="21" cy="74" rx="10" ry="14" transform="rotate(-32 21 74)" fill="#eed2a0"/><path d="m39 62 35-20M53 66l28-17M54 44l-2-17" stroke="#896449"/></>}
 {id==='bottle'&&<><path d="M40 23v13L28 49v31q22 10 44 0V49L60 36V23Z" fill="#a0e3ec"/><rect x="39" y="16" width="22" height="11" rx="3" fill="#4f9bea"/><path d="M29 51h42v20H29Z" fill="#72bd89"/><path d="M38 39v8m0 29v4" stroke="white"/><path d="m45 59 6-3 5 5-7 4Z" fill="#f4fbb6" stroke="none"/></>}
 {id==='can'&&<><path d="M28 28v48q22 15 44 0V28" fill="#f2917d"/><ellipse cx="50" cy="28" rx="22" ry="9" fill="#ccdfe4"/><ellipse cx="50" cy="28" rx="7" ry="3" fill="#6c7e84"/><path d="M30 51h40M37 43v30" stroke="#ffe6c8"/><path d="M29 77q21 12 42 0" fill="none"/></>}
 {id==='large'&&<><path d="M20 29h60v52H20Z" fill="#729dcc"/><path d="M25 33h50v27H25Z" fill="#c5e5e7"/><path d="M20 64h60"/><circle cx="32" cy="72" r="3" fill="#ffdd6a"/><path d="m64 80 10 5M30 80l-10 5"/><path d="m32 43 12-5 9 10 10-7" fill="none" stroke="#87abb3"/></>}
 {id==='stone'&&<><path d="m11 78 12-26 19-5 10 31Zm36 1 14-43 22 15 8 30Z" fill="#a9b6c6"/><path d="m31 53 10 16m26-26 6 24" stroke="#e0e6ea"/><path d="m38 30 3-16m9 18 11-12" stroke="#ecae38"/></>}
 {id==='splinter'&&<><path d="m12 71 30-30 13 10 8-24 8 28 17 10-47 20Z" fill="#c99664"/><path d="m25 72 16-14m10 15 24-9" fill="none" stroke="#896347"/><path d="M75 14v14m9-4 10-5" stroke="#ed785f"/></>}
 </g></ItemRoot>;
}
