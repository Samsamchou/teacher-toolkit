// Free Time Guess — 共用引擎（畫風 G 扁平科普風）
// 每一格只由時間 t 決定，可重現。每段：動作 0–ACT 秒 → 倒數 3 秒 → 答案 3 秒。
const W = 1920, H = 1080;
const SEGMENTS = {};

const FT = (() => {
  const cv = document.getElementById('c');
  const ctx = cv.getContext('2d');

  // ---------- 色票（沿用 G 試片） ----------
  const C = {
    sky0: '#140f3a', sky1: '#2b1a63', sky2: '#4a2377', glow: '#e0457b',
    ink: '#ffffff', sub: '#c9b8ff', gold: '#ffd36b', light: '#fff4d6',
    red: '#e8433a', rim: '#ff7aa8', bar: '#0e0a2b',
    hero: '#f1ecff', heroFar: '#c9bff0', npc: '#8f80cf', npcFar: '#7062b3',
  };

  // ---------- 小工具 ----------
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, k) => a + (b - a) * k;
  const E = {
    lin: k => k,
    inOut: k => (k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2),
    out: k => 1 - Math.pow(1 - k, 3),
    in: k => k * k * k,
    back: k => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
  };
  const prog = (t, a, b, e = E.inOut) => e(clamp((t - a) / (b - a), 0, 1));
  const rad = a => a * Math.PI / 180;
  // 角度慣例：0 = 朝下，90 = 朝右，180 = 朝上，-90 = 朝左
  const step = (o, L, a) => ({ x: o.x + L * Math.sin(rad(a)), y: o.y + L * Math.cos(rad(a)) });
  // 關鍵影格：keys = [[時間, {數值...}], ...]
  function keyed(keys, t, e = E.inOut) {
    if (t <= keys[0][0]) return { ...keys[0][1] };
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, p0] = keys[i], [t1, p1] = keys[i + 1];
      if (t <= t1) {
        const k = e((t - t0) / (t1 - t0)); const o = {};
        for (const n in p1) o[n] = lerp(p0[n] ?? p1[n], p1[n], k);
        for (const n in p0) if (!(n in o)) o[n] = p0[n];
        return o;
      }
    }
    return { ...keys[keys.length - 1][1] };
  }
  // 兩節 IK：肩 a → 手 target，bend = ±1 決定手肘彎向
  function ik(a, target, L1, L2, bend) {
    const dx = target.x - a.x, dy = target.y - a.y;
    const d = clamp(Math.hypot(dx, dy), 1, L1 + L2 - 0.5);
    const ang = Math.atan2(dy, dx);
    const A = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    const e = ang + bend * A;
    return { elbow: { x: a.x + L1 * Math.cos(e), y: a.y + L1 * Math.sin(e) },
             hand: { x: a.x + d * Math.cos(ang), y: a.y + d * Math.sin(ang) } };
  }
  // 固定亂數（星星、觀眾）
  function rng(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

  // ---------- 剪影人物 ----------
  // p: x,y = 髖部；tor 身體傾斜；hd 頭部轉角；
  //    手：a1/e1（上臂/前臂角度）或 h1x/h1y（手的目標點，用 IK）；第二隻手 a2/e2 或 h2x/h2y
  //    腳：l1/k1、l2/k2（大腿/小腿角度）；face = 1 朝右、-1 朝左
  const BONE = { torso: 66, neck: 14, head: 25, up: 40, fore: 38, thigh: 50, shin: 50 };
  function joints(p, s) {
    const hip = { x: p.x, y: p.y };
    const up = 180 - (p.tor || 0);
    const sh = step(hip, BONE.torso * s, up);
    const neck = step(hip, (BONE.torso + BONE.neck) * s, up);
    const head = step(neck, BONE.head * s * 0.95, up - (p.hd || 0));
    const arm = (i) => {
      const L1 = BONE.up * s, L2 = BONE.fore * s;
      if (p['h' + i + 'x'] !== undefined) {
        const r = ik(sh, { x: p['h' + i + 'x'], y: p['h' + i + 'y'] }, L1, L2, p['b' + i] ?? -p.face);
        return { el: r.elbow, hand: r.hand };
      }
      const el = step(sh, L1, p['a' + i]); return { el, hand: step(el, L2, p['e' + i]) };
    };
    const leg = (i) => { const kn = step(hip, BONE.thigh * s, p['l' + i]); return { kn, ft: step(kn, BONE.shin * s, p['k' + i]) }; };
    return { hip, sh, neck, head, A1: arm(1), A2: arm(2), L1: leg(1), L2: leg(2) };
  }
  function limb(a, b, c, w, col) {
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); if (c) ctx.lineTo(c.x, c.y); ctx.stroke();
  }
  function shoe(ft, kn, face, s, col) {
    ctx.fillStyle = col; ctx.beginPath();
    ctx.ellipse(ft.x + face * 9 * s, ft.y + 2 * s, 15 * s, 7 * s, 0, 0, Math.PI * 2); ctx.fill();
  }
  // 一個顏色畫整個人（far = 遠側手腳的顏色）
  function figureFlat(J, p, s, col, far, extra) {
    const face = p.face || 1;
    limb(J.hip, J.L2.kn, J.L2.ft, 21 * s, far); shoe(J.L2.ft, J.L2.kn, face, s, far);
    limb(J.sh, J.A2.el, J.A2.hand, 16 * s, far);
    if (extra && extra.behind) extra.behind(J, far, s, face);
    // 軀幹：上寬下窄的膠囊
    const up = rad(180 - (p.tor || 0));
    const nx = Math.cos(up), ny = -Math.sin(up);
    const top = step(J.hip, (BONE.torso + 4) * s, 180 - (p.tor || 0));
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(J.hip.x + nx * 15 * s, J.hip.y + ny * 15 * s);
    ctx.lineTo(top.x + nx * 21 * s, top.y + ny * 21 * s);
    ctx.lineTo(top.x - nx * 21 * s, top.y - ny * 21 * s);
    ctx.lineTo(J.hip.x - nx * 15 * s, J.hip.y - ny * 15 * s);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(top.x, top.y, 21 * s, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(J.hip.x, J.hip.y, 16 * s, 0, Math.PI * 2); ctx.fill();
    limb(J.neck, J.sh, null, 13 * s, col);
    ctx.beginPath(); ctx.arc(J.head.x, J.head.y, 23 * s, 0, Math.PI * 2); ctx.fill();
    if (extra && extra.head) extra.head(J, col, s, face);
    limb(J.hip, J.L1.kn, J.L1.ft, 22 * s, col); shoe(J.L1.ft, J.L1.kn, face, s, col);
    limb(J.sh, J.A1.el, J.A1.hand, 17 * s, col);
    ctx.beginPath(); ctx.arc(J.A1.hand.x, J.A1.hand.y, 9.5 * s, 0, Math.PI * 2); ctx.fill();
    if (extra && extra.front) extra.front(J, col, s, face);
  }
  // 剪影＋右側洋紅輪廓光＋地面影子
  function figure(p, s, tone, extra) {
    const J = joints(p, s);
    const col = tone === 'hero' ? C.hero : C.npc, far = tone === 'hero' ? C.heroFar : C.npcFar;
    if (p.gy !== undefined) { // 地面影子
      ctx.save(); ctx.fillStyle = 'rgba(8,5,30,0.35)';
      ctx.beginPath(); ctx.ellipse(p.x + 6 * s, p.gy + 4 * s, 62 * s, 10 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(4.5 * s, -1.5 * s); figureFlat(J, p, s, C.rim, C.rim, extra); ctx.restore();
    figureFlat(J, p, s, col, far, extra);
    return J;
  }

  // ---------- 發光 ----------
  function glow(x, y, r, col, a = 1) {
    if (!(r > 0.5)) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }

  // ---------- 句子列 ----------
  const SCENE_H = 905;          // 場景座標的底線（場景檔一律用這個裁切）
  const BAR_Y = 835, FONT = "'Comic Relief'"; // 老師指定：所有影片字體 Comic Relief
  function sentence(seg, t) {
    ctx.fillStyle = C.bar; ctx.fillRect(0, BAR_Y, W, H - BAR_Y);
    ctx.fillStyle = 'rgba(255,122,168,0.55)'; ctx.fillRect(0, BAR_Y, W, 3);
    const size = 78, y = 945;   // 字幕往上移（老師 11/10：不要太下面）
    ctx.font = `700 ${size}px ${FONT}`; ctx.textBaseline = 'alphabetic';
    const pre = 'I', post = 'in my free time.';
    const blank = 640, gap = 30;
    const wPre = ctx.measureText(pre).width, wPost = ctx.measureText(post).width;
    const x0 = (W - (wPre + gap + blank + gap + wPost)) / 2;
    ctx.fillStyle = C.ink;
    ctx.fillText(pre, x0, y);
    ctx.fillText(post, x0 + wPre + gap + blank + gap, y);
    const bx = x0 + wPre + gap;
    ctx.fillStyle = 'rgba(201,184,255,0.85)'; ctx.fillRect(bx, y + 14, blank, 6);
    // 答案（動詞金色、其餘紅色）逐字彈出
    const t0 = seg.act + 3;
    if (t >= t0) {
      const words = seg.answer;
      ctx.font = `700 ${size}px ${FONT}`;
      const ws = words.map(w => ctx.measureText(w.w).width);
      const total = ws.reduce((a, b) => a + b, 0) + 26 * (words.length - 1);
      let x = bx + (blank - total) / 2;
      words.forEach((w, i) => {
        const k = prog(t, t0 + 0.05 + i * 0.18, t0 + 0.5 + i * 0.18, E.back);
        if (k > 0) {
          ctx.save();
          ctx.translate(x + ws[i] / 2, y - 26); ctx.scale(k, k);
          ctx.globalAlpha = clamp(k, 0, 1);
          ctx.fillStyle = w.verb ? C.gold : C.red;
          ctx.shadowColor = w.verb ? 'rgba(255,211,107,0.55)' : 'rgba(232,67,58,0.6)'; ctx.shadowBlur = 22;
          ctx.textAlign = 'center'; ctx.fillText(w.w, 0, 26);
          ctx.restore();
        }
        x += ws[i] + 26;
      });
    }
  }

  // ---------- 倒數 3 秒 ----------
  function countdown(seg, t) {
    const a = seg.act; if (t < a || t >= a + 3) return;
    const sec = Math.floor(t - a), frac = t - a - sec, n = 3 - sec;
    const cx = 960, cy = 250, r = 118;
    const k = prog(frac, 0, 0.35, E.back);
    ctx.save();
    ctx.fillStyle = 'rgba(14,10,43,0.88)';
    ctx.beginPath(); ctx.arc(cx, cy, r + 26, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(201,184,255,0.22)';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = C.gold; ctx.shadowColor = 'rgba(255,211,107,0.7)'; ctx.shadowBlur = 24;
    const left = 1 - (t - a) / 3;
    ctx.beginPath(); ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.translate(cx, cy); ctx.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
    ctx.fillStyle = C.ink; ctx.font = `700 170px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), 0, 8);
    ctx.restore();
  }


  // ---------- 共用姿勢 ----------
  // 朝右設計的姿勢 → 朝左（角度全部取負）
  function mirror(p) {
    const o = { ...p };
    ['tor', 'hd', 'a1', 'e1', 'a2', 'e2', 'l1', 'k1', 'l2', 'k2'].forEach(n => { if (o[n] !== undefined) o[n] = -o[n]; });
    o.face = -(p.face || 1); return o;
  }
  // 走路（朝右）：phase 用走過的距離算，amp 0–1
  function walk(x, groundY, phase, amp = 1) {
    const sw = Math.sin(phase) * amp;
    return { x, y: groundY - 146 - 5 * Math.abs(Math.cos(phase)) * amp, tor: 3 * amp, face: 1,
      l1: 26 * sw, k1: 26 * sw - 4 - 26 * Math.max(0, -Math.cos(phase)) * amp,
      l2: -26 * sw, k2: -26 * sw - 4 - 26 * Math.max(0, Math.cos(phase)) * amp,
      a1: -22 * sw, e1: -22 * sw + 18, a2: 22 * sw, e2: 22 * sw + 18, hd: 0 };
  }
  const STAND = (x, g) => ({ x, y: g - 146, tor: 0, face: 1, l1: 6, k1: 3, l2: -6, k2: -3, a1: 6, e1: 14, a2: -6, e2: 10, hd: 0 });
  const KNEEL = (x, g) => ({ x, y: g - 86, tor: 10, face: 1, l1: 84, k1: 2, l2: -6, k2: -86, a1: 20, e1: 60, a2: 10, e2: 50, hd: 0 });
  const SIT = (x, g, seatTop) => ({ x, y: seatTop - 12, tor: 6, face: 1, l1: 86, k1: 4, l2: 82, k2: 8, a1: 30, e1: 70, a2: 25, e2: 60, hd: 0 });
  function mix(p0, p1, k) { const o = { ...p1 }; for (const n in p1) if (typeof p1[n] === 'number' && typeof p0[n] === 'number' && n !== 'face') o[n] = lerp(p0[n], p1[n], k); return o; }

  function frame(seg, t) {
    ctx.save(); ctx.clearRect(0, 0, W, H);
    ctx.save(); ctx.translate(0, BAR_Y - SCENE_H); seg.draw(ctx, t); ctx.restore(); // 場景整體上移，底部對齊字幕列
    // 倒數時畫面稍微變暗，讓數字跳出
    if (t >= seg.act && t < seg.act + 3) { ctx.fillStyle = 'rgba(10,6,35,0.18)'; ctx.fillRect(0, 0, W, BAR_Y); }
    countdown(seg, t);
    sentence(seg, t);
    ctx.restore();
  }

  return { ctx, C, W, H, clamp, lerp, E, prog, rad, step, keyed, ik, rng, figure, glow, limb, frame, BAR_Y, SCENE_H, joints, mirror, walk, STAND, KNEEL, SIT, mix };
})();
