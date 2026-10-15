import React, {useId} from 'react';

// Reused vector spectators: no image request, and only three animated tiers.
export function StadiumCrowd() {
  const id=useId().replace(/:/g,'');
  const shirts=['#ffe34b','#ae77ff','#fa6575','#67ddec','#faf1dc','#70bd9c'];
  const skins=['#ffe0b0','#dca16c','#a86645','#f2c9aa'];
  return <svg className="wp-crowd-art" viewBox="0 0 1200 330" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-roof`} x2="0" y2="1"><stop stopColor="#141734"/><stop offset="1" stopColor="#515382"/></linearGradient>
      {shirts.map((shirt,i)=><g id={`${id}-fan-${i}`} key={i} stroke="#29314c" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M-17 42Q-19 14 0 14Q19 14 17 42" fill={shirt}/>
        <path d={i%2?'M-12 22L-25 8L-22 0M12 22L26 7L24-2':'M-12 23L-25 20L-28 9M12 23L25 19L28 8'} fill="none" stroke={skins[i%4]} strokeWidth="6" strokeLinecap="round"/>
        <ellipse cy="5" rx="10" ry="12" fill={skins[i%4]}/>
        <path d={i%3===0?'M-10 3Q-12-14 1-10Q13-11 11 4L5-4L-5-2Z':'M-10 1Q-10-12 2-9Q13-9 10 0L3-3Z'} fill={i%2?'#59342b':'#242438'}/>
        <path d="M-4 5v1m8-1v1" strokeWidth="2.4" strokeLinecap="round"/>
        <path d="M-3 10Q0 14 4 9" fill="none"/>
        {i%2===0&&<path d="M-16 18Q0 26 16 18" fill="none" stroke="#fff4bd" strokeWidth="4"/>}
        {i===1&&<path d="M-12-5Q0-18 12-5Z" fill="#ffda32"/>}
        {i===3&&<path d="M-27-2H27" stroke="#f84576" strokeWidth="7"/>}
      </g>)}
    </defs>
    <path d="M0 0H1200V70L600 38L0 70Z" fill={`url(#${id}-roof)`}/>
    {Array.from({length:13},(_,i)=><path key={i} d={`M${i*100} 0L${600+(i*100-600)*1.15} 68`} stroke="#8396b3" strokeWidth="3"/>)}
    <path d="M0 45Q600 5 1200 45V330H0Z" fill="#28335a"/>
    {[0,1,2].map(row=><g key={row}>
      <path d={`M0 ${100+row*80}Q600 ${65+row*80} 1200 ${100+row*80}V${175+row*80}H0Z`} fill={['#474574','#3d4876','#344065'][row]}/>
      <g className={`wp-crowd-tier wp-crowd-tier-${row}`}>
        {Array.from({length:29},(_,col)=>{
          const x=col*44-12+(row%2)*21, y=105+row*80-22*Math.sin(col/28*Math.PI);
          return <g key={col} transform={`translate(${x} ${y}) scale(${.74+row*.13})`}>
            <rect x="-20" y="-6" width="40" height="50" rx="9" fill="#263657" stroke="#657699"/>
            <use href={`#${id}-fan-${(col*5+row*2)%6}`}/>
          </g>;
        })}
      </g>
      <path d={`M0 ${156+row*80}Q600 ${134+row*80} 1200 ${156+row*80}`} fill="none" stroke="#a8b7cf" strokeWidth="6"/>
    </g>)}
    <path d="M278 55L229 330H274L310 55M910 55L950 330H991L941 55" fill="#222d49" opacity=".8"/>
    <path d="M0 315H1200" stroke="#d4dcea" strokeWidth="9"/>
    <g fill="#fff" fontSize="15" fontWeight="900" textAnchor="middle"><text x="130" y="308">GO! GO! GO!</text><text x="1040" y="308">WORLD PUP FAN CLUB</text></g>
  </svg>;
}
