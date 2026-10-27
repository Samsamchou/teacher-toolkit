export const HERO_GAME_VERSION=2;
export const HEROES={mage:{name:'星光法師',en:'Starlight Mage',skill:'流星雨',hp:8,description:'三顆流星，範圍魔法清怪。'},warden:{name:'森林守衛',en:'Forest Warden',skill:'森之守護',hp:11,description:'護盾、回復與震波，生命最高。'},ranger:{name:'疾風遊俠',en:'Wind Ranger',skill:'疾風箭陣',hp:7,description:'移速最快，四秒三連箭爆發。'}};
export const HERO_GAME_ROOT='/survivors/v2';
export const heroId=v=>Object.hasOwn(HEROES,v)?v:'mage';
export const isHeroes=a=>a.game==='survivors'&&a.gameVersion===HERO_GAME_VERSION;
export const stageSeconds=level=>15+2*(Math.max(1,Math.min(6,level))-1);
export function initialHeroGame(role='mage'){
 if(!Object.hasOwn(HEROES,role))throw Error('請選擇有效的冒險角色。');
 return {roleId:role,maxHp:HEROES[role].hp,x:480,y:430,hp:HEROES[role].hp,defeated:0,seconds:0,recoveries:0,level:1,wave:0,stageSeconds:0,stageMarks:0,beaconCharge:0,skillCooldown:0,skillDuration:0,skillUses:0,bossHp:260,bossShield:24,bossPhase:1,bossDefeated:false,phaseTransitions:0};
}
export function normalizeHeroGame(value,role,level,previous={}){
 if(!Object.hasOwn(HEROES,role)||value?.roleId!==role)throw Error('冒險角色已鎖定，請重新讀取保存進度。');
 if(value.level!==level)throw Error('關卡進度已變更，請重新讀取。');
 const limits={x:960,y:640,hp:HEROES[role].hp,seconds:864000,defeated:100000,recoveries:10000,wave:stageSeconds(level)+.2,stageSeconds:864000,stageMarks:3,beaconCharge:1.3,skillCooldown:14,skillDuration:4,skillUses:100000,bossHp:260,bossShield:24,phaseTransitions:1};
 const out={roleId:role,maxHp:HEROES[role].hp,level};
 for(const [k,max] of Object.entries(limits)){
  const n=value[k]??previous[k]??(k==='bossHp'?260:k==='bossShield'?24:0);
  if(!Number.isFinite(n)||n<0||n>max||(['defeated','recoveries','stageMarks','skillUses','phaseTransitions'].includes(k)&&!Number.isInteger(n)))throw Error('遊戲進度格式無效。');
  if(['seconds','defeated','recoveries','skillUses'].includes(k)&&n<(previous[k]||0))throw Error('遊戲進度較舊，請重新讀取。');
  out[k]=n;
 }
 out.bossDefeated=value.bossDefeated===true;
 if(out.bossDefeated&&(level!==6||out.bossHp!==0))throw Error('Boss 結果格式無效。');
 out.bossPhase=out.bossHp<=130?2:1;
 return out;
}
export function heroGameResult(a,r,now){
 const g=r.game;return {status:g.bossDefeated?'cleared':'completed',levelsCompleted:a.levels.length,roleId:g.roleId,bossDefeated:!!g.bossDefeated,bossHp:g.bossHp,skillUses:g.skillUses||0,defeated:g.defeated,seconds:Math.round(g.seconds),recoveries:g.recoveries,score:g.defeated*10,finishedAt:now,source:'student-device'};
}
export const heroSound=kind=>({'shot-mage':'shot','shot-warden':'impact','shot-ranger':'shot','skill-mage':'lightning','skill-warden':'shield','skill-ranger':'dash',wind:'dash',crystal:'frost',turret:'shot',beacon:'heal','boss-warning':'challenge','boss-phase':'level','shield-break':'lightning','boss-victory':'level'}[kind]||kind);
