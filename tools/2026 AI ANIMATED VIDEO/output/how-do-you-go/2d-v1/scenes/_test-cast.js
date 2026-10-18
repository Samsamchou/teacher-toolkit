// 測試頁：六位正面角色各做一個舞步＋六國國旗（不進成片）/ cast test sheet, not part of the film
const SCENE = {
  dur: 2, songStart: 40, tag: 'cast test',
  draw(c, t) {
    c.fillStyle = '#eaf6ff'; c.fillRect(0, 0, W, H);
    const moves = ['clap', 'pump', 'ear', 'shrug', 'cheer', 'hips'];
    ORDER.forEach((k, i) => {
      const b = { i: 3, f: +(new URLSearchParams(location.search).get('f') || .05) };
      const p = Object.assign({ x: 200 + i * 300, y: 900, scale: .85, talk: .5 }, danceMove(moves[i], b, t));
      kidFront(c, CAST[k], p, t);
      c.save(); c.translate(140 + i * 300, 120); drawFlag(c, k, 120); c.restore();
      c.font = '700 30px Inter'; c.fillStyle = INK; c.fillText(moves[i], 160 + i * 300, 1000);
    });
    kidFront(c, CAST.MOM, { x: 1800, y: 600, scale: .5 }, t);
  },
};
