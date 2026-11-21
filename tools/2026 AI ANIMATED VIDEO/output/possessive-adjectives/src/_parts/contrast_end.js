  // ======================= his / her、our / their 快速判斷（約 1 分鐘） =======================
  {
    const t0 = NOW; say("c00_hi", t0 + 0.4, { nocap: true }); sfx("sfx/whoosh.wav", t0, -8);
    const w = i => t0 + 0.4 + W("c00_hi", i);
    seg(D("c00_hi") + 1.0, lt => {
      const gt = t0 + lt; nightBg(lt + 300, 11);
      const k1 = clamp((gt - w(0)) / 0.35), k2 = clamp((gt - w(3)) / 0.35);
      txt("his", 620, 330, 150, RED, { sc: 0.4 + 0.6 * back(k1), alpha: clamp(k1 * 3) }); bigText("or", 960, 330, 80, k1); txt("her", 1300, 330, 150, RED, { sc: 0.4 + 0.6 * back(k1), alpha: clamp(k1 * 3) });
      txt("our", 620, 640, 150, RED, { sc: 0.4 + 0.6 * back(k2), alpha: clamp(k2 * 3) }); bigText("or", 960, 640, 80, k2); txt("their", 1300, 640, 150, RED, { sc: 0.4 + 0.6 * back(k2), alpha: clamp(k2 * 3) });
      bigText("QUICK CHECK!", 960, 880, 100, clamp((gt - w(6)) / 0.35), ORANGE);
    });
    const R = [
      { who: [["dad", 0, 820]], s: "he", obj: "guitar", objH: 320, noun: "guitar.", opts: ["his", "her"], ans: "his", bg: "living" },
      { who: [["shuiling", 0, 640]], s: "she", obj: "cat", objH: 240, noun: "cat.", opts: ["his", "her"], ans: "her", bg: "sroom" },
      { who: [["mom", 0, 820]], s: "she", obj: null, noun: "bag.", opts: ["her", "his"], ans: "her", bg: "entrance" },
      { who: [["ken", -130, 640], ["shuiling", 130, 610]], s: "we", obj: "classroom", objH: 230, noun: "classroom.", opts: ["their", "our"], ans: "our", bg: "classroom" },
      { who: [["grandpa", -130, 760], ["grandma", 130, 720]], s: "they", obj: "dog", objH: 250, noun: "dog.", opts: ["our", "their"], ans: "their", bg: "gphouse" },
      { who: [["grandpa", 0, 780]], s: "he", obj: "hat", objH: 180, noun: "hat.", opts: ["her", "his"], ans: "his", bg: "gphouse" },
    ];
    R.forEach((r, i) => {
      const s0 = NOW, c0 = s0 + 1.2, c1 = c0 + 2, fly = c1 + 0.5, ak = `c0${i + 1}_a`, aa = fly + 0.3;
      F.audio.push([`audio/c0${i + 1}/${ak}.mp3`, aa, 0]);
      [0, 1].forEach(j => sfx("sfx/beep.wav", c0 + j, -8)); sfx("sfx/ding.wav", fly, -4); sfx("sfx/pop.wav", s0 + 0.1, -10);
      seg(aa - s0 + D(ak) + 0.9, lt => {
        const gt = s0 + lt; cover(r.bg, 0.5, "blur(6px) brightness(0.5)");
        txt(`${i + 1} / 6`, 1780, 80, 40, "#ffd9b8", { stroke: false });
        r.who.forEach(([img, dx, h]) => char(img, 420 + dx, 1000, h));
        bigText(r.s, 420, 1000 - Math.max(...r.who.map(x => x[2])) - 60, 110, clamp(lt / 0.35), BLUE);
        if (r.obj) iconImg(r.obj, 1250, 380 + Math.sin(lt * 2.6) * 10, r.objH, clamp((lt - 0.15) / 0.35), -0.04);
        else { X.save(); X.strokeStyle = ORANGE; X.lineWidth = 10; X.setLineDash([24, 16]); X.lineDashOffset = -T * 50; X.beginPath(); X.arc(330, 470, 110, 0, Math.PI * 2); X.stroke(); X.restore(); }   // 媽媽的包包
        const bl = sentence(["This", "is", { blank: r.ans }, r.noun], 1180, 690, 84, { fill: gt > fly ? 1 : 0 });
        r.opts.forEach((w, j) => {
          const x = 1000 + j * 360, k = clamp((lt - 0.3 - j * 0.12) / 0.35);
          if (w === r.ans && gt > c1) { if (gt < fly) { const e = ease(clamp((gt - c1) / 0.5)); bubble(w, lerp(x, bl.x, e), lerp(890, bl.y, e), 70, 1, 1); } }
          else bubble(w, x, 890, 70, k, gt > c1 ? -1 : 0);
        });
        if (gt > c0 && gt < c1) ring(1700, 380, 72, 2, gt - c0);
        if (gt > fly) bigText("✔", 1700, 380, 130, clamp((gt - fly) / 0.3), "#7be07b");
      });
    });
  }

  // ======================= 結尾：回到課本兩個答句 =======================
  {
    const t0 = NOW, q1 = t0 + 0.5, a1 = q1 + D("e00_q1") + 0.4;
    say("e00_q1", q1, { who: "Mom", x: 1150 }); say("e00_a1", a1, { who: "Ken", x: 1150 });
    seg(a1 - t0 + D("e00_a1") + 1.0, lt => {
      const gt = t0 + lt; camAt(lt, 0, 6, 1.0, 1.06);
      withCam(() => { cover("entrance", 0.5); char("mom", 470, 1010, 780, { bob: gt > q1 && gt < q1 + D("e00_q1") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 });
        char("ken", 1240, 1010, 650, { bob: gt > a1 && gt < a1 + D("e00_a1") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 }); });
      const k = clamp((gt - a1 - W("e00_a1", 1)) / 0.4); if (k > 0) { panel(1420, 240, 420, 240, k, "rgba(20,12,48,0.8)", ORANGE, 30); X.save(); X.globalAlpha = clamp(k * 3); X.beginPath(); X.roundRect(1440, 260, 380, 200, 20); X.clip(); const im = img("f3d_s02_still"); if (im && im.width) X.drawImage(im, 1440, 260, 380, 214); X.restore(); }
    });
    const u0 = NOW, q2 = u0 + 0.5, a2 = q2 + D("e00_q2") + 0.4;
    say("e00_q2", q2, { who: "Dad", x: 960 }); say("e00_a2", a2, { who: "Ken", x: 960 });
    seg(a2 - u0 + D("e00_a2") + 1.0, lt => {
      const gt = u0 + lt; camAt(lt, 0, 6, 1.0, 1.06);
      withCam(() => { cover("sroom", 0.5); iconImg("tv", 1560, 450, 260);
        X.save(); X.globalCompositeOperation = "screen"; const g = X.createRadialGradient(1560, 440, 20, 1560, 440, 500); g.addColorStop(0, `rgba(120,200,255,${0.35 + 0.15 * Math.sin(lt * 7)})`); g.addColorStop(1, "rgba(0,0,0,0)"); X.fillStyle = g; X.fillRect(1000, 0, 920, 1080); X.restore();
        char("dad", 330, 1010, 820, { bob: gt > q2 && gt < q2 + D("e00_q2") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 });
        char("ken", 760, 1010, 640, { bob: gt > a2 && gt < a2 + D("e00_a2") ? Math.abs(Math.sin(lt * 9)) * 6 : 0 });
        char("shuiling", 1300, 1010, 610); });
      const k = clamp((gt - a2 - W("e00_a2", 0)) / 0.35); if (k > 0) bigText("She", 1300, 320, 100, k, BLUE);
    });
    // 課本兩句卡片＋完整對照表＋Great job!
    const v0 = NOW, e = v0 + 4.5; say("e00_end", e, { x: 1420, maxw: 820 }); sfx("sfx/ding.wav", v0 + 0.5, -8);
    seg(4.5 + D("e00_end") + 4.0, lt => {
      nightBg(lt + 400, 13);
      if (lt < 4.5) {
        const box = (y, q, a, k, hiQ, hiA) => {
          panel(260, y, 1400, 300, k, "rgba(255,250,240,0.97)", "#8a7bd8", 34); if (k <= 0) return;
          X.save(); X.globalAlpha = clamp(k * 3); X.fillStyle = "#e6e0f7"; X.beginPath(); X.roundRect(264, y + 150, 1392, 146, [0, 0, 30, 30]); X.fill(); X.restore();
          sentence(q, 960, y + 75, 66, { alpha: clamp(k * 3) }); sentence(a, 960, y + 222, 66, { alpha: clamp(k * 3) });
        };
        box(110, ["What", "do", "you", "do", "in", "your", "free", "time?"], ["I", "go", "jogging", "in", "my", "free", "time."], clamp((lt - 0.2) / 0.4));
        box(560, ["What", "does", "she", "do", "in", "her", "free", "time?"], ["She", "watches", "TV", "in", "her", "free", "time."], clamp((lt - 1.2) / 0.4));
      } else {
        const at = lt - 4.5; chart(lt, 6); iconImg("book", 1420, 420, 260, 1, -0.05);
        bigText("GREAT JOB!", 1420, 700, 110, clamp((at - D("e00_end") + 0.5) / 0.4), ORANGE);
      }
    });
  }
