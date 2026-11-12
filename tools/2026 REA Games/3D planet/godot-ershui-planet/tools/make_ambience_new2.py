"""Listen and Guess 三種線索版（RDQ-spec-listen-guess-3clues-20261112）：新增 2 個地點的 18 秒環境音。
照 make_ambience_v2.py（11/08 老師選定的方法）：每個重點聲音用 KIE Suno Sounds 分開生成（每層 2.5 點、出 2 段），
重點聲放前 3 秒、拉長、-16 LUFS 疊在 -36 的背景上；台灣口音中文廣播用 edge-tts。A／B 用不同的 AI 素材。
避開其他地點已經用的招牌聲：翻書（圖書館）、掃描嗶（超市）、叫號叮咚（郵局）、超商電子門鈴（不用）。
  station   火車站：月台廣播＋列車進站（汽笛、鐵軌隆隆、煞車）＋平交道噹噹＋車門關閉＋刷卡進站嗶
  bookstore 書店：門口掛鈴＋拆漫畫收縮膜＋書放進紙袋＋收銀機＋「歡迎光臨」「這本漫畫一百二十元」
輸出：資料/ambience/v2/<地點>_A.mp3、_B.mp3；素材：資料/ambience/<地點>/<層>_<0|1>.mp3
用法：python -I tools/make_ambience_new2.py [station] [bookstore]
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_ambience_v2 as V

V.NEW_KIE.update({
    "station": {
        "bed": "Inside a small rural Taiwanese railway station hall and platform: open-air echo, light wind, a few distant footsteps, very faint distant chatter.",
        "arrive": "A diesel passenger train arriving at a railway station platform: a long loud train horn blast, then the heavy rhythmic clickety-clack of wheels on rail joints getting closer and slowing, ending with a long high squeal of brakes.",
        "crossing": "A railway level crossing warning bell ringing: fast repeated metallic ding-ding-ding-ding alarm bell at a train crossing, outdoors.",
        "doors": "Train doors closing at a station platform: a short warning beeping chime, then the sliding doors thud shut with a pneumatic hiss.",
        "gate": "Passengers tapping transit cards at a railway station ticket gate: one short high electronic beep, the turnstile gate flaps clacking open, then another beep.",
    },
    "bookstore": {
        "bed": "Inside a small quiet neighbourhood bookshop: soft air conditioner hum, a customer's quiet footsteps, very calm, no music.",
        "doorbell": "A small brass shop bell hanging on a wooden door jingling as the door opens and swings shut, tinkling metal bell, close up.",
        "wrap": "Tearing open the crinkly clear plastic shrink-wrap film on a brand-new comic book: loud crinkling and ripping of thin plastic, close up.",
        "bagbook": "Two new paperback books slid into a stiff paper shopping bag at a shop counter: paper bag rustling and crackling, the bag folded closed.",
        "register": "An old mechanical cash register: buttons pressed, then a loud bell ka-ching and the cash drawer rolling open, coins rattling.",
    },
})
VF, VM = V.VOICE_F, V.VOICE_M
V.PLAN.update({
    # 火車站：月台廣播＋汽笛進站放最前面（招牌聲），平交道、車門、刷卡收尾
    "station": [("kie", "bed", 0, 18, 0), ("tts", "第一月台，區間車即將進站，請勿跨越黃線。", VF, True, 0.1, 1),
                ("long", "arrive", 3.9, 7.0, 4), ("kie", "doors", 11.0, 2.4, 0), ("long", "crossing", 13.3, 3.0, -4),
                ("kie", "gate", 16.2, 1.8, -2)],
    # 書店：鈴鐺＋歡迎光臨開場，拆收縮膜（招牌聲）拉長，收銀、店員說價錢、裝袋
    "bookstore": [("kie", "bed", 0, 18, 0), ("kie", "doorbell", 0.1, 2.2, 2), ("tts", "歡迎光臨！", VF, False, 1.6, 0),
                  ("long", "wrap", 3.3, 5.5, 4), ("tts", "這本漫畫一百二十元。", VF, False, 9.0, 0),
                  ("kie", "register", 11.4, 2.6, 0), ("long", "bagbook", 14.0, 3.8, 1)],
})

if __name__ == "__main__":
    for pl in (sys.argv[1:] or ["station", "bookstore"]):
        os.makedirs(os.path.join(V.ROOT, pl), exist_ok=True)
        V.gen_new(pl)
        V.mix(pl)
