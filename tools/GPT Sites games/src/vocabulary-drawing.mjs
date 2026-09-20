export const WIDTH=1024,HEIGHT=735;
export function paint(ctx,strokes,until=Infinity){
 ctx.clearRect(0,0,WIDTH,HEIGHT);ctx.lineCap='round';ctx.lineJoin='round';
 for(const s of strokes){const p=s.points.filter(p=>p[2]<=until);if(!p.length)continue;ctx.globalCompositeOperation=s.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=s.width;ctx.beginPath();ctx.moveTo(p[0][0]*WIDTH,p[0][1]*HEIGHT);for(const v of p.slice(1))ctx.lineTo(v[0]*WIDTH,v[1]*HEIGHT);if(p.length===1){ctx.arc(p[0][0]*WIDTH,p[0][1]*HEIGHT,s.width/2,0,Math.PI*2);ctx.fill();}else ctx.stroke();}ctx.globalCompositeOperation='source-over';
}
export function capture(canvas,template){const c=document.createElement('canvas');c.width=WIDTH;c.height=HEIGHT;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,WIDTH,HEIGHT);if(template){const ratio=Math.min(WIDTH/template.width,HEIGHT/template.height),w=template.width*ratio,h=template.height*ratio;x.drawImage(template,(WIDTH-w)/2,(HEIGHT-h)/2,w,h);}x.drawImage(canvas,0,0);return c.toDataURL('image/webp',.85);}
