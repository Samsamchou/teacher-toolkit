// Sound for 3D basketball. Shares the crowd, card, replay and announcer clips with bowling; court sounds
// (bounce, net, rim, backboard) use recorded clips named bb_* when present and are synthesized otherwise.
import {Bowling3DAudio,BOWLING3D_SAMPLES} from '../bowling3d/audio3d.js';

const shared=Object.fromEntries(Object.entries(BOWLING3D_SAMPLES).filter(([name])=>!/^(roll|strike|pins|pin_hit_)/.test(name)));
const clip=file=>`/basket3d/audio/${file}`;
export const BASKET3D_SAMPLES={...shared,
  voice_one_point:clip('voice-one-point.mp3'),voice_two_points:clip('voice-two-points.mp3'),voice_three_points:clip('voice-three-points.mp3'),
  voice_four_points:clip('voice-four-points.mp3'),voice_slam_dunk:clip('voice-slam-dunk.mp3'),voice_steal:clip('voice-steal.mp3'),
  voice_on_fire:clip('voice-on-fire.mp3'),voice_so_close:clip('voice-so-close.mp3'),
  // Court recordings (public/basket3d/audio/manifest.json).
  bb_bounce:clip('bb-bounce.wav'),bb_board:clip('bb-board.wav'),bb_buzzer:clip('bb-buzzer.wav'),bb_cheer_big:clip('bb-cheer-big.mp3'),bb_cheer:clip('bb-cheer.mp3'),
  ...Object.fromEntries([['swish',3],['rim',3],['squeak',4]].flatMap(([name,count])=>Array.from({length:count},(_,i)=>[`bb_${name}_${i+1}`,clip(`bb-${name}-${i+1}.wav`)]))),
};
const any=(name,count)=>`bb_${name}_${1+Math.floor(Math.random()*count)}`;

export class BasketAudio extends Bowling3DAudio{
  load(entries=BASKET3D_SAMPLES){return super.load(entries);}
  bounce(strength=1,pan=0){
    if(this.sample('bb_bounce',{gain:.3+strength*.7,rate:.92+Math.random()*.16,pan}))return;
    this.tone(150,{end:52,duration:.15,gain:.2+strength*.4,pan});this.noise({duration:.07,gain:.08+strength*.14,type:'lowpass',freq:520,pan,attack:.001});
  }
  swish(big=false){
    if(this.sample(any('swish',3),{gain:big?1:.8}))return;
    this.noise({duration:.34,gain:big?.34:.26,type:'bandpass',freq:5200,endFreq:1500,q:.7,attack:.01});this.noise({duration:.16,gain:.12,type:'highpass',freq:6500,delay:.05});
  }
  rim(strength=1){
    if(this.sample(any('rim',3),{gain:.4+strength*.6,rate:.95+Math.random()*.1}))return;
    for(const [freq,amp] of [[430,.5],[870,.3],[1310,.2],[2140,.12]])this.tone(freq,{duration:.5,gain:amp*(.2+strength*.25),type:'triangle',attack:.001});
    this.noise({duration:.04,gain:.2*strength,type:'highpass',freq:2200,attack:.001});
  }
  board(strength=1){
    if(this.sample('bb_board',{gain:.4+strength*.6}))return;
    this.tone(190,{end:95,duration:.16,gain:.3+strength*.25});this.noise({duration:.09,gain:.16*strength,type:'bandpass',freq:900,q:1.5,attack:.001});
  }
  squeak(){if(!this.sample(any('squeak',4),{gain:.5,rate:.9+Math.random()*.2}))this.tone(1300,{end:1900,duration:.11,gain:.05});}
  /** Arena crowd for baskets; falls back to the shared cheer. */
  cheer(level=1){if(!this.sample(level>.7?'bb_cheer_big':'bb_cheer',{gain:.25+level*.55}))super.cheer(level);}
  buzzer(){this.sample('bb_buzzer',{gain:.8})||this.fx('buzzer');}
  jump(){this.noise({duration:.22,gain:.16,freq:500,endFreq:2200,q:.9});}
  slam(){this.rim(1);this.board(1);this.tone(70,{end:32,duration:.6,gain:.4});this.noise({duration:.3,gain:.2,type:'lowpass',freq:700});}
}
