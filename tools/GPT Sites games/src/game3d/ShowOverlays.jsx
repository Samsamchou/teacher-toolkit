// Text and controls laid over a 3D game stage: the big result label, replay bars, streak banner,
// score-change strip, the OKAY button for power cards and the impact flash. Styles: bowling3d/bowling3d.css.
import React from 'react';

/** label:{text,kind,key}, scoreFx:{type:'double'|'swap'|'lose',from,to,key}; onOkay shows the OKAY button. */
export function ShowOverlays({label,replay,banner,scoreFx,flash=0,onOkay}){
  return <>
    <div className={`b3-bars ${replay?'on':''}`} aria-hidden="true"><i/><i/></div>
    {replay&&<div className="b3-replay">● REPLAY <small>SLOW MOTION</small></div>}
    {label&&<div className={`b3-label b3-${label.kind}`} key={`label-${label.key}`}><strong>{label.text}</strong></div>}
    {banner&&<div className="b3-banner" key={banner}>🔥 {banner}</div>}
    {scoreFx&&<div className={`b3-scorefx b3-fx-${scoreFx.type}`} key={`fx-${scoreFx.key}`}><b>{scoreFx.from}</b><i>{scoreFx.type==='swap'?'⇄':'→'}</i><b>{scoreFx.to}</b></div>}
    {onOkay&&<button type="button" className="b3-okay" onClick={onOkay}>OKAY</button>}
    <div className="b3-flash" style={{opacity:flash}} aria-hidden="true"/>
  </>;
}
