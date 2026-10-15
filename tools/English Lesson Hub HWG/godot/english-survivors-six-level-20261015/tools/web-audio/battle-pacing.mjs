export const BATTLE_SECONDS=Object.freeze([15,17,19,21,23,25]);
export const battleSeconds=level=>BATTLE_SECONDS[Math.max(0,Math.min(5,(Math.round(Number(level))||1)-1))];
