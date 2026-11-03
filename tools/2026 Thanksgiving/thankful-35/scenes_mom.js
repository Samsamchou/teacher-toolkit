// my mom 的 5 句。u = 從 "because" 開始算的秒數。
// 原則：手一定碰到它在操作的東西（鍋鏟在鍋裡、手搭在肩上、捧著書），手臂不擋臉，坐姿小腿從座墊前緣垂下。
window.TARGETS = window.TARGETS || {};
window.SCENES = window.SCENES || {};

TARGETS.mom = {
  color: '#ff5d8f',
  draw(ctx, x, y, s, t, k) { drawPerson(ctx, 'mom', x, y, s, { t, armR: 20 + 30 * Math.max(0, E.wave(t, 1.2)) * k, mouth: 'smile', blinkSeed: 1 }); },
};

// 1. she cooks for me
SCENES.mom_1 = {
  dur: 8.5, sfx: [[0.1, 'sizzle'], [2.6, 'sizzle'], [4.3, 'whoosh'], [5.4, 'pop'], [5.8, 'yum'], [6.2, 'chime']],
  draw(ctx, u) {
    BG.room(ctx, u, '#fff3d6', '#d9a066', '#ffe7b8'); BG.window(ctx, 120, 150, 300, 240, u);
    ctx.fillStyle = '#a5d6a7'; rr(ctx, 480, 170, 520, 150, 16); ctx.fill(); ctx.fillStyle = '#81c784';
    for (let i = 0; i < 4; i++) { rr(ctx, 495 + i * 127, 185, 112, 120, 10); ctx.fill(); }
    // 爐子高度到媽媽的腰，鍋子在她手搆得到的地方
    PROP.stove(ctx, 680, 790, u);
    const cooking = u < 4.3;
    PROP.pan(ctx, 680, 618, u, cooking ? 1 : 0);
    if (u < 5.6) {
      ctx.save(); ctx.globalAlpha = E.seg(u, .6, 1.4) * (1 - E.seg(u, 4.8, 5.6));
      for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = ['#ffb74d', '#ff8a65', '#ffd54f'][i]; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath();
        for (let j = 0; j <= 30; j++) { const k = j / 30, x = 700 + k * 560, y = 560 - k * 100 + Math.sin(k * 10 - u * 5 + i) * 26 - i * 22; j ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
        ctx.stroke();
      }
      ctx.restore(); FX.steam(ctx, u, 680, 590, 3, 'rgba(255,255,255,.85)', 140);
    }
    // 媽媽面向爐子（左邊）：鍋鏟伸進鍋裡翻炒 → 端盤子走到孩子面前
    const walk = E.easeInOut(E.seg(u, 4.3, 5.4));
    const mx = E.lerp(840, 1110, walk);
    const handed = u > 5.5;
    const stirX = 745 + 22 * E.wave(u, 1.6);
    const spatula = c => { c.fillStyle = '#795548'; rr(c, -5, -6, 10, 52, 4); c.fill(); c.fillStyle = '#b0bec5'; rr(c, -16, 42, 32, 24, 6); c.fill(); };
    const plateItem = c => PROP.plate(c, 0, -6, .7, 1);
    drawPerson(ctx, 'mom', mx, 790, 1.05, {
      t: u, apron: true, flip: true, mouth: 'smile', blinkSeed: 1,
      reachR: cooking ? [stirX, 568] : null, armR: 12, itemR: cooking ? spatula : null, itemAngR: -55,
      reachL: cooking || handed ? null : [mx - 95, 640], armL: handed ? 35 : 12, itemL: cooking || handed ? null : plateItem, armFrontL: !cooking,
      bob: walk > 0 && walk < 1 ? -Math.abs(E.wave(u, 3)) * 10 : 0,
    });
    // 孩子：聞到香味 → 接過盤子開心地吃
    const eating = u > 5.5;
    drawPerson(ctx, 'kid', 1290, 790, 1.05, {
      t: u, eyes: u < 5.5 && u > 1 ? 'closed' : 'happy', mouth: eating ? 'chew' : (u > 1 ? 'o' : 'smile'),
      bob: u > 1 && u < 5.5 ? -10 - 6 * E.wave(u, 1) : 0,
      reachL: eating ? [1245, 640] : null, reachR: eating ? [1335, 640] : null, armL: 10, armR: 10,
    });
    if (eating) { PROP.plate(ctx, 1290, 634, .8, 1 - E.seg(u, 6, 8.2) * .7); FX.floatHearts(ctx, u, 1290, 420, 6, 240, 3, 5.6); FX.burst(ctx, u, 1290, 420, 5.8); FX.sparkles(ctx, u, 1290, 500, 220, 8, 4); }
  },
};

// 2. she loves me
SCENES.mom_2 = {
  dur: 8, sfx: [[0.6, 'whoosh'], [1.9, 'heart'], [2.6, 'chime'], [5, 'sparkle']],
  draw(ctx, u) {
    BG.room(ctx, u, '#ffe4ec', '#e0a96d', '#ffd1df'); BG.window(ctx, 1200, 150, 280, 220, u);
    const k = E.easeInOut(E.seg(u, .4, 1.8));
    const hug = E.seg(u, 1.6, 2.1);
    const cx = 800;
    const hs = E.pop(u, 1.9, .7);
    if (hs > 0) {
      FX.rays(ctx, u, cx, 470, 620, 'rgba(255,120,160,.18)', 16);
      glow(ctx, cx, 470, 420, 'rgba(255,140,180,.7)');
      heart(ctx, cx, 520, 560 * hs * (1 + .04 * E.wave(u, 1.2)), '#ff7aa8');
      heart(ctx, cx, 520, 450 * hs * (1 + .04 * E.wave(u, 1.2, .5)), '#ff9ec0');
    }
    // 兩人並肩擁抱：頭不重疊；孩子的手環到媽媽背後，媽媽的手搭在孩子肩上（在臉的下方）
    const kx = E.lerp(420, cx - 95, k), mx = E.lerp(1180, cx + 95, k);
    const sway = 4 * E.wave(u, .6) * hug;
    drawPerson(ctx, 'kid', kx, 800, 1.1, {
      t: u, lean: 5 * hug + sway, eyes: hug > .5 ? 'happy' : 'open', mouth: hug > .5 ? 'open' : 'smile',
      bob: k > 0 && k < 1 ? -Math.abs(E.wave(u, 3)) * 14 : 0,
      armL: hug > .5 ? 150 + 10 * E.wave(u, 1.5) : 12, reachR: hug > .5 ? [mx - 25, 668] : null, armR: 12,
    });
    drawPerson(ctx, 'mom', mx, 800, 1.05, {
      t: u, flip: true, lean: -5 * hug + sway, eyes: hug > .5 ? 'happy' : 'open', mouth: 'smile', blinkSeed: 1,
      bob: k > 0 && k < 1 ? -Math.abs(E.wave(u, 3)) * 10 : 0,
      reachR: hug > .5 ? [kx + 40, 640] : null, armR: 12, armL: hug > .5 ? 25 : 12,
    });
    if (hug > 0) { FX.floatHearts(ctx, u, cx, 360, 10, 500, 9, 2); FX.sparkles(ctx, u, cx, 400, 420, 14, 2); }
  },
};

// 3. she helps me
SCENES.mom_3 = {
  dur: 8.5, sfx: [[0.3, 'bounce'], [1.5, 'bounce'], [2.2, 'whoosh'], [3.6, 'pop'], [4.0, 'pop'], [5.0, 'ding'], [5.2, 'chime']],
  draw(ctx, u) {
    BG.room(ctx, u, '#e8f5e9', '#d7a86e', '#d0ecd2'); BG.window(ctx, 140, 150, 300, 220, u);
    const momIn = E.easeOut(E.seg(u, 1.8, 3.2));
    const kx = 640, wob = u < 3.4 ? E.wave(u, 1.4) * 6 : 0;
    const sx = kx + 110;                      // 箱子疊在孩子身體右邊，雙手扶住左側
    const mx = E.lerp(1700, 1120, momIn), mbx = mx - 20;
    // 5 個箱子；媽媽拿走上面 2 個，抱在腰前（不擋臉）
    const cols = ['#ffb74d', '#4fc3f7', '#e57373', '#81c784', '#ba68c8'];
    const boxAt = i => {
      const mk = i >= 3 ? E.easeInOut(E.seg(u, 3.4 + (i - 3) * .4, 3.9 + (i - 3) * .4)) : 0;
      const x0 = sx + wob * (i + 1) * 2.2, y0 = 700 - i * 62, x1 = mbx, y1 = 720 - (i - 3) * 62;
      return [E.lerp(x0, x1, mk), E.lerp(y0, y1, mk) - Math.sin(mk * Math.PI) * 120, mk];
    };
    drawPerson(ctx, 'kid', kx, 800, 1.05, { t: u, eyes: u < 4.6 ? 'sad' : 'happy', mouth: u < 4.6 ? 'sad' : 'open', lean: wob * .5, bob: u < 3.4 ? E.wave(u, 2) * 4 : 0, reachR: [sx - 46, 690], reachL: [sx - 46, 620], armFrontL: true });
    drawPerson(ctx, 'mom', mx, 800, 1.05, { t: u, flip: true, mouth: 'smile', blinkSeed: 1, bob: momIn < 1 ? -Math.abs(E.wave(u, 3)) * 10 : 0, reachR: u > 3.6 ? [mbx - 46, 715] : null, reachL: u > 3.6 ? [mbx + 46, 715] : null, armL: 12, armR: 12 });
    for (let i = 0; i < 5; i++) { const [bx, by, mk] = boxAt(i); ctx.save(); ctx.translate(bx, by); ctx.rotate((1 - mk) * wob * .02 * (i + 1)); PROP.box(ctx, 0, 0, .9, cols[i]); ctx.restore(); }
    if (u < 3.4) for (let i = 0; i < 2; i++) { const k = (u * 1.2 + i * .5) % 1; ctx.save(); ctx.globalAlpha = 1 - k; ctx.fillStyle = '#4fc3f7'; ctx.beginPath(); ctx.ellipse(kx + 70 + i * 16, 500 + k * 60, 8, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
    FX.check(ctx, 880, 330, E.seg(u, 5, 5.6));
    FX.burst(ctx, u, 880, 330, 5.1);
    if (u > 5) FX.sparkles(ctx, u, 880, 420, 380, 12, 6);
  },
};

// 4. she reads books with me
SCENES.mom_4 = {
  dur: 8.5, sfx: [[0.5, 'page'], [1.75, 'page'], [3.0, 'page'], [4.25, 'page'], [5.5, 'page'], [1.2, 'sparkle'], [3.6, 'chime']],
  draw(ctx, u) {
    BG.room(ctx, u, '#ede7f6', '#c48b5a', '#e1d7f3'); BG.window(ctx, 1220, 130, 260, 220, u, 1);
    PROP.lamp(ctx, 260, 760, u);
    PROP.sofa(ctx, 800, 790);                 // 座墊上緣約在 y = 680
    // 兩人坐在座墊上，小腿從座墊前緣垂下；一起捧著攤開的書放在腿上
    drawPerson(ctx, 'kid', 690, 680, .95, { t: u, sit: true, swing: 1, eyes: u > 1.2 ? 'open' : 'happy', mouth: u > 1.2 ? 'o' : 'smile', tilt: 8, reachR: [775, 640], reachL: [700, 650] });
    drawPerson(ctx, 'mom', 935, 680, 1.0, { t: u, sit: true, mouth: 'talk', tilt: -8, blinkSeed: 1, reachL: [855, 640], reachR: [930, 650] });
    PROP.book(ctx, 815, 628, .62, 1, u);
    const items = [
      c => star(c, 0, 0, 34, '#ffd54f'),
      c => { c.fillStyle = '#4fc3f7'; c.beginPath(); c.ellipse(0, 0, 40, 22, 0, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(34, 0); c.lineTo(60, -20); c.lineTo(60, 20); c.fill(); circle(c, -18, -6, 5, '#fff'); },
      c => { c.fillStyle = '#ba68c8'; c.fillRect(-36, -20, 72, 50); c.fillRect(-46, -50, 22, 40); c.fillRect(24, -50, 22, 40); c.fillStyle = '#7b1fa2'; c.fillRect(-10, 6, 20, 24); },
      c => { c.fillStyle = '#ff8a65'; c.beginPath(); c.moveTo(-40, 10); c.lineTo(40, 10); c.lineTo(28, 30); c.lineTo(-28, 30); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -46); c.lineTo(34, 0); c.fill(); },
      c => heart(c, 0, 0, 40, '#ff7aa8'),
    ];
    // 故事從書頁飛出來，往上飄到兩人頭頂
    for (let i = 0; i < 10; i++) {
      const st = .8 + i * .55; const k = E.seg(u, st, st + 3.2); if (k <= 0 || k >= 1) continue;
      const x = 798 + Math.sin(i * 2.3) * 400 * E.easeOut(E.seg(k, .4, 1)), y = 600 - E.easeOut(k) * 430 + Math.sin(u * 3 + i) * 8;
      ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI); ctx.translate(x, y); ctx.rotate(Math.sin(u + i) * .3); ctx.scale(.6 + .6 * k, .6 + .6 * k); items[i % items.length](ctx); ctx.restore();
    }
    FX.sparkles(ctx, u, 815, 430, 330, 12, 8);
  },
};

// 5. she takes care of me
SCENES.mom_5 = {
  dur: 9, sfx: [[0.2, 'whoosh'], [1.6, 'pop'], [2.8, 'yum'], [4.2, 'ding'], [4.5, 'chime'], [5.0, 'sparkle']],
  draw(ctx, u) {
    const well = E.seg(u, 4.2, 5.2);
    BG.room(ctx, u, '#e3f2fd', '#bcaaa4', '#d4e9fb'); BG.window(ctx, 1180, 140, 300, 230, u, well < .5 ? 1 : 0);
    PROP.bed(ctx, 560, 790);
    const kx = 650;
    drawPerson(ctx, 'kid', kx, 720, 1.0, { t: u, sick: 1 - well, eyes: well > .5 ? 'happy' : 'sad', mouth: well > .5 ? 'open' : (u > 2.6 && u < 4 ? 'chew' : 'sad'), armL: well > .5 ? 150 : 15, armR: well > .5 ? 150 : 15, bob: well > .5 ? -Math.abs(E.wave(u, 2)) * 16 : 0 });
    PROP.blanket(ctx, kx - 20, 790);
    // 額頭的濕毛巾（媽媽放上去之後才出現）
    const towel = 1 - well;
    if (towel > 0) { ctx.save(); ctx.globalAlpha = towel; ctx.fillStyle = '#ffffff'; rr(ctx, kx - 50, 452, 100, 30, 12); ctx.fill(); ctx.strokeStyle = '#90caf9'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); }
    PROP.thermometer(ctx, kx - 130, 500, 1 - well * .75);
    // 媽媽走到床邊：一手端碗，一手先放毛巾、再用湯匙餵湯
    const momIn = E.easeOut(E.seg(u, 0, 1.3)), mx = E.lerp(1500, 860, momIn);
    const bowl = c => PROP.bowl(c, 0, 4, u);
    const spoon = c => { c.fillStyle = '#b0bec5'; rr(c, -3, -4, 6, 46, 3); c.fill(); c.beginPath(); c.ellipse(0, 46, 11, 8, 0, 0, Math.PI * 2); c.fill(); };
    let reachR = null, itemR = null, angR;
    if (u > 1.1 && u < 1.9) reachR = [kx + 70 + 12 * E.wave(u, 2.5), 700];   // 拉好被子
    else if (u >= 2.2 && u < 4) {
      const f = E.seg(u, 2.2, 2.8) - E.seg(u, 3.3, 3.9);
      reachR = [E.lerp(mx - 40, kx + 40, f), E.lerp(640, 525, f)]; itemR = spoon; angR = E.lerp(-60, -112, f);
    }
    drawPerson(ctx, 'mom', mx, 800, 1.05, { t: u, flip: true, mouth: 'smile', eyes: well > .5 ? 'happy' : 'open', blinkSeed: 1, reachR, itemR, itemAngR: angR, armR: 12, reachL: u < 4.2 ? [mx - 40, 660] : null, itemL: u < 4.2 ? bowl : null, armL: 12, armFrontL: true });
    if (well > 0) { glow(ctx, kx, 470, 300, 'rgba(255,240,150,.8)', well); FX.burst(ctx, u, kx, 470, 4.4); FX.sparkles(ctx, u, kx, 480, 260, 12, 5); FX.floatHearts(ctx, u, kx + 150, 440, 6, 300, 11, 4.8); }
  },
};
