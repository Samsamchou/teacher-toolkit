"""v4（老師 2026-11-10 選 A＋棒球）：重做 baseball、camping、recorder 三段。
- camping：v3 拉繩子時 AI 變出繩子 → 拿掉拉的動作，改成雙手在頭上搭成三角形「帳篷」。
- recorder：v3 雙手在肩膀兩側像嚇一跳 → 雙手上下疊在嘴巴正前方、手肘往下，手指輪流按。
- baseball：揮棒不像（像出拳）→ 加明顯的握棒預備＋水平大揮棒＋往旁邊跑壘、張開雙臂「safe」。
仍然完全不寫物品名稱。  python -I mime_v4.py 720p baseball camping recorder
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import mime_v3 as v3
m = v3.m
m.BUDGET = 1240   # 方案 B 1,079 點＋這次 3 段約 148 點（老師 2026-11-10 核可）
m.SHOTS.update({
 "baseball": ("he stands side-on to the camera with feet wide apart and knees bent, both fists pressed together one on top of the other and held high just behind his back shoulder, elbows lifted; he wiggles the joined fists twice, lifts his front foot, steps forward and swings the joined fists around in one huge flat horizontal circle at chest height, his hips and shoulders twisting all the way round so he ends up facing the other way with the joined fists over his front shoulder",
              "he opens his hands and drops them, quickly glances far into the distance with a hand over his eyes, then turns and runs sideways across the stage with fast high-knee steps, stops at the other side and spreads both arms straight out wide to the sides, palms down, with a huge proud grin"),
 "camping": ("he kneels on one knee on the bare floor and pounds one fist down toward the floor three times beside his knee with big swings; then he stands up and raises both arms above his head, bringing his two flat hands together so the arms make a big pointed triangle roof shape over his head, and holds that shape proudly, smiling",
             "he sits down cross-legged on the bare floor, stretches both empty open palms forward and low, rubs them together quickly and holds them out again, hunching his shoulders and shivering with a cosy smile; then he leans back on one hand, points one finger high up and gazes upward in wonder, slowly turning his head"),
 "recorder": ("he brings both hands right in front of his mouth, one fist directly above the other, stacked vertically and touching, the top fist touching his pursed lips, both forearms pointing down and slightly forward and elbows close to his body; his fingers lift and tap one after another in a rippling wave while his cheeks puff gently, eyes looking down at his hands",
              "keeping the stacked fists at his lips he takes one huge exaggerated breath that lifts his shoulders, then blows with round puffed cheeks, fingers still rippling, swaying his body slowly side to side and tapping one foot to the beat"),
})

if __name__ == "__main__":
    res, ids = sys.argv[1], sys.argv[2:]
    est = len(ids) * 6 * (4.2 if res == "480p" else 8.2)
    print("已花", m.spent(), "預估", est, flush=True)
    if m.spent() + est > m.BUDGET: sys.exit(f"會超過上限 {m.BUDGET}：先問老師。")
    for k in ids: m.gen_video(k, res=res)
    print("累計花費", m.spent(), "點", flush=True)
