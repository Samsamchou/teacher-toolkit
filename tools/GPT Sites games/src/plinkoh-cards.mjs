// Classroom extensions approved by RDQ; not a claim about the reference game's card list.
export const CARDS=[
 {id:'double-pegs',name:'Double Pegs',zh:'碰柱加倍',text:'Double your peg points.',detail:'Peg points × 2. Slot points stay the same.',color:'#a758ed',mark:'×2',icon:'pegs'},
 {id:'double-slot',name:'Double Slot',zh:'底槽加倍',text:'Double your landing points.',detail:'Slot points × 2. Peg points stay the same.',color:'#12bdb1',mark:'×2',icon:'slot'},
 {id:'bonus-10',name:'Bonus 10',zh:'加分卡',text:'Add 10 bonus points.',detail:'Your drop score + 10 points.',color:'#f6a51a',mark:'+10',icon:'star'},
 {id:'second-chance',name:'Second Chance',zh:'再一次',text:'Drop twice. Keep your best!',detail:'Two real drops. Only the higher score counts.',color:'#ed5b9a',mark:'2',icon:'retry'},
 {id:'big-ball',name:'Big Ball',zh:'巨大球',text:'Play with a bigger ball!',detail:'Ball radius × 1.4. A bigger ball can change its path.',color:'#5889ee',mark:'1.4×',icon:'ball'},
 {id:'safe-landing',name:'Safe Landing',zh:'安全降落',text:'Get at least 20 points.',detail:'If your total is below 20, it becomes 20.',color:'#64bd38',mark:'20+',icon:'shield'}
];
export const CARD_LIMIT=3;
export const cardById=id=>CARDS.find(c=>c.id===id)||null;
export function dealCards(random){const ids=CARDS.map(c=>c.id);for(let i=ids.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids.slice(0,3);}
export function applyCard(raw,id){const collisionAward=raw.collision*(id==='double-pegs'?2:1),slotAward=raw.slot*(id==='double-slot'?2:1);const baseTotal=raw.collision+raw.slot;const bonus=id==='bonus-10'?10:id==='safe-landing'?Math.max(0,20-baseTotal):0;const total=collisionAward+slotAward+bonus;return {collisionAward,slotAward,bonus,baseTotal,total,formula:`${collisionAward} + ${slotAward}${bonus?` + ${bonus}`:''} = ${total}`};}
