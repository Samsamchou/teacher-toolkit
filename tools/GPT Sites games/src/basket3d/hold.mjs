// Where the painted basketball sits in each animal's "holding the ball" picture (public/basketball/hold.png).
// While a team waits to shoot, the picture shows the ball in both paws and the 3D ball is hidden at exactly that spot;
// when the shot starts the 3D ball appears there, so the ball never floats beside the animal.
// The numbers are measured from the picture by scripts/prepare-basketball-hold.py and its check sheet.
// tests/basket3d.test.mjs compares sha256 with the file: new artwork must be measured again.

/** The shooter's cut-out in the 3D court, in metres, and the 3D ball's radius. */
export const SPRITE={width:1.65,height:2.2,ballRadius:.12};

// Lowest shoe pixel of each animal in its 384x512 cell (old sheets): ready pose (also the held-ball picture) and missed-shot pose.
// The shooting and celebrating pictures are jumps and use the ready line, so they stay in the air as drawn.
export const FEET={cat:{ready:480,miss:479},dog:{ready:462,miss:464},rabbit:{ready:500,miss:501},panda:{ready:478,miss:480},fox:{ready:494,miss:498},penguin:{ready:460,miss:475}};

/** How far (metres) the cut-out is lowered so the feet of this pose touch the floor. Pose 3 is the missed shot. */
export function footLift(id,pose){const feet=FEET[id];return feet?(1-(pose===3?feet.miss:feet.ready)/512)*SPRITE.height:0;}

export const HOLD={
  url:'/basketball/hold.png',
  sha256:'d2db82517f87cadfea04af7ce9eb63ada8de2bd700f960c046d46ca1b873d7d4',
  cols:3,rows:2,cell:[384,512],
  // col/row: the animal's cell in the sheet. ball: centre of the painted ball in cell pixels. radius: its radius in pixels.
  cells:{
    cat:{col:0,row:0,ball:[120,285],radius:47},dog:{col:0,row:1,ball:[111,250],radius:50},
    rabbit:{col:1,row:0,ball:[142,301],radius:46},panda:{col:1,row:1,ball:[144,255],radius:52},
    fox:{col:2,row:0,ball:[118,303],radius:50},penguin:{col:2,row:1,ball:[137,261],radius:52},
  },
};

/**
 * World position and size of the held ball for an animal standing at `position` (its feet).
 * scaleY is the cut-out's vertical squash while it crouches. Returns {x, y, z, scale}; scale 1 is the 3D ball's real size.
 */
export function holdPoint(id,position,scaleY=1){
  const cell=HOLD.cells[id],[w,h]=HOLD.cell;
  if(!cell)return {x:position.x-.4,y:position.y+1.35*scaleY,z:position.z+.03,scale:1};
  return {x:position.x+(cell.ball[0]/w-.5)*SPRITE.width,y:position.y+((1-cell.ball[1]/h)*SPRITE.height-footLift(id,4))*scaleY,z:position.z+.03,
    scale:cell.radius/h*SPRITE.height/SPRITE.ballRadius};
}
