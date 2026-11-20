"""Browser QA: serves the project folder on a free loopback port chosen by the OS, plays the Web export with
Playwright (Chromium) using real mouse / keyboard / touch input, saves screenshots, checks console errors,
pointer/keyboard movement, the Finish button and the iframe postMessage contract.  The server stops when
the script ends.  Do not run it while headless Godot tests are running (a busy PC makes the waits time out).

Usage: python tools/qa_web.py [country] [out_dir] [project_root]
  country       japan (default) | egypt | india ...
  out_dir       default qa/<country>/  (overview.jpg + qa_web_report.json are written there)
  project_root  folder that holds web/ and qa/embed_test.html (default: this project; use the C: test copy for speed)
"""
import functools, http.server, json, os, shutil, sys, tempfile, threading, time
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COUNTRY = sys.argv[1] if len(sys.argv) > 1 else "japan"
QA = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, "qa", COUNTRY)
ROOT = sys.argv[3] if len(sys.argv) > 3 else HERE
os.makedirs(QA, exist_ok=True)
TMP = tempfile.mkdtemp(prefix="bento_qa_")
SHOTS = []


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a, **k):
        pass


def serve():
    # port 0 = the OS picks a free port (other agents run browser tests at the same time)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, srv.server_address[1]


def st(page):
    return page.evaluate("window.__bento || null")


def wait_state(page, names, timeout=60):
    t0 = time.time()
    while time.time() - t0 < timeout:
        s = st(page)
        if s and s["state"] in names:
            return s
        time.sleep(0.1)
    raise TimeoutError("state %s not reached, last=%s" % (names, st(page)))


def shot(page, name):
    # write to a local temp folder first (the project may sit on a slow cloud drive); copied to QA at the end
    page.screenshot(path=os.path.join(TMP, name))
    SHOTS.append(name)


def overview():
    from PIL import Image, ImageDraw
    files = [f for f in SHOTS if os.path.exists(os.path.join(QA, f))]
    tw, th, cols = 480, 270, 4
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * tw, rows * (th + 22)), (255, 255, 255))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(os.path.join(QA, f)).convert("RGB")
        im.thumbnail((tw, th))
        x, y = (i % cols) * tw, (i // cols) * (th + 22)
        sheet.paste(im, (x + (tw - im.width) // 2, y))
        d.text((x + 6, y + th + 4), f, fill=(0, 0, 0))
    sheet.save(os.path.join(QA, "overview.jpg"), quality=82)


def main():
    srv, port = serve()
    base = "http://127.0.0.1:%d" % port
    logs, errors, report = [], [], {"country": COUNTRY}
    try:
        with sync_playwright() as p:
            br = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])

            # ---------- pass 1: full real-speed run, 1280x720, mouse + keyboard
            page = br.new_page(viewport={"width": 1280, "height": 720})
            page.on("console", lambda m: logs.append("[%s] %s" % (m.type, m.text)))
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.goto(base + "/web/index.html?country=%s&qa=1" % COUNTRY)
            s = wait_state(page, ["TITLE"], 120)
            report["loaded_country"] = s["country"]
            assert s["country"] == COUNTRY, ("wrong country loaded", s["country"])
            time.sleep(1.0)
            shot(page, "01_title.png")
            sx = 1280 / s["w"]
            page.mouse.click(640, 400)
            wait_state(page, ["READY", "PLAY"], 10)
            time.sleep(0.5)
            shot(page, "01b_ready.png")
            wait_state(page, ["PLAY"], 10)
            page.mouse.move(640, 600)
            page.mouse.down()
            page.mouse.move(250, 600, steps=8)
            time.sleep(0.7)
            xl = st(page)["playerX"]
            page.mouse.move(1000, 600, steps=8)
            time.sleep(0.7)
            xr = st(page)["playerX"]
            page.mouse.up()
            report["drag_left_x"], report["drag_right_x"] = xl, xr
            assert abs(xl - 250 / sx) < 30 and abs(xr - 1000 / sx) < 30, ("drag failed", xl, xr)
            page.keyboard.down("ArrowLeft")
            time.sleep(0.5)
            page.keyboard.up("ArrowLeft")
            time.sleep(0.3)
            xa = st(page)["playerX"]
            time.sleep(0.6)
            xb = st(page)["playerX"]
            report["key_left_moved"], report["key_released_drift"] = xr - xa, abs(xb - xa)
            assert xr - xa > 150 and abs(xb - xa) < 2, ("keyboard failed", xr, xa, xb)
            page.keyboard.down("KeyD")
            time.sleep(0.4)
            page.keyboard.up("KeyD")
            time.sleep(0.3)
            report["key_d_moved"] = st(page)["playerX"] - xb
            assert report["key_d_moved"] > 120, "KeyD failed"

            shot_play = False
            shot_round = -1
            seen_result = -1
            sweep = 0
            page.mouse.move(640, 600)
            page.mouse.down()
            t0 = time.time()
            while time.time() - t0 < 220:
                s = st(page)
                if s["state"] == "END":
                    break
                if s["state"] == "CLOCK":
                    idx = s["clockIdx"]
                    if "okLaneX" in s:
                        # go to the answer lane first (a slow screenshot must not make the answer late)
                        tx = s["okLaneX"] * sx
                        if idx == 2:        # answer round 3 wrongly on purpose
                            tx = (tx + 1280 / 3) % 1280
                        page.mouse.move(tx, 600, steps=3)
                        if shot_round < idx:
                            shot_round = idx
                            time.sleep(2.8)
                            shot(page, "03_clock_round_%d.png" % (idx + 1))
                            if idx == 0:    # tap the replay-sound button once
                                rp = st(page)["replay"]
                                page.mouse.up()
                                page.mouse.click(rp[0] * sx, rp[1] * sx)
                                page.mouse.move(tx, 600)
                                page.mouse.down()
                        page.mouse.move(tx, 600, steps=3)
                        res = (s["clocksCorrect"], s["hearts"])
                        if report.get("pre%d" % idx) is None:
                            report["pre%d" % idx] = res
                        elif tuple(report["pre%d" % idx]) != res and seen_result < idx:
                            seen_result = idx
                            time.sleep(0.5)
                            shot(page, "03b_clock_result_%d.png" % (idx + 1))
                elif s["state"] == "PLAY":
                    if "finish" in s:       # all clock rounds answered: press the Finish button
                        time.sleep(0.6)
                        shot(page, "09_finish_button.png")
                        f = st(page).get("finish", s["finish"])
                        page.mouse.up()
                        page.mouse.click(f[0] * sx, f[1] * sx)
                        report["finish_clicked_at_playT"] = s["playT"]
                        wait_state(page, ["END"], 8)
                        break
                    if s.get("fever") and not report.get("fever_shot"):
                        time.sleep(1.0)
                        shot(page, "03c_fever.png")
                        report["fever_shot"] = True
                    # follow the lowest good item, keep away from bad items about to land (qa-only fields)
                    sweep += 1
                    hw = s.get("catchHW", 90) + 30
                    bads = s.get("badX", [])
                    safe = lambda x: all(abs(x - b) > hw for b in bads)
                    cur = s["playerX"]
                    tgt = s.get("goodX", cur)
                    if not safe(tgt):
                        tgt = cur
                    if not safe(tgt):
                        cands = [x for x in range(80, int(s["w"]) - 80, 40) if safe(x)]
                        tgt = min(cands, key=lambda x: abs(x - cur)) if cands else cur
                    page.mouse.move(tgt * sx, 600, steps=2)
                    if not shot_play and s["playT"] > 6:
                        shot(page, "02_play.png")
                        shot_play = True
                time.sleep(0.06)
            page.mouse.up()
            s = wait_state(page, ["END"], 30)
            time.sleep(2.5)
            shot(page, "04_end.png")
            s = st(page)
            report["run1"] = {k: s[k] for k in ("score", "stars", "clocksCorrect", "hearts", "playT")}
            report["run1"]["rounds"] = s.get("rounds")
            r = s["againRect"]
            page.mouse.click((r[0] + r[2] / 2) * sx, (r[1] + r[3] / 2) * sx)
            wait_state(page, ["READY", "PLAY"], 10)
            report["play_again"] = True
            page.close()

            # ---------- pass 2: inside an iframe, touch, fast; postMessage contract
            ctx = br.new_context(viewport={"width": 1024, "height": 768}, has_touch=True, device_scale_factor=2)
            page = ctx.new_page()
            page.on("console", lambda m: logs.append("[embed %s] %s" % (m.type, m.text)))
            page.on("pageerror", lambda e: errors.append("embed: " + str(e)))
            page.goto(base + "/qa/embed_test.html?country=" + COUNTRY)
            fr = None
            t0 = time.time()
            while time.time() - t0 < 120:
                fr = page.frames[-1] if len(page.frames) > 1 else None
                if fr and fr.evaluate("window.__bento ? window.__bento.state : ''") == "TITLE":
                    break
                time.sleep(0.2)
            time.sleep(0.5)
            box = page.locator("#g").bounding_box()
            page.touchscreen.tap(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)
            time.sleep(1.2)
            report["embed_touch_started"] = fr.evaluate("window.__bento.state") in ("READY", "PLAY", "CLOCK")
            shot(page, "05_embed_iframe_touch.png")
            t0 = time.time()
            while time.time() - t0 < 150 and fr.evaluate("window.__bento.state") != "END":
                time.sleep(0.3)
            time.sleep(0.8)
            report["embed_messages"] = page.evaluate("window.__msgs")
            ctx.close()

            # ---------- pass 3: standalone 4:3 touch viewport (iPad-like layout)
            ctx = br.new_context(viewport={"width": 1024, "height": 768}, has_touch=True, device_scale_factor=2)
            page = ctx.new_page()
            page.on("pageerror", lambda e: errors.append("4:3: " + str(e)))
            page.goto(base + "/web/index.html?country=%s&qa=1" % COUNTRY)
            s = wait_state(page, ["TITLE"], 120)
            time.sleep(0.8)
            shot(page, "06_ipad43_title.png")
            page.touchscreen.tap(512, 400)
            wait_state(page, ["PLAY"], 10)
            time.sleep(6)
            shot(page, "07_ipad43_play.png")
            s = wait_state(page, ["CLOCK"], 40)
            time.sleep(3.0)
            shot(page, "08_ipad43_clock.png")
            report["ipad43_logical"] = [s["w"], s["h"]]
            ctx.close()
            br.close()
    finally:
        srv.shutdown()
        srv.server_close()
        for f in SHOTS:
            if os.path.exists(os.path.join(TMP, f)):
                shutil.copy(os.path.join(TMP, f), os.path.join(QA, f))
    report["console_errors"] = [l for l in logs if "error" in l.split("]")[0].lower() or "ERROR" in l]
    report["console_warnings"] = [l for l in logs if "warning" in l.split("]")[0].lower()][:10]
    report["page_errors"] = errors
    report["console_lines"] = len(logs)
    json.dump(report, open(os.path.join(QA, "qa_web_report.json"), "w"), indent=1)
    overview()
    print(json.dumps(report, indent=1))
    print("\n".join(logs[:20]))


if __name__ == "__main__":
    main()
