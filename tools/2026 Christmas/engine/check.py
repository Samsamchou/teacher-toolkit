"""check.py — 每一幕自動檢查：人物穿過物件、鏡頭鑽進物件、臉被擋住、手和道具沒碰到。
Automatic per-scene checks: actors passing through objects, the camera inside an object,
faces hidden behind something, and hand/prop contacts that do not touch.
  python -X utf8 check.py s01 s02 … [--step 0.125] [--out ../renders/check-report.md]
場景可提供 contacts(t) → [[名稱, 物件A, 物件B, 容許間隙]]；人物 root 要有 userData.actor。
A scene may export contacts(t) -> [[label, objA, objB, tolerance]]; actor roots carry userData.actor.
"""
import argparse, json, sys, pathlib, threading, functools, http.server, socketserver
from playwright.sync_api import sync_playwright

ap = argparse.ArgumentParser()
ap.add_argument('scenes', nargs='+'); ap.add_argument('--step', type=float, default=0.125)
ap.add_argument('--out', default=None)
a = ap.parse_args()
here = pathlib.Path(__file__).resolve().parent; root = here.parent
out = pathlib.Path(a.out) if a.out else root / 'renders' / 'check-report.md'

JS = r"""
async (step) => {
  const T = window.THREE, S = window.STAGE, sc = window.SC, scene = S.scene, cam = S.camera;
  const tl = await (await fetch(`../timeline/${new URLSearchParams(location.search).get('scene')}.json`)).json();
  const clips = (tl.clips || []).map(c => [c.t, c.t + c.dur]);
  const inClip = (t) => clips.some(([a, b]) => t >= a && t < b);
  const actorOf = (o) => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.actor) return p; return null; };
  const label = (o) => { for (let p = o; p; p = p.parent) if (p.name) return p.name; return (o.isInstancedMesh ? 'blocks' : 'mesh'); };
  const SKIP = /snowpath|footprint|deepslab|cap|terrain|sky|aurora|moon/i;
  const all = []; scene.traverse(o => { if ((o.isMesh || o.isInstancedMesh) && !o.isPoints && !o.isSprite) all.push(o); });
  const actors = []; scene.traverse(o => { if (o.userData && o.userData.actor) actors.push(o); });
  // 先抽 6 個時間點，沒動過的才算固定物件 / an object is static if its world matrix never changes
  const snap = (m) => m.matrixWorld.elements.map(v => v.toFixed(3)).join(',');
  const cand = all.filter(m => !actorOf(m));
  const first = new Map();
  const moved = new Set();
  for (let i = 0; i <= 6; i++) { await window.renderFrame(sc.dur * i / 6 + 0.01); for (const m of cand) { const s = snap(m); let vis = true; for (let q = m; q; q = q.parent) if (q.visible === false) vis = false; if (!vis) moved.add(m); /* 會出現／消失的道具不算固定物件 / props that appear or vanish are not static */ if (!first.has(m)) first.set(m, s); else if (first.get(m) !== s) moved.add(m); } }
  const statics = cand.filter(m => !moved.has(m) && !SKIP.test(label(m)) && !(m.material && (m.material.visible === false || (m.material.transparent && m.material.opacity < 0.8))));
  const box = new T.Box3(), mtx = new T.Matrix4();
  const sBoxes = [];
  for (const m of statics) {
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
    if (m.isInstancedMesh) for (let i = 0; i < m.count; i++) { m.getMatrixAt(i, mtx); mtx.premultiply(m.matrixWorld); const b = m.geometry.boundingBox.clone().applyMatrix4(mtx); const c = b.getCenter(new T.Vector3()); if (b.max.y > 0.06) sBoxes.push({ b, name: label(m) + (m.name ? '' : `@${c.x.toFixed(1)},${c.y.toFixed(1)},${c.z.toFixed(1)}`), m }); }
    else { const b = new T.Box3().setFromObject(m); const sz = b.getSize(new T.Vector3()); if (b.max.y > 0.06 && Math.max(sz.x, sz.z) < 8) sBoxes.push({ b, name: label(m), m }); }
  }
  const shown = (o) => { for (let p = o; p; p = p.parent) if (p.visible === false) return false; return true; };
  const overlapDepth = (p, q) => Math.min(p.max.x - q.min.x, q.max.x - p.min.x, p.max.y - q.min.y, q.max.y - p.min.y, p.max.z - q.min.z, q.max.z - p.min.z);
  const gap = (p, q) => { const dx = Math.max(0, q.min.x - p.max.x, p.min.x - q.max.x), dy = Math.max(0, q.min.y - p.max.y, p.min.y - q.max.y), dz = Math.max(0, q.min.z - p.max.z, p.min.z - q.max.z); return Math.hypot(dx, dy, dz); };
  const rc = new T.Raycaster(); const rayTargets = statics.slice();
  const actorMeshes = all.filter(m => actorOf(m));
  const hits = [];
  for (let t = 0; t < sc.dur; t += step) {
    await window.renderFrame(t); scene.updateMatrixWorld(true);
    const clip = inClip(t);
    // 1. 人物穿過固定物件 / actors through static objects
    for (const ac of actors) {
      if (!ac.visible) continue;
      const parts = []; ac.traverse(o => { if (o.isMesh && o.visible) { const b = new T.Box3().setFromObject(o); const c = b.getCenter(new T.Vector3()), s = b.getSize(new T.Vector3()).multiplyScalar(0.42); parts.push(new T.Box3(c.clone().sub(s), c.clone().add(s))); } });
      const whole = new T.Box3().setFromObject(ac);
      for (const sb of sBoxes) { if (!whole.intersectsBox(sb.b) || !shown(sb.m)) continue; let d = 0; for (const p of parts) if (p.intersectsBox(sb.b)) d = Math.max(d, overlapDepth(p, sb.b)); if (d > 0.06) hits.push({ t, kind: 'through', who: ac.userData.actor, what: sb.name, v: +d.toFixed(2), clip }); }
    }
    // 2. 鏡頭在物件裡 / camera inside an object
    const cp = cam.position;
    for (const sb of sBoxes) if (shown(sb.m) && sb.b.clone().expandByScalar(0.05).containsPoint(cp)) hits.push({ t, kind: 'camera-inside', who: 'camera', what: sb.name, v: 0, clip });
    for (const ac of actors) { let inside = false; ac.traverse(o => { if (o.isMesh && o.visible && new T.Box3().setFromObject(o).containsPoint(cp)) inside = true; }); if (inside) hits.push({ t, kind: 'camera-inside', who: 'camera', what: ac.userData.actor, v: 0, clip }); }
    // 3. 臉被擋住（只算在畫面裡的臉）/ faces hidden (only faces on screen)
    const faces = sc.faces ? sc.faces() : [];
    for (const f of faces) {
      const pr = f.clone().project(cam); if (pr.z > 1 || Math.abs(pr.x) > 0.95 || Math.abs(pr.y) > 0.95) continue;
      const owner = actors.map(ac => [ac, new T.Box3().setFromObject(ac).distanceToPoint(f)]).sort((p, q) => p[1] - q[1])[0];
      const dir = f.clone().sub(cp); const dist = dir.length(); rc.set(cp, dir.normalize()); rc.far = dist - 0.3;
      const h = rc.intersectObjects(rayTargets.concat(actorMeshes.filter(m => m.visible && actorOf(m) !== (owner && owner[0]))), false).filter(x => shown(x.object) && !(x.object.material && x.object.material.visible === false))[0];
      if (h) hits.push({ t, kind: 'face-hidden', who: owner ? owner[0].userData.actor : '?', what: actorOf(h.object) ? actorOf(h.object).userData.actor : label(h.object), v: +h.distance.toFixed(2), clip });
    }
    // 4. 接觸 / contacts
    if (sc.contacts) for (const [name, A, B, tol] of sc.contacts(t)) { if (!A || !B) continue; const g = gap(new T.Box3().setFromObject(A), new T.Box3().setFromObject(B)); if (g > (tol ?? 0.02)) hits.push({ t, kind: 'no-contact', who: name, what: '', v: +g.toFixed(3), clip }); else hits.push({ t, kind: 'contact-ok', who: name, what: '', v: +g.toFixed(3), clip }); }
  }
  return { dur: sc.dur, statics: sBoxes.length, actors: actors.map(a => a.userData.actor), hits };
}
"""

class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *x): pass
srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(root))); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()

KIND = {'through': '人物穿過物件', 'camera-inside': '鏡頭在物件裡', 'face-hidden': '臉被擋住', 'no-contact': '沒碰到', 'contact-ok': '有碰到'}
def spans(rows, step):
    """把連續的時間點併成區間 / merge consecutive samples into spans"""
    out = []
    for r in sorted(rows, key=lambda r: r['t']):
        if out and r['t'] - out[-1]['t1'] <= step * 1.5: out[-1]['t1'] = r['t']; out[-1]['v'] = max(out[-1]['v'], r['v']); out[-1]['clip'] |= r['clip']
        else: out.append({'t0': r['t'], 't1': r['t'], 'v': r['v'], 'clip': r['clip']})
    return out

lines = ['# 自動檢查報告 / automatic check report', '', f'每 {a.step} 秒抽一格。「Seedance」＝這段會換成 Seedance 影片（本機畫面只是佔位或首幀）。', '']
summary = []
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-angle=d3d11', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for name in a.scenes:
        pg = b.new_page(viewport={'width': 1920, 'height': 1080}); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'http://127.0.0.1:{port}/engine/film.html?scene={name}&clean=1')
        for _ in range(240):
            if errs or pg.evaluate('window.READY===true'): break
            pg.wait_for_timeout(500)
        if errs: print(name, 'FAILED', errs[:2]); lines += [f'## {name}', '', f'載入失敗：{errs[0][:200]}', '']; pg.close(); continue
        pg.add_script_tag(type='module', content="import * as T from 'three'; window.THREE = T;")
        pg.wait_for_function('window.THREE !== undefined')
        r = pg.evaluate(JS, a.step)
        pg.close()
        groups = {}
        for h in r['hits']: groups.setdefault((h['kind'], h['who'], h['what']), []).append(h)
        lines += [f'## {name}（{r["dur"]} 秒；人物：{"、".join(r["actors"])}；固定物件方塊 {r["statics"]} 個）', '']
        bad = 0
        for kind in ['through', 'camera-inside', 'face-hidden', 'no-contact', 'contact-ok']:
            ks = [(k, v) for k, v in groups.items() if k[0] == kind]
            if not ks: continue
            lines.append(f'**{KIND[kind]}**')
            for (kd, who, what), rows in sorted(ks):
                for s in spans(rows, a.step):
                    unit = '公分' if kind in ('no-contact', 'contact-ok') else ''
                    val = f'間隙 {s["v"] * 100:.0f} 公分' if unit else (f'深 {s["v"]:.2f} 格' if kind == 'through' else (f'距鏡頭 {s["v"]:.1f} 格' if kind == 'face-hidden' else ''))
                    lines.append(f'- {s["t0"]:.2f}–{s["t1"] + a.step:.2f} 秒：{who}' + (f' ← {what}' if what else '') + f'（{val}）' + ('〔Seedance〕' if s['clip'] else ''))
                    if kind != 'contact-ok': bad += 1
            lines.append('')
        if bad == 0: lines += ['沒有發現問題。', '']
        summary.append((name, bad)); print(name, 'issues:', bad, flush=True)
    b.close()
srv.shutdown()
lines[3:3] = ['| 幕 | 問題區段數 |', '|---|---|'] + [f'| {n} | {k} |' for n, k in summary] + ['']
out.write_text('\n'.join(lines), encoding='utf-8'); print(out)
