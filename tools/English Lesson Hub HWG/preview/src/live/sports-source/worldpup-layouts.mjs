// Visual geometry never consumes the scoring RNG or changes the saved match.
export const GOAL_LAYOUTS = [
  [[0,0,.44,1],[.44,0,.56,.4],[.44,.4,.16,.6],[.6,.4,.4,.6]],
  [[0,0,.32,1],[.32,0,.68,.23],[.32,.23,.68,.39],[.32,.62,.68,.38]],
  [[0,0,.25,1],[.25,0,.75,.21],[.25,.21,.23,.79],[.48,.21,.52,.79]],
  [[0,0,1,.29],[0,.29,1,.23],[0,.52,1,.16],[0,.68,1,.32]],
  [[0,0,.64,.35],[.64,0,.36,1],[0,.35,.22,.65],[.22,.35,.42,.65]],
  [[0,0,.38,.62],[.38,0,.62,.25],[.38,.25,.62,.75],[0,.62,.38,.38]],
];
export function goalLayout(match) {
  const seed = Number(match?.config?.seed) >>> 0;
  const activeIndex = match?.history?.findIndex(turn => turn.id === match?.active?.id) ?? -1;
  const turn = activeIndex >= 0 ? activeIndex : match?.history?.length || 0;
  const index = (seed + turn) % GOAL_LAYOUTS.length;
  return {index, zones:GOAL_LAYOUTS[index].map(([left,top,width,height],i)=>({id:i+1,left,top,width,height,cx:left+width/2,cy:top+height/2}))};
}
