"""gen_wordcards.py — 用 OpenAI gpt-image-2（edit，影片截圖當參考）重畫 6 張字卡圖（4:3、medium）。
依 RDQ-spec-jiji-wordcard-redraw-20261115（confirmed；教師同意 6 張）。
用法：python gen_wordcards.py [banana bike ...]；輸出 wordcards/<word>.png＋同名 .json（已存在就跳過）。
金鑰由 helper 自行讀取，本檔不碰金鑰。"""
import pathlib, subprocess, sys

HERE = pathlib.Path(__file__).resolve().parent
ART = pathlib.Path(r'G:/我的雲端硬碟/teacher-toolkit/tools/2026 AI ANIMATED VIDEO/output/jiji-line/art')
TOOL = pathlib.Path.home() / '.claude/skills/gpt-image-2-api/scripts/gpt-image-2.mjs'
OUT = HERE / 'wordcards'; OUT.mkdir(exist_ok=True)
SIZE, QUALITY = '1536x1152', 'medium'   # 4:3

STYLE = ("Create a NEW picture-card illustration for a Grade 4 English word card. Match the art style of the reference "
         "images exactly: hand-painted watercolor and gouache anime illustration, soft Ghibli-like brushwork, clean thin ink "
         "outlines, warm natural light, friendly for 10-year-old children. 4:3 landscape. THE MAIN SUBJECT MUST BE LARGE, "
         "CENTERED AND COMPLETE, filling at least 60 percent of the image area, sharp and bright, instantly recognizable at a "
         "glance. The background is a soft, blurred, lighter version of the scene from the reference so it still feels like "
         "the same place, but it must not compete with the subject. No people unless stated. Absolutely no text, letters, "
         "numbers, Chinese characters, arrows, circles, frames, logos or watermarks anywhere.")

CARDS = {
    'banana': (['scenes-v2/N01_古早載香蕉木材.png', 'scenes-v1/S24a_集集老街.png'],
               "Subject: one big, fresh bunch of yellow-green Taiwanese bananas (many curved bananas on one stalk), shown large "
               "in the centre, clearly banana-shaped and yellow. Background: blurred old wooden railway freight wagon and banana "
               "trees in soft sepia-green light."),
    'bike': (['scenes-v1/S24b_綠色隧道騎車.png', 'scenes-v2/N17_雙鐵小旅行.png'],
             "Subject: one whole blue bicycle with a front basket, seen from the side, both wheels, frame, handlebar and seat fully "
             "visible, filling most of the picture. No rider, no people. Background: blurred green tunnel of big camphor trees "
             "over a bike path."),
    'mountain': (['scenes-v1/S28_車窗看玉山.png', 'scenes-v1/S27_登山客往玉山.png'],
                 "Subject: one tall, pointed rocky mountain peak (Jade Mountain) standing in the centre, with a few white clouds "
                 "around its middle, the peak and slopes taking most of the image. Very little foreground. Clear blue sky."),
    'lake': (['scenes-v2/N10_日月潭水到明潭.png'],
             "Subject: a wide, calm, bright blue lake (Sun Moon Lake) filling most of the picture, with one or two small green "
             "islands and gentle reflections, seen from a little above. Soft green hills around the edges only. No pipes, no "
             "dam, no buildings."),
    'ice pop': (['scenes-v1/S30_吃枝仔冰.png'],
                "Subject: one yellow old-fashioned Taiwanese ice pop (a rectangular frozen popsicle on a wooden stick), shown big "
                "and upright in the centre, with a little frost and a tiny drip, clearly an ice pop. No people and no hands. "
                "Background: blurred old shop counter with a freezer."),
    'ticket': (['scenes-v2/N16_石虎紀念車票.png'],
               "Subject: one cute commemorative train ticket card lying flat and filling most of the picture, clearly shaped like a "
               "small rectangular paper ticket with rounded corners, a punched hole and a printed border; on it a small picture "
               "of a spotted Taiwanese leopard cat beside a little yellow train. The ticket itself must be the obvious main "
               "object. No hands. Background: blurred station platform. The ticket has blank areas but NO writing at all."),
}


def run(word):
    out = OUT / f"{word.replace(' ', '_')}.png"
    if out.exists():
        print('skip', word); return True
    refs, scene = CARDS[word]
    pf = OUT / f"{word.replace(' ', '_')}.prompt.txt"; pf.write_text(STYLE + '\n\n' + scene, encoding='utf-8')
    cmd = ['node', str(TOOL), 'edit', '--prompt-file', str(pf), '--output', str(out), '--size', SIZE, '--quality', QUALITY]
    for r in refs: cmd += ['--input', str(ART / r)]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')
    print(word, 'exit', res.returncode, (res.stdout + res.stderr).strip()[-300:])
    return res.returncode == 0


if __name__ == '__main__':
    words = sys.argv[1:] or list(CARDS)
    for w in words:
        if not run(w): sys.exit(1)
