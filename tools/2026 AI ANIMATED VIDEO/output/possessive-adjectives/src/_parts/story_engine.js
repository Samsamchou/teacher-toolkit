  // ======================= 通用故事段（第 2–6 段；第 1 段是手寫版） =======================
  // o: n, row(ROWS 索引), chars {id:{img,x,foot,h,flip,bgs:[背景名…]}}, props {id:{img,x,y,h,rot,line,word,anim,bg}},
  //    lines[{bg, cam:[s,x,y], subj:{word, chars}, tags:[{occ, label, obj|scene|top, owners:[charId], bend}], fx(lt,gt,line,at)}],
  //    final:{dir} 或 null（第 5 句 2D）、quiz:{bg, chars, obj, parts, opts, answer, owners, who}
  const DUO = { s05_1: "s05_1g", s05_5: "s05_5g", s05_1s: "s05_1gs", s05_5s: "s05_5gs" };
  const WHO = { ken: "Ken", mom: "Mom", dad: "Dad", shuiling: "Shuiling" };
  const posIdx = (key, occ = 0) => { const ws = L(key).words; let c = 0; for (let i = 0; i < ws.length; i++) if (POSW.includes(norm(ws[i].w))) { if (c === occ) return i; c++; } return 0; };
  const wIdx = (key, w, occ = 0) => { const ws = L(key).words; let c = 0; for (let i = 0; i < ws.length; i++) if (norm(ws[i].w) === w) { if (c === occ) return i; c++; } return 0; };
  const sayLine = (key, at, o = {}) => {
    const who = L(key).who; say(key, at, Object.assign({ who: DUO[key] ? "Ken & Shuiling" : WHO[who] }, o));
    if (DUO[key]) F.audio.push([`audio/${key.slice(0, 3)}/${DUO[key]}.mp3`, at, -2]);
  };
  function titleCard(n, r, i) {
    const t0 = NOW; say(`${n}_t`, t0 + 0.6, { nocap: true }); sfx("sfx/whoosh.wav", t0, -8);
    seg(D(`${n}_t`) + 1.8, lt => {
      nightBg(lt + 200 + i * 30, 9); txt(`Story ${i + 1}`, 960, 230, 56, "#ffd9b8", { alpha: clamp(lt / 0.3) });
      const kI = clamp((lt - 0.1) / 0.4);
      if (r.icon === "hand") iconImg("hand", 520, 540, 260, kI);
      else if (r.icon.length === 1) headIcon(r.icon[0][0], 520, 540, 120, r.icon[0][1], kI);
      else { headIcon(r.icon[0][0], 460, 540, 100, r.icon[0][1], kI); headIcon(r.icon[1][0], 590, 550, 100, r.icon[1][1], kI); }
      const k = clamp((lt - 0.3) / 0.4); txt(r.s, 830, 540, 180, BLUE, { sc: 0.4 + 0.6 * back(k), alpha: clamp(k * 3) });
      arrowR(990, 1110, 540, clamp((lt - 0.6) / 0.3)); const k2 = clamp((lt - 0.8) / 0.4); txt(r.p, 1350, 540, 200, RED, { sc: 0.4 + 0.6 * back(k2), alpha: clamp(k2 * 3) });
      txt(`${r.zs} → ${r.zp}`, 960, 780, 64, "#fff", { zh: true, alpha: clamp((lt - 1.0) / 0.3) });
    });
  }
  function chest(c) { return [c.x + (c.cx || 0), c.foot - c.h * 0.55]; }
  function drawStoryScene(o, gt, lt, at, li, keys, bgName, still = false) {
    // 角色、道具、虛線、名牌（全部畫在鏡頭裡）
    const talkers = {}; keys.forEach((k, i) => { if (gt > at[i] && gt < at[i] + D(k)) { talkers[L(k).who] = 1; if (DUO[k]) talkers.shuiling = 1; } });
    if (o.update) o.update(gt, at, li, still);
    cover(bgName, o.ay ?? 0.5, o.filter || "none");
    if (o.bgfx) o.bgfx(lt, gt, li, at);
    const propK = p => { if (still) return 1; if (p.line == null) return 1; if (li < p.line) return 0; if (li > p.line) return 1; return clamp((gt - at[p.line] - W(keys[p.line], p.word || 0)) / (p.anim === "bounce" ? 0.5 : 0.35)); };
    const drawProp = (id, p) => {
      if (p.bg && p.bg !== bgName) return; const k = propK(p); if (k <= 0) return;
      let dy = 0, rot = p.rot || 0;
      if (p.anim === "drop") dy = -(1 - ease(k)) * 140; if (p.anim === "bounce") { dy = -(k < 1 ? Math.abs(Math.cos(k * Math.PI * 1.5)) * (1 - k) * 260 : 0); rot += k * 6; }
      if (p.draw) p.draw(p, k, lt); else iconImg(p.img, p.x, p.y + dy + (p.float ? Math.sin(lt * 2.5) * 8 : 0), p.h, p.anim === "fade" ? 1 : k, rot);
    };
    Object.entries(o.props).forEach(([id, p]) => { if (p.under) drawProp(id, p); });
    Object.entries(o.chars).forEach(([id, c]) => {
      if (c.bgs && !c.bgs.includes(bgName)) return;
      const t = talkers[id] ? Math.abs(Math.sin(lt * 9)) * 6 : 0, walk = c.walk ? c.walk(gt, at, li) : null;
      char(c.img, c.x + (walk ? walk.dx : 0), c.foot, c.h, { flip: c.flip, bob: t + (walk ? walk.bob : 0), sy: 1 + Math.sin(lt * 2 + c.x) * 0.006 });
    });
    Object.entries(o.props).forEach(([id, p]) => { if (!p.under) drawProp(id, p); });
    // 名牌與虛線（每句的所有格；之前句子的名牌保留，但場景換了就不畫）
    o.lines.forEach((ln, i) => {
      if (i > li || !ln.tags) return; if ((ln.bg || o.lines[0].bg) !== bgName) return; if (o.lines[li] && o.lines[li].clear && i < li && !still) return;
      ln.tags.forEach(tg => {
        const wi = posIdx(keys[i], tg.occ || 0), tw0 = still ? -99 : at[i] + W(keys[i], wi), kd = clamp((gt - tw0) / 0.5), kt = clamp((gt - tw0 - 0.3) / 0.35);
        if (tg.top) { tag(tg.tx, tg.ty, tg.label, kt, 70, 0.04); return; }
        if (tg.scene) {   // 整個場景外框（my room…）
          if (kd > 0 && i === li) { X.save(); X.strokeStyle = RED; X.lineWidth = 14; X.setLineDash([40, 22]); X.lineDashOffset = -T * 60; X.globalAlpha = clamp(kd * 2) * (still ? 0 : 1);
            X.beginPath(); X.roundRect(40, 30, 1840, 1020, 40); X.stroke(); X.restore(); }
          tag(tg.x ?? 960, tg.y ?? 120, tg.label, kt, 74, 0); return;
        }
        const ob = tg.obj ? (o.props[tg.obj] || o.chars[tg.obj]) : null, tx = tg.tx ?? (ob ? ob.x : 960), ty = tg.ty ?? (ob ? (ob.y ?? ob.foot - ob.h * 0.5) : 300);
        (tg.owners || []).forEach((ow, j) => { const c = o.chars[ow], [cx, cy] = chest(c); dashLine(cx, cy - j * 30, tg.dx ?? tx, tg.dy ?? ty, kd, RED, tg.bend || 0); });
        tag(tg.lx ?? tx, tg.ly ?? (ty - (ob && ob.h ? ob.h * 0.62 : 120)), tg.label, kt, tg.size || 58, tg.rot ?? -0.06);
      });
    });
    // 主詞藍字（He、She、We、They 念到時出現在那個人頭上）
    const ln = o.lines[li];
    if (ln && ln.subj && !still) {
      const wi = wIdx(keys[li], ln.subj.word), ks = clamp((gt - at[li] - W(keys[li], wi)) / 0.35);
      if (gt < at[li] + D(keys[li]) + 0.6) ln.subj.chars.forEach(id => { const c = o.chars[id]; bigText(ln.subj.label || ln.subj.word.replace(/^./, m => m.toUpperCase()), c.x + (c.cx || 0), c.foot - c.h - 50, 100, ks, BLUE); });
    }
  }
  function story(o) {
    const n = o.n, r = ROWS[o.row], keys = [1, 2, 3, 4, 5].map(i => `${n}_${i}`);
    titleCard(n, r, o.row);
    // ---- 第一次：正常速度 ----
    const t0 = NOW, at = []; let c = t0 + 0.5;
    const nl = o.final ? 4 : 5;
    keys.slice(0, nl).forEach(k => { at.push(c); c += D(k) + 0.75; });
    at.forEach((x, i) => sayLine(keys[i], x, { x: o.lines[i].capx ?? 1150, maxw: 1150 }));
    o.lines.slice(0, nl).forEach((ln, i) => {
      (ln.tags || []).forEach(tg => sfx("sfx/tag.wav", at[i] + W(keys[i], posIdx(keys[i], tg.occ || 0)), -5));
      if (ln.sfx) ln.sfx.forEach(([f, w, db]) => sfx(f, at[i] + W(keys[i], w), db));
    });
    Object.values(o.props).forEach(p => { if (p.line != null && p.line < nl) sfx("sfx/pop.wav", at[p.line] + W(keys[p.line], p.word || 0), -9); });
    seg(c - t0 + 0.2, lt => {
      const gt = t0 + lt; let li = 0; at.forEach((x, i) => { if (gt >= x - 0.3) li = i; });
      const ln = o.lines[li], prev = o.lines[Math.max(0, li - 1)], cam = ln.cam || [1, 0, 0], pc = li === 0 ? (o.cam0 || cam) : (prev.cam || [1, 0, 0]);
      const ts = li === 0 ? t0 : at[li] - 0.3; camAt(gt, ts, ts + (li === 0 ? c - t0 : 0.9), pc[0], cam[0], pc[1], cam[1], pc[2], cam[2]);
      if ((ln.bg || o.lines[0].bg) !== ((prev.bg || o.lines[0].bg)) && li > 0) CAM = { s: cam[0], x: cam[1], y: cam[2] };   // 換場景直接切
      withCam(() => { drawStoryScene(o, gt, lt, at, li, keys, ln.bg || o.lines[0].bg); if (ln.fx) ln.fx(lt, gt, li, at); });
      bokeh(lt, 6, 7, 0.4);
    });
    // ---- 第 5 句：3D（沿用已渲好的鏡頭）或 2D ----
    if (o.final) {
      const a5 = NOW, k5 = keys[4], fdir = o.final.dir, id = `f3d_${n}`; sayLine(k5, a5 + 0.8, { x: 1160 });
      const pw = posIdx(k5, 0); sfx("sfx/tag.wav", a5 + 0.8 + W(k5, pw), -5);
      need(`${id}_still`, `${fdir}/f0070.png`);
      seg(5.8, lt => {
        if (IM[id] && IM[id].im.width) cover(id, 0.5);
        tag(1500, 150, o.final.label, clamp((lt - 0.8 - W(k5, pw)) / 0.35), 70, 0.04);
      }, async lt => {
        const f = String(Math.max(0, Math.min(139, Math.round(lt * 24)))).padStart(4, "0");
        if (IM[id] && IM[id].f === f) return; delete IM[id]; await load(id, `${fdir}/f${f}.png`); IM[id].f = f;
      });
    }
    // ---- Listen and repeat ----
    const bgOf = i => i === 4 && o.final ? `f3d_${n}_still` : (o.lines[i].bg || o.lines[0].bg);
    {
      const r0 = NOW; F.audio.push(["audio/s01/s01_rep.mp3", r0 + 0.4, 0]);
      seg(D("s01_rep") + 0.9, lt => {
        cover(bgOf(0), 0.5, "blur(10px) brightness(0.5)"); ear(760, 470, 1.6, clamp(lt / 0.4)); mic(1160, 470, 1.5, clamp((lt - 0.3) / 0.4));
        bigText("Listen and repeat!", 960, 720, 110, clamp((lt - 0.2) / 0.35), ORANGE);
      });
      keys.forEach((k, i) => {
        const ks = k + "s", s0 = NOW, a = s0 + 0.4, y0 = a + D(ks) + 0.5, total = Math.max(3, Math.ceil(D(ks) + 0.5));
        sayLine(ks, a, { top: 470, size: 84, maxw: 1700, hold: 0.3 });
        for (let j = 0; j < total; j++) sfx("sfx/tick.wav", y0 + j, -10);
        const parts = L(k).text.split(" ");
        seg(y0 - s0 + total + 0.4, lt => {
          const gt = s0 + lt; cover(bgOf(i), 0.5, "blur(10px) brightness(0.5)");
          txt(`${i + 1} / 5`, 1780, 80, 40, "#ffd9b8", { stroke: false });
          if (gt < y0) { ear(960, 300, 1.2, clamp(lt / 0.3)); txt("Listen", 960, 400, 48, "#fff", { alpha: clamp(lt / 0.3) }); }
          else {
            const k2 = clamp((gt - y0) / 0.3); mic(960, 260, 1.1, k2); bigText("Your turn!", 960, 390, 80, k2, ORANGE);
            sentence(parts, 960, 560, parts.length > 7 ? 70 : 84, { alpha: k2 }); ring(960, 800, 80, total, gt - y0);
          }
        });
      });
    }
    // ---- 填空 ----
    {
      const q = o.quiz, q0 = NOW, a = q0 + 0.4; F.audio.push(["audio/s01/s01_q.mp3", a, 0]);
      const c0 = a + D("s01_q") + 0.6, c1 = c0 + 3, fly = c1 + 0.6, ka = fly + 0.4, qa = `${n}_qa`; F.audio.push([`audio/${n}/${qa}.mp3`, ka, 0]);
      const pw = posIdx(qa, 0);
      [0, 1, 2].forEach(i => sfx("sfx/beep.wav", c0 + i, -6)); sfx("sfx/whoosh.wav", c1, -8); sfx("sfx/ding.wav", fly, -4); sfx("sfx/tag.wav", ka + W(qa, pw), -6);
      const OX = [760, 1060, 1360];
      seg(ka - q0 + D(qa) + 1.6, lt => {
        const gt = q0 + lt; cover(q.bg, 0.5, "blur(5px) brightness(0.6)");
        bigText("Which word?", 960, 110, 96, clamp((gt - a) / 0.35), ORANGE);
        q.chars.forEach(([img, x, h]) => char(img, x, 1010, h, { bob: gt > ka && gt < ka + D(qa) && img === (q.speaker || "ken") ? Math.abs(Math.sin(lt * 9)) * 5 : 0 }));
        iconImg(q.obj, 1060, 330 + Math.sin(lt * 3) * 12, q.objH || 220, clamp(lt / 0.4), q.spin ? lt * 0.6 : -0.04);
        const bl = sentence(q.parts, 1080, 590, 84, { fill: gt > fly ? 1 : 0 });
        const fill = clamp((gt - c1) / 0.6);
        q.opts.forEach((w, i) => {
          const x = OX[i], k = clamp((gt - a - i * 0.15) / 0.35);
          if (w === q.answer && gt > c1) { if (gt < fly) { const e = ease(fill); bubble(w, lerp(x, bl.x, e), lerp(820, bl.y, e), 70, 1, 1); } }
          else bubble(w, x, 820, 70, k, gt > c1 ? -1 : 0);
        });
        if (gt > c0 && gt < c1) ring(1650, 330, 80, 3, gt - c0);
        if (gt > fly) bigText("✔", 1650, 330, 140, clamp((gt - fly) / 0.3), "#7be07b");
        const kd = clamp((gt - ka - W(qa, pw)) / 0.5);
        q.owners.forEach(([x, y], j) => dashLine(x, y, 990, 360 + j * 20, kd));
        tag(1060, 190, q.answer, clamp((gt - ka - W(qa, pw) - 0.3) / 0.35), 58);
      });
    }
  }
