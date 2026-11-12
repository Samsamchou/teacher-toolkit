"""二水鐵道博物館（虛構，RDQ-spec-ershui-planet-railway-museum-20261112）的 18 秒環境音 A／B。
照 make_ambience_v2.py 的分層方法（每個聲音用 KIE Suno Sounds 分開生成、每層 2.5 點出 2 段，A 用第 1 段、B 用第 2 段）。
老師確認：導覽輕聲（聽不出字）、腳步、蒸汽汽笛展示聲；**沒有任何中文／英文句子**（不用 edge-tts）。
招牌聲放前面：0.2 秒蒸汽汽笛兩聲＋放汽嘶聲 → 蒸汽機慢慢噗噗 → 背景一直有遠處導覽的模糊人聲、慢慢的腳步、最後兩下相機快門。
避開別的地點的招牌聲：柴油列車進站／平交道（火車站）、翻書（圖書館）、收銀（超市、書店）。
相機快門層 shutter 也給默劇音效用（make_mime_sfx 層名 amb:museum/shutter）。
輸出：資料/ambience/v2/museum_A.mp3、museum_B.mp3；素材：資料/ambience/museum/<層>_<0|1>.mp3
用法：python -I tools/make_ambience_museum.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import make_ambience_v2 as V
M = V.M

NOTALK = " No music, no melody, no singing, no clear words: any voices are far away, muffled and unintelligible."
LAYERS = {
    "bed": ("Inside a big quiet railway museum hall with a high roof: large echoing indoor space, soft air conditioning hum, "
            "very faint distant shuffling of visitors." + M.BEDTAIL, True),
    "murmur": ("A museum tour guide talking softly to a small group of visitors far away across a big echoing hall: gentle muffled murmuring voices "
               "that rise and fall, a few soft surprised 'ooh' reactions, calm and polite, close-up words cannot be understood." + NOTALK, False),
    "footsteps": ("Slow quiet footsteps of one visitor walking step by step across a polished wooden floor in a large echoing hall, soft shoes, "
                  "unhurried, then stopping." + M.TAIL, False),
    "whistle": ("An old steam locomotive whistle demonstration in a museum: a long loud classic steam train whistle blowing twice, whooo-whooo, "
                "followed by a big hiss of steam releasing." + M.TAIL, False),
    "steam": ("An old steam engine standing still, slowly chuffing, chuff... chuff... chuff, with hissing steam and a few heavy metal clanks, close up." + M.TAIL, False),
    "shutter": ("A single camera shutter click: a crisp mechanical camera shutter snap, ka-chick, then quiet; two separate clicks a second apart." + M.TAIL, False),
}
V.PLAN["museum"] = [("kie", "bed", 0, 18, 0), ("long", "whistle", 0.2, 4.6, 5), ("long", "steam", 4.4, 5.0, 0),
                    ("long", "murmur", 1.0, 16.5, -9), ("long", "footsteps", 9.2, 6.0, -1),
                    ("kie", "shutter", 15.4, 1.0, -3), ("kieB", "shutter", 16.6, 1.0, -3)]


def gen():
    import kie
    d = os.path.join(V.ROOT, "museum"); os.makedirs(d, exist_ok=True)
    for layer, (prompt, loop) in LAYERS.items():
        if os.path.exists(os.path.join(d, layer + "_0.mp3")):
            continue
        t = kie.create("ai-music-api/sounds", {"prompt": prompt, "model": "V5", "sound_loop": loop})
        r = kie.wait(t)
        for i, c in enumerate(((r.get("response") or {}).get("data") or [])[:2]):
            kie.download(c["audio_url"], os.path.join(d, f"{layer}_{i}.mp3"))
        print("generated museum", layer, flush=True)


if __name__ == "__main__":
    gen()
    V.mix("museum")
    print("mixed", os.path.join(V.OUT, "museum_A.mp3"), os.path.join(V.OUT, "museum_B.mp3"))
