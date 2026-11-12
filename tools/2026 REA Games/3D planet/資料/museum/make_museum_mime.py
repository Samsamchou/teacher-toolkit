"""二水鐵道博物館（虛構）Listen and Guess 默劇影片（RDQ-spec-ershui-planet-railway-museum-20261112）。
同一套：listen-3clues/video/make_mime_test.py（首幀 stage_ken.png、KIE Seedance 2.0 Mini、480p 8 秒、不生成聲音、帳本 ledger.json）。
動作（老師確認）：買票 → 安靜看展品、指著看 → 拍照（喀嚓聲交給音效）。手一直是空的、列出不准出現的東西（11/12 圖書館教訓）。
預算：博物館 KIE 全部約 65 點；重拍最多再 40 點 → 本支（含重拍）上限 MUSEUM_VIDEO_CAP。
  python -I make_museum_mime.py           # 生成一次（或重拍一次）
輸出：listen-3clues/museum_mime.mp4（無音軌）＋外框 clues/video/museum.mp4（之後加音效會蓋掉）＋ listen-3clues/frames/museum_frames.jpg
"""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(HERE), "listen-3clues", "video"))
import make_mime_test as m
import mime_batch as mb

MUSEUM_VIDEO_CAP = 30.4 * 3 + 0.1   # 第一次＋最多 2 次重拍（重拍合計 ≤ 40 點的規定另外在 進度檔 記帳）
m.EXTRA["museum"] = ("IMPORTANT: this is pure pantomime with empty hands. His hands are always visibly empty, open or in loose fists, and no object of any kind "
                     "(no ticket, no money, no coin, no card, no camera, no phone, no paper, no map, no train, no model, no picture frame, no sign, no rope, no item) "
                     "ever appears in his hands, on the floor, on the walls or anywhere in the scene. The classroom and chalkboard stay exactly the same.")
m.SHOTS["museum"] = (
    "he walks two steps forward, stops, holds up one finger toward someone at his side, pats his back pocket, stretches one flat empty hand forward palm up, "
    "then pulls it back and gives a small polite bow, smiling",
    "he walks very slowly and quietly with both hands clasped behind his back, leaning forward a little, looking up high with wide amazed eyes and an open mouth, "
    "then unclasps one hand and points up and to the side at something very big, nodding with his eyebrows raised",
    "he raises both empty hands in front of his face, thumbs and index fingers touching to form a small empty rectangle in front of one eye, closes the other eye, "
    "presses down once with one index finger, then lowers his hands and gives a big thumbs up",
)

if __name__ == "__main__":
    spent = sum(r.get("credits") or 0 for r in m.ledger() if r.get("shot") == "museum")
    if spent + 8 * m.RATE["480p"] > MUSEUM_VIDEO_CAP:
        sys.exit(f"博物館影片已花 {spent} 點，再拍會超過上限 {MUSEUM_VIDEO_CAP}：停下來回報。")
    rec = mb.run("museum")
    print("DONE", rec.get("state"), rec.get("credits"), rec.get("fail"), flush=True)
