export function validateAnnotations(lines) {
  if(!Array.isArray(lines)||lines.length>150||JSON.stringify(lines).length>65000)throw new Error('標註過多，請先清除部分筆畫。');
  let count=0;
  for(const l of lines) {
    if(!l||typeof l.anchor!=='string'||!/^[-\w:]{1,100}$/.test(l.anchor)||!/^#[0-9a-f]{6}$/i.test(l.color)||![3,6,12].includes(l.width)||!Array.isArray(l.points)||!l.points.length)throw new Error('標註格式無效。');
    count+=l.points.length;
    if(count>2500||l.points.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1000)))throw new Error('標註座標無效或過多。');
  }
  return lines;
}
