// 第 3 段 watch TV：夜晚的客廳（側面）。電視在左邊矮櫃上（關著），沙發在右邊面向電視。
// 端著爆米花從沙發後面走進來 → 彎腰拿起茶几上的遙控器 → 往後坐上沙發（爆米花放腿上）
// → 遙控器對準電視按下（紅外線小光點飛到感應器）→ 電視亮起：卡通小魚在海底游，藍白光灑滿房間
// → 把遙控器放回茶几 → 抓一顆爆米花吃 → 小魚吹出大泡泡「啵」一聲破掉、轉圈 → 往後靠、笑到肩膀抖
SEGMENTS.tv = (() => {
  const { C, clamp, lerp, E, prog, keyed, rng, figure, glow, walk, STAND, mix, joints } = FT;
  const ctx = FT.ctx;
  const S = 1.55, G = 800;
  // 配置（左→右）：盆栽、電視櫃＋電視、茶几（遙控器、爆米花）、沙發（面向左）、立燈、窗戶在沙發上方
  const CAB = { L: 215, R: 645, top: G - 118 };
  const BEZ = { x: 250, y: G - 372, w: 360, h: 222 };
  const SCR = { x: 262, y: G - 360, w: 336, h: 196 };
  const SENSOR = { x: 590, y: G - 158 };
  const TAB = { L: 830, R: 1052, top: G - 100 };
  const SOFA = { front: 1140, back: 1318, seat: G - 70 };
  const SX = 1095;                       // 拿遙控器時站的位置
  const HIP = { x: 1195, y: G - 80 };    // 坐下時髖部
  const REM0 = { x: 1028, y: TAB.top - 6 }, REM1 = { x: 1040, y: TAB.top - 6 };
  const LAP = { x: 1150, y: G - 92 };    // 爆米花桶放在大腿上（桶底中心）
  const LAMP = { x: 1505 };
  const WIN = { x: 1150, y: 218, w: 290, h: 250 };
  const T_PRESS = 4.95, T_ON = 5.36, T_POP = 8.5;
  const AIM = { x: 1100, y: G - 190 };

  const roundRect = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
  const L = q => FT.mirror(q);
  const tvOn = t => prog(t, T_ON + 0.08, T_ON + 0.6);

  // ---------- 房間 ----------
  const R = rng(23);
  const stars = Array.from({ length: 26 }, () => ({ x: WIN.x + 10 + R() * (WIN.w - 20), y: WIN.y + 10 + R() * (WIN.h * 0.5), r: 0.8 + R() * 1.6, p: R() * 6 }));
  const towers = Array.from({ length: 9 }, (_, i) => ({ x: WIN.x + i * 34 - 6, w: 26 + R() * 14, h: 50 + R() * 80 }));
  const litWin = [];
  towers.forEach(tw => { for (let yy = 10; yy < tw.h - 8; yy += 14) for (let xx = 5; xx < tw.w - 6; xx += 10) if (R() < 0.3) litWin.push({ x: tw.x + xx, y: WIN.y + WIN.h - tw.h + yy, p: R() * 6 }); });

  function room(t) {
    // 牆
    ctx.fillStyle = '#2a1d5e'; ctx.fillRect(0, 0, 1920, 700);
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let x = 0; x < 1920; x += 64) ctx.fillRect(x, 0, 30, 700);
    // 踢腳板
    ctx.fillStyle = '#3d2f73'; ctx.fillRect(0, 690, 1920, 14);
    // 木地板
    const fg = ctx.createLinearGradient(0, 704, 0, 905);
    fg.addColorStop(0, '#3a2759'); fg.addColorStop(1, '#2a1c47');
    ctx.fillStyle = fg; ctx.fillRect(0, 704, 1920, 210);
    let y = 704, h = 12, i = 0;
    while (y < 905) { if (i % 2) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(0, y, 1920, h); } y += h; h *= 1.25; i++; }
    // 地毯（透視梯形）
    ctx.fillStyle = '#245e66'; ctx.beginPath();
    ctx.moveTo(740, G - 26); ctx.lineTo(1360, G - 26); ctx.lineTo(1410, G + 54); ctx.lineTo(690, G + 54); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#d9a24a'; ctx.lineWidth = 4; ctx.beginPath();
    ctx.moveTo(758, G - 18); ctx.lineTo(1342, G - 18); ctx.lineTo(1386, G + 46); ctx.lineTo(714, G + 46); ctx.closePath(); ctx.stroke();
    // 牆上小畫框（山與月）
    ctx.fillStyle = '#4a3a85'; roundRect(668, 318, 118, 92, 6); ctx.fill();
    ctx.fillStyle = '#1d4f5a'; ctx.fillRect(678, 328, 98, 72);
    ctx.fillStyle = '#2fa59a'; ctx.beginPath(); ctx.moveTo(678, 400); ctx.lineTo(712, 356); ctx.lineTo(738, 384); ctx.lineTo(752, 368); ctx.lineTo(776, 400); ctx.closePath(); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(752, 344, 7, 0, 7); ctx.fill();
    window_(t);
    lamp();
    plant();
  }

  function window_(t) {
    const { x, y, w, h } = WIN;
    ctx.fillStyle = '#4a3a85'; roundRect(x - 16, y - 16, w + 32, h + 32, 8); ctx.fill();
    ctx.fillStyle = '#120c38'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#1f1650'; ctx.fillRect(x, y + h * 0.55, w, h * 0.45);
    ctx.fillStyle = C.light;
    stars.forEach(s => { ctx.globalAlpha = 0.45 + 0.4 * Math.sin(t * 2 + s.p); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); });
    ctx.globalAlpha = 1;
    // 彎月
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(x + 214, y + 62, 26, 0, 7); ctx.fill();
    ctx.fillStyle = '#120c38'; ctx.beginPath(); ctx.arc(x + 226, y + 54, 23, 0, 7); ctx.fill();
    // 城市剪影＋亮著的窗
    ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    towers.forEach(tw => { ctx.fillStyle = '#2c2168'; ctx.fillRect(tw.x, y + h - tw.h, tw.w, tw.h); });
    litWin.forEach(l => { ctx.globalAlpha = 0.65 + 0.35 * Math.sin(t * 1.3 + l.p); ctx.fillStyle = C.gold; ctx.fillRect(l.x, l.y, 5, 6); });
    ctx.globalAlpha = 1; ctx.restore();
    // 窗框十字
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(x + w / 2 - 5, y, 10, h); ctx.fillRect(x, y + h * 0.48 - 5, w, 10);
    ctx.fillStyle = '#3d2f73'; ctx.fillRect(x - 24, y + h + 12, w + 48, 12); // 窗台
    // 窗簾
    [[x - 46, 1], [x + w + 46, -1]].forEach(([cx, d]) => {
      ctx.fillStyle = '#5b4a8a'; ctx.beginPath();
      ctx.moveTo(cx - 34, y - 30); ctx.lineTo(cx + 34, y - 30);
      ctx.quadraticCurveTo(cx + 10 * d + 6, y + h * 0.6, cx + 30, y + h + 70); ctx.lineTo(cx - 30, y + h + 70);
      ctx.quadraticCurveTo(cx - 10 * d - 6, y + h * 0.6, cx - 34, y - 30); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#4a3a85'; ctx.lineWidth = 4;
      [-14, 2, 18].forEach(o => { ctx.beginPath(); ctx.moveTo(cx + o, y - 24); ctx.quadraticCurveTo(cx + o + 4 * d, y + h * 0.5, cx + o * 1.4, y + h + 66); ctx.stroke(); });
    });
    ctx.fillStyle = '#3d2f73'; ctx.fillRect(x - 100, y - 36, w + 200, 10); // 窗簾桿
  }

  function lamp() {
    const x = LAMP.x;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(x, G + 3, 46, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4a3a85'; ctx.beginPath(); ctx.ellipse(x, G - 4, 40, 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(x - 4, G - 400, 8, 398);
    ctx.fillStyle = '#d9a24a'; ctx.beginPath();
    ctx.moveTo(x - 40, G - 470); ctx.lineTo(x + 40, G - 470); ctx.lineTo(x + 62, G - 392); ctx.lineTo(x - 62, G - 392); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8742c'; ctx.beginPath();
    ctx.moveTo(x + 10, G - 470); ctx.lineTo(x + 40, G - 470); ctx.lineTo(x + 62, G - 392); ctx.lineTo(x + 26, G - 392); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.ellipse(x, G - 392, 62, 6, 0, 0, 7); ctx.fill();
  }

  function plant() {
    const x = 132;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse(x, G + 3, 54, 8, 0, 0, 7); ctx.fill();
    const leaves = [[-60, 150, 0.9], [-30, 190, 0.5], [0, 210, 0], [30, 186, -0.5], [58, 150, -0.9], [-44, 120, 1.2], [46, 118, -1.2]];
    leaves.forEach(([dx, hh, a], i) => {
      ctx.save(); ctx.translate(x, G - 90); ctx.rotate(-a * 0.5);
      ctx.fillStyle = i % 2 ? '#23857c' : '#2fa59a';
      ctx.beginPath(); ctx.ellipse(0, -hh / 2, 20, hh / 2, 0, 0, 7); ctx.fill();
      ctx.restore();
    });
    ctx.fillStyle = '#d9a24a'; ctx.beginPath();
    ctx.moveTo(x - 46, G - 96); ctx.lineTo(x + 46, G - 96); ctx.lineTo(x + 36, G); ctx.lineTo(x - 36, G); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8742c'; ctx.fillRect(x - 50, G - 100, 100, 16);
  }

  // ---------- 電視櫃＋電視 ----------
  function cabinet() {
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse((CAB.L + CAB.R) / 2, G + 4, 240, 12, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#a8744a'; ctx.fillRect(CAB.L + 18, G - 20, 12, 20); ctx.fillRect(CAB.R - 30, G - 20, 12, 20);
    ctx.fillStyle = '#8a5a3c'; roundRect(CAB.L, CAB.top, CAB.R - CAB.L, 100, 8); ctx.fill();
    ctx.fillStyle = '#a8744a'; roundRect(CAB.L - 8, CAB.top - 6, CAB.R - CAB.L + 16, 16, 6); ctx.fill();
    // 抽屜＋開放格
    ctx.fillStyle = '#6e4430'; roundRect(CAB.L + 18, CAB.top + 22, 180, 64, 6); ctx.fill();
    ctx.fillStyle = '#a8744a'; roundRect(CAB.L + 220, CAB.top + 22, 192, 64, 6); ctx.fill();
    ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(CAB.L + 316, CAB.top + 54, 5, 0, 7); ctx.fill();
    // 開放格裡的小盒子與書（無字）
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(CAB.L + 34, CAB.top + 44, 60, 42);
    ctx.fillStyle = '#2fa59a'; ctx.fillRect(CAB.L + 110, CAB.top + 36, 14, 50);
    ctx.fillStyle = '#d9a24a'; ctx.fillRect(CAB.L + 126, CAB.top + 42, 12, 44);
    ctx.fillStyle = '#7a68ad'; ctx.fillRect(CAB.L + 140, CAB.top + 32, 14, 54);
  }
  function tvBody() {
    // 底座
    ctx.fillStyle = '#2a2150'; roundRect(370, CAB.top - 18, 120, 12, 5); ctx.fill();
    ctx.fillRect(418, BEZ.y + BEZ.h - 4, 24, CAB.top - 14 - (BEZ.y + BEZ.h - 4));
    // 外框
    ctx.fillStyle = '#1c1640'; roundRect(BEZ.x, BEZ.y, BEZ.w, BEZ.h, 12); ctx.fill();
    ctx.fillStyle = '#2a2150'; roundRect(BEZ.x + 4, BEZ.y + 4, BEZ.w - 8, BEZ.h - 8, 10); ctx.fill();
  }
  function screenOff() {
    ctx.fillStyle = '#0d0a24'; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    ctx.save(); ctx.beginPath(); ctx.rect(SCR.x, SCR.y, SCR.w, SCR.h); ctx.clip();
    ctx.fillStyle = 'rgba(201,184,255,0.07)'; ctx.beginPath();
    ctx.moveTo(SCR.x + 40, SCR.y); ctx.lineTo(SCR.x + 120, SCR.y); ctx.lineTo(SCR.x + 30, SCR.y + SCR.h); ctx.lineTo(SCR.x - 50, SCR.y + SCR.h); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // 卡通節目：海底小魚（吹大泡泡 → 破掉 → 轉圈）
  const BUB = Array.from({ length: 9 }, (_, i) => ({ x: 20 + (i * 37) % 300, sp: 30 + (i * 13) % 40, ph: (i * 0.37) % 1, r: 3 + (i % 3) * 2 }));
  function fishState(t) {
    const cx = SCR.x + SCR.w / 2, cy = SCR.y + SCR.h * 0.45;
    const u = 0.85 * (t - 5.5);
    const fx = cx + 105 * Math.sin(u), dir = Math.cos(u);
    const w = prog(t, 7.6, 8.05) * (1 - prog(t, 9.4, 9.9));
    const x = lerp(fx, cx - 40, w);
    let sx = clamp(dir * 3, -1, 1); sx = lerp(sx, 1, w);
    const spin = prog(t, T_POP + 0.02, T_POP + 0.5, E.out) * Math.PI * 2;
    const y = cy + 12 * Math.sin(t * 2.1) - 14 * Math.sin(Math.PI * prog(t, T_POP, T_POP + 0.5));
    return { x, y, sx, spin };
  }
  function screenOn(t) {
    const k1 = prog(t, T_ON, T_ON + 0.12), k2 = prog(t, T_ON + 0.1, T_ON + 0.3, E.out);
    ctx.fillStyle = '#0d0a24'; ctx.fillRect(SCR.x, SCR.y, SCR.w, SCR.h);
    ctx.save(); ctx.beginPath(); ctx.rect(SCR.x, SCR.y, SCR.w, SCR.h); ctx.clip();
    const content = prog(t, T_ON + 0.22, T_ON + 0.55);
    if (content > 0) {
      ctx.globalAlpha = content;
      const { x, y, w, h } = SCR;
      ctx.fillStyle = '#3f9fd6'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#62b9e6'; ctx.fillRect(x, y, w, h * 0.32);
      ctx.fillStyle = '#2d86c0'; ctx.fillRect(x, y + h * 0.66, w, h * 0.34);
      // 光束
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      [[40, 70], [150, 50], [250, 60]].forEach(([o, ww]) => { ctx.beginPath(); ctx.moveTo(x + o, y); ctx.lineTo(x + o + ww, y); ctx.lineTo(x + o + ww - 40, y + h); ctx.lineTo(x + o - 60, y + h); ctx.closePath(); ctx.fill(); });
      // 沙
      ctx.fillStyle = '#e6c27a'; ctx.beginPath(); ctx.moveTo(x, y + h);
      for (let i = 0; i <= 12; i++) ctx.lineTo(x + i * w / 12, y + h - 22 - 8 * Math.sin(i * 0.9));
      ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill();
      // 海草
      [[x + 36, 74], [x + 58, 54], [x + 290, 80], [x + 312, 56]].forEach(([sx, hh], i) => {
        ctx.strokeStyle = i % 2 ? '#23857c' : '#2fa59a'; ctx.lineWidth = 9; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(sx, y + h - 16);
        ctx.quadraticCurveTo(sx + 14 * Math.sin(t * 2 + i), y + h - 16 - hh / 2, sx + 8 * Math.sin(t * 2 + i + 1), y + h - 16 - hh); ctx.stroke();
      });
      // 小泡泡
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
      BUB.forEach(b => {
        const a = ((t - 5) * b.sp / h + b.ph) % 1;
        ctx.beginPath(); ctx.arc(x + b.x + 5 * Math.sin(t * 3 + b.x), y + h - 20 - a * (h - 20), b.r, 0, 7); ctx.stroke();
      });
      // 小魚
      const f = fishState(t);
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.spin); ctx.scale(f.sx, 1);
      ctx.fillStyle = '#f39c3a'; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(-48, -18 + 3 * Math.sin(t * 12)); ctx.lineTo(-48, 18 + 3 * Math.sin(t * 12)); ctx.closePath(); ctx.fill();
      ctx.fillStyle = C.gold; ctx.beginPath(); ctx.ellipse(0, 0, 32, 22, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f39c3a'; ctx.beginPath(); ctx.moveTo(-6, -18); ctx.quadraticCurveTo(4, -34, 16, -18); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(14, -5, 8, 0, 7); ctx.fill();
      ctx.fillStyle = '#1c1640'; ctx.beginPath(); ctx.arc(16, -5, 4, 0, 7); ctx.fill();
      ctx.restore();
      // 大泡泡（吹大 → 破）
      if (t > 8.0 && t < T_POP) {
        const r = lerp(4, 40, prog(t, 8.0, T_POP, E.in));
        const bx = f.x + 34 + r * 0.8, by = f.y - 2;
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, r, 0, 7); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(bx - r * 0.4, by - r * 0.4, r * 0.18, 0, 7); ctx.fill();
      }
      const pk = (t - T_POP) / 0.3;
      if (pk >= 0 && pk <= 1) {
        const bx = cx(t) , by = SCR.y + SCR.h * 0.45;
        ctx.strokeStyle = `rgba(255,255,255,${1 - pk})`; ctx.lineWidth = 4; ctx.lineCap = 'round';
        for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; ctx.beginPath(); ctx.moveTo(bx + Math.cos(a) * (18 + 30 * pk), by + Math.sin(a) * (18 + 30 * pk)); ctx.lineTo(bx + Math.cos(a) * (34 + 44 * pk), by + Math.sin(a) * (34 + 44 * pk)); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }
    // 開機白光（先一條橫線，再展開）
    const flash = (1 - content) * k1;
    if (flash > 0) {
      const hh = lerp(4, SCR.h, k2);
      ctx.fillStyle = `rgba(235,245,255,${flash})`;
      ctx.fillRect(SCR.x + SCR.w / 2 - SCR.w / 2 * k1, SCR.y + SCR.h / 2 - hh / 2, SCR.w * k1, hh);
    }
    ctx.restore();
  }
  const cx = () => SCR.x + SCR.w / 2 - 40 + 34 + 40 * 0.8; // 泡泡破掉的位置（魚停在中間時）
  function screen(t) {
    if (t < T_ON) screenOff(); else screenOn(t);
    // 遙控感應燈
    const blink = prog(t, T_PRESS + 0.36, T_PRESS + 0.4) * (1 - prog(t, T_PRESS + 0.48, T_PRESS + 0.56));
    ctx.fillStyle = blink > 0 ? C.gold : '#4a3a85';
    ctx.beginPath(); ctx.arc(SENSOR.x, SENSOR.y + 2, 3.5, 0, 7); ctx.fill();
    if (blink > 0) glow(SENSOR.x, SENSOR.y + 2, 22, `rgba(255,211,107,${0.9 * blink})`);
  }

  // ---------- 沙發（側面，面向左） ----------
  function sofa() {
    const { front, back, seat } = SOFA;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse((front + back) / 2, G + 4, 118, 11, 0, 0, 7); ctx.fill();
    // 椅腳
    ctx.fillStyle = '#a8744a'; ctx.fillRect(front + 12, G - 18, 10, 18); ctx.fillRect(back - 22, G - 18, 10, 18);
    // 靠背（往後微傾）
    ctx.save(); ctx.translate(back - 40, seat + 6); ctx.rotate(0.13);
    ctx.fillStyle = '#23857c'; roundRect(-34, -186, 72, 196, 26); ctx.fill();
    ctx.fillStyle = '#2fa59a'; roundRect(-34, -186, 40, 190, 22); ctx.fill();
    ctx.restore();
    // 遠側扶手（在人的後面）
    ctx.fillStyle = '#1b6a63'; roundRect(front - 10, seat - 66, back - front + 4, 100, 22); ctx.fill();
    ctx.fillStyle = '#23857c'; ctx.beginPath(); ctx.ellipse(front + 12, seat - 52, 26, 18, 0, 0, 7); ctx.fill();
    // 抱枕
    ctx.save(); ctx.translate(back - 74, seat - 48); ctx.rotate(0.2);
    ctx.fillStyle = '#d9a24a'; roundRect(-16, -42, 32, 84, 14); ctx.fill();
    ctx.fillStyle = '#a8742c'; roundRect(4, -40, 12, 80, 8); ctx.fill();
    ctx.restore();
    // 底座
    ctx.fillStyle = '#23857c'; roundRect(front, seat + 14, back - front, 40, 12); ctx.fill();
    // 坐墊
    ctx.fillStyle = '#2fa59a'; roundRect(front - 6, seat, back - front - 40, 26, 13); ctx.fill();
    ctx.fillStyle = '#3dbcae'; roundRect(front, seat + 2, back - front - 60, 7, 4); ctx.fill();
  }

  // ---------- 茶几 ----------
  function table() {
    const { L: l, R: r, top } = TAB;
    ctx.fillStyle = 'rgba(8,5,30,0.35)'; ctx.beginPath(); ctx.ellipse((l + r) / 2, G + 4, 130, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5a3c'; ctx.fillRect(l + 14, top + 10, 12, G - top - 10); ctx.fillRect(r - 26, top + 10, 12, G - top - 10);
    ctx.fillRect(l + 20, G - 34, r - l - 40, 8); // 下層板
    ctx.fillStyle = '#5b4a8a'; ctx.fillRect(l + 50, G - 46, 70, 12); ctx.fillStyle = '#2fa59a'; ctx.fillRect(l + 56, G - 56, 58, 10); // 雜誌（無字）
    ctx.fillStyle = '#a8744a'; roundRect(l, top, r - l, 14, 6); ctx.fill();
    ctx.fillStyle = '#c98a5a'; ctx.fillRect(l + 8, top + 2, r - l - 16, 3);
    // 一杯飲料
    ctx.fillStyle = '#c9b8ff'; roundRect(l + 30, top - 34, 26, 34, 5); ctx.fill();
    ctx.fillStyle = '#7a68ad'; ctx.fillRect(l + 34, top - 22, 18, 18);
  }

  // ---------- 小道具 ----------
  function remote(c, ang, pressT) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(ang); ctx.scale(1.3, 1.3);
    ctx.fillStyle = '#1c1640'; roundRect(-22, -7, 44, 14, 6); ctx.fill();
    ctx.fillStyle = '#4a3a85'; roundRect(-18, -7, 36, 5, 3); ctx.fill();
    const pr = pressT || 0;
    ctx.fillStyle = pr > 0 ? C.gold : '#7a68ad'; ctx.beginPath(); ctx.arc(12, -7 + 1.5 * pr, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = '#c9b8ff'; ctx.fillRect(21, -3, 3, 6); // 發射頭
    ctx.restore();
    if (pr > 0) glow(c.x + Math.cos(ang) * 12, c.y + Math.sin(ang) * 12 - 8, 18, `rgba(255,211,107,${0.8 * pr})`);
  }
  // 爆米花桶：紅白直條紋（全段唯一的紅色）；c = 桶底中心
  function popcorn(c) {
    const bw = 50, tw = 74, h = 50;
    ctx.save(); ctx.translate(c.x, c.y);
    // 爆米花
    const puffs = [[-26, -54, 11], [-12, -60, 12], [4, -62, 12], [20, -56, 11], [30, -50, 9], [-32, -48, 9], [-4, -52, 11], [12, -50, 10], [-18, -50, 10]];
    puffs.forEach(([x, y, r], i) => { ctx.fillStyle = i % 3 === 0 ? '#ffe9a8' : '#fff4d6'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    // 桶身
    ctx.beginPath(); ctx.moveTo(-tw / 2, -h); ctx.lineTo(tw / 2, -h); ctx.lineTo(bw / 2, 0); ctx.lineTo(-bw / 2, 0); ctx.closePath();
    ctx.fillStyle = '#fff4d6'; ctx.fill();
    ctx.save(); ctx.clip(); ctx.fillStyle = C.red;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 15 - 5, -h); ctx.lineTo(i * 15 + 5, -h); ctx.lineTo(i * 10.5 + 3.5, 0); ctx.lineTo(i * 10.5 - 3.5, 0); ctx.closePath(); if (i % 2 === 0) ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#e8dcc0'; roundRect(-tw / 2 - 3, -h - 3, tw + 6, 7, 3); ctx.fill();
    ctx.restore();
  }

  // ---------- 人物 ----------
  function hands(p) { const J = joints(p, S); return [J.A1.hand, J.A2.hand]; }
  function withHands(p, t1, t2, k = 1) {
    const h = hands(p); const o = { ...p };
    if (t1) { o.h1x = lerp(h[0].x, t1.x, k); o.h1y = lerp(h[0].y, t1.y, k); o.b1 = -(p.face || 1); }
    if (t2) { o.h2x = lerp(h[1].x, t2.x, k); o.h2y = lerp(h[1].y, t2.y, k); o.b2 = -(p.face || 1); }
    return o;
  }
  // 朝右設計，用 L() 轉成朝左
  const BEND = { x: SX, y: G - 150, tor: 50, face: 1, l1: 22, k1: -4, l2: 2, k2: -14, a1: 20, e1: 30, a2: 30, e2: 60, hd: 8 };
  const SITP = (tor = 6, hd = 0) => ({ x: HIP.x, y: HIP.y, tor, face: 1, l1: 86, k1: 2, l2: 80, k2: 6, a1: 30, e1: 70, a2: 25, e2: 60, hd });
  const lerpP = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k) });

  const laugh = t => prog(t, 8.62, 8.8) * (1 - prog(t, 9.95, 10.5));
  const shake = t => laugh(t) * Math.sin(t * 34);
  const SEATED = [
    [4.05, { tor: 4, hd: 0 }], [4.4, { tor: -10, hd: 0 }], [4.5, { tor: -10, hd: 0 }], [4.85, { tor: 0, hd: 2 }],
    [5.85, { tor: 0, hd: 2 }], [6.3, { tor: 34, hd: 6 }], [6.5, { tor: 34, hd: 6 }], [6.95, { tor: -10, hd: 0 }],
    [7.05, { tor: -10, hd: 0 }], [7.35, { tor: 6, hd: 4 }], [7.45, { tor: 6, hd: 4 }], [7.75, { tor: -6, hd: -2 }],
    [8.3, { tor: -10, hd: 0 }], [8.62, { tor: -10, hd: 0 }], [8.85, { tor: -13, hd: -9 }], [9.95, { tor: -13, hd: -9 }],
    [10.5, { tor: -12, hd: 0 }], [99, { tor: -12, hd: 0 }],
  ];
  function bowlAt(t, p) {
    if (t < 2.5) return { x: p.x - 52, y: p.y + 146 - 168 };
    if (t < 3.3) { const d = prog(t, 2.5, 2.86) * (1 - prog(t, 2.96, 3.3)); return { x: SX - 50 - 22 * d, y: G - 168 + 20 * d }; }
    if (t < 4.1) { const k = prog(t, 3.3, 4.05); const c = lerpP({ x: SX - 50, y: G - 168 }, LAP, k); c.y -= 14 * Math.sin(Math.PI * k); return c; }
    return { x: LAP.x, y: LAP.y + 2.5 * Math.abs(shake(t)) };
  }

  function person(t) {
    let p, remoteState = 'table', aim = false, piece = false, behind = false;
    const REST = { x: LAP.x + 14, y: LAP.y - 44 };
    if (t < 2.5) { // 端著爆米花從沙發後面走進來（朝左）
      const k = prog(t, 0, 2.5, q => q * (2 - q)); const x = lerp(1990, SX, k);
      p = L(walk(x, G, (1990 - x) / 92 * Math.PI, 1 - prog(t, 2.15, 2.5)));
      const back = 1 - prog(x, 1175, 1100, k => k);
      p.y -= 30 * back; p.gy = G - 30 * back;
      behind = true;
    } else if (t < 3.3) { // 彎腰拿起茶几上的遙控器
      const down = prog(t, 2.5, 2.86) * (1 - prog(t, 2.96, 3.3));
      const base = L(mix(STAND(SX, G), BEND, down));
      const grip = { x: REM0.x + 2, y: REM0.y - 8 };
      if (t < 2.92) p = withHands(base, grip, null, prog(t, 2.52, 2.86));
      else { const kk = prog(t, 2.92, 3.3); p = { ...base, ...{ h1x: lerp(grip.x, SX - 40, kk), h1y: lerp(grip.y, G - 196, kk), b1: 1 } }; }
      if (t >= 2.88) remoteState = 'hand';
    } else if (t < 4.1) { // 背對沙發往後坐下
      const k = prog(t, 3.3, 4.05);
      const base = mix(STAND(SX, G), SITP(4), k); base.tor += 24 * Math.sin(Math.PI * k);
      const b = L(base);
      p = { ...b, h1x: lerp(SX - 40, HIP.x - 66, k), h1y: lerp(G - 196, HIP.y - 46, k), b1: 1 };
      remoteState = 'hand';
    } else { // 坐在沙發上
      const kk = keyed(SEATED, t);
      const b = L(SITP(kk.tor + 2.2 * shake(t), kk.hd + (t > 7.75 && t < 7.98 ? 4 * Math.sin((t - 7.75) * 40) : 0)));
      b.y = HIP.y - 2 * Math.abs(shake(t));
      const J0 = joints(b, S);
      const mouth = { x: J0.head.x - 50, y: J0.head.y + 36 };
      const lapR = { x: HIP.x - 66, y: HIP.y - 46 };
      const grab = { x: LAP.x - 4, y: LAP.y - 40 };
      const remGrip = { x: REM1.x + 2, y: REM1.y - 8 };
      let h;
      if (t < 4.45) h = lapR;
      else if (t < 4.85) h = lerpP(lapR, AIM, prog(t, 4.45, 4.85));
      else if (t < 5.85) h = { x: AIM.x, y: AIM.y + 2 * prog(t, T_PRESS - 0.03, T_PRESS) * (1 - prog(t, T_PRESS + 0.06, T_PRESS + 0.14)) };
      else if (t < 6.45) h = lerpP(AIM, remGrip, prog(t, 5.85, 6.35));
      else if (t < 6.95) h = lerpP(remGrip, REST, prog(t, 6.45, 6.95));
      else if (t < 7.35) h = lerpP(REST, grab, prog(t, 7.0, 7.35));
      else if (t < 7.75) h = lerpP(grab, mouth, prog(t, 7.38, 7.75));
      else if (t < 7.98) h = mouth;
      else h = lerpP(mouth, REST, prog(t, 7.98, 8.35));
      p = { ...b, h1x: h.x, h1y: h.y + (t > 8.35 ? 2.5 * Math.abs(shake(t)) : 0), b1: 1 };
      if (t < 6.42) remoteState = 'hand';
      else remoteState = 'table2';
      aim = t >= 4.6 && t < 5.9;
      piece = t >= 7.35 && t < 7.8;
    }
    const bowl = bowlAt(t, p);
    p.h2x = bowl.x + 24; p.h2y = bowl.y - 12; p.b2 = 1;
    if (t < 4.1 && p.gy === undefined) p.gy = G;
    const pressK = prog(t, T_PRESS - 0.03, T_PRESS) * (1 - prog(t, T_PRESS + 0.12, T_PRESS + 0.2));
    let remoteInfo = null;
    const J = figure(p, S, 'hero', {
      front: (J) => {
        popcorn(bowl);
        if (piece) { ctx.fillStyle = '#fff4d6'; ctx.beginPath(); ctx.arc(J.A1.hand.x - 8, J.A1.hand.y - 10, 8, 0, 7); ctx.fill(); }
        if (remoteState === 'hand') {
          const hd = J.A1.hand;
          let ang;
          if (aim) ang = Math.atan2(SENSOR.y - hd.y, SENSOR.x - hd.x);
          else ang = Math.atan2(J.A1.hand.y - J.A1.el.y, J.A1.hand.x - J.A1.el.x);
          const c = { x: hd.x + Math.cos(ang) * 10, y: hd.y + Math.sin(ang) * 10 };
          remote(c, ang, pressK);
          remoteInfo = { tip: { x: c.x + Math.cos(ang) * 31, y: c.y + Math.sin(ang) * 31 } };
        }
      },
    });
    // 笑：頭旁邊跳出三條小弧線（無文字）
    const lf = laugh(t);
    if (lf > 0.05) {
      const hx = J.head.x - 30, hy = J.head.y - 34;
      ctx.save(); ctx.strokeStyle = `rgba(255,211,107,${lf})`; ctx.lineWidth = 5; ctx.lineCap = 'round';
      [[-0.9, 0], [-0.35, 0.12], [0.2, 0.24]].forEach(([a, ph], i) => {
        const pulse = 0.5 + 0.5 * Math.sin((t - ph) * 14);
        const r0 = 50 + 8 * pulse, r1 = 66 + 10 * pulse, an = -Math.PI / 2 + a - 0.6;
        ctx.beginPath(); ctx.moveTo(hx + 30 + Math.cos(an) * r0, hy + 34 + Math.sin(an) * r0); ctx.lineTo(hx + 30 + Math.cos(an) * r1, hy + 34 + Math.sin(an) * r1); ctx.stroke();
      });
      ctx.restore();
    }
    return { J, p, behind, remoteState, remoteInfo };
  }

  // 紅外線小光點：遙控器 → 電視感應器
  function irPulse(t, from) {
    if (!from) return;
    for (let i = 0; i < 3; i++) {
      const k = (t - (T_PRESS + i * 0.06)) / 0.32; if (k < 0 || k > 1) continue;
      const x = lerp(from.x, SENSOR.x, k), y = lerp(from.y, SENSOR.y, k);
      glow(x, y, 26, `rgba(190,225,255,${0.9 * (1 - 0.4 * k)})`);
      ctx.fillStyle = '#eaf6ff'; ctx.beginPath(); ctx.arc(x, y, 4, 0, 7); ctx.fill();
    }
  }

  // ---------- 光線 ----------
  function tvLight(t, J) {
    const on = tvOn(t); if (on <= 0) return;
    const pop = Math.max(0, 1 - Math.abs(t - T_POP - 0.08) / 0.18);
    const f = on * (0.9 + 0.06 * Math.sin(t * 9.1) + 0.04 * Math.sin(t * 23.7) + 0.35 * pop);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(SCR.x + SCR.w / 2, SCR.y + SCR.h / 2, 1050, `rgba(110,160,255,${0.20 * f})`);
    glow(SCR.x + SCR.w / 2, SCR.y + SCR.h / 2, 330, `rgba(170,215,255,${0.30 * f})`);
    // 地上的光
    ctx.save(); ctx.translate(760, G + 20); ctx.scale(1, 0.12); glow(0, 0, 620, `rgba(150,200,255,${0.22 * f})`); ctx.restore();
    // 照在人身上
    const ch = { x: (J.sh.x + J.hip.x) / 2 - 20, y: (J.sh.y + J.hip.y) / 2 - 30 };
    glow(ch.x, ch.y, 230, `rgba(160,205,255,${0.22 * f})`);
    ctx.restore();
  }
  function warmLight() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    glow(LAMP.x, G - 420, 300, 'rgba(255,190,110,0.22)');
    glow(LAMP.x, G - 392, 110, 'rgba(255,211,107,0.35)');
    ctx.save(); ctx.translate(LAMP.x, G); ctx.scale(1, 0.15); glow(0, 0, 260, 'rgba(255,200,120,0.18)'); ctx.restore();
    glow(WIN.x + 214, WIN.y + 62, 80, 'rgba(255,244,214,0.25)'); // 月光
    ctx.restore();
  }

  function draw(c, t) {
    const zoom = 1.22 + 0.04 * prog(t, 0, 10, E.inOut);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, FT.SCENE_H); ctx.clip();
    ctx.translate(920, 690); ctx.scale(zoom, zoom); ctx.translate(-905, -680);
    room(t);
    cabinet(); tvBody(); screen(t);
    const behindNow = t < 2.5;
    if (!behindNow) sofa();
    table();
    if (t < 2.88) remote(REM0, 0);
    if (t >= 6.42) remote(REM1, 0);
    const P = person(t);
    if (behindNow) sofa();
    // 夜晚的房間偏暗，電視螢幕與燈光再疊上去
    ctx.fillStyle = 'rgba(8,5,32,0.30)'; ctx.fillRect(-200, -200, 2400, 1400);
    screen(t);
    warmLight();
    tvLight(t, P.J);
    irPulse(t, P.remoteInfo && P.remoteInfo.tip);
    ctx.restore();
  }

  return { act: 10, answer: [{ w: 'watch', verb: true }, { w: 'TV' }], draw };
})();
