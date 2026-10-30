"""gen_talk_art.py — 影片 2 對話動畫華麗版的素材（規格卡 RDQ-spec-video2-dialogues-deluxe-20261030；分鏡 talk-storyboard-v2.md）。
全部用 Codex CLI 內建生圖（老師的 ChatGPT 方案）。角色圖用純綠背景（#00FF00）方便程式去背；參考圖用 -i 附上，提示詞從 stdin 傳。
Codex 沙箱寫不進 G 槽：從它回報的 ~/.codex/generated_images 路徑複製回 talk-art/。已存在的圖略過。
用法：python -I gen_talk_art.py <組名或 id> ...   組名：sheets、amy、ben、mouths、scenes
"""
import sys, re, shutil, subprocess, pathlib, time, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'talk-art'; OUT.mkdir(exist_ok=True)
CH = HERE.parent / 'characters'
STYLE_REFS = [CH / 'nova/nova-sheet-v1-1.png', CH / 'cosmo/cosmo-sheet-v1-2.png']
STYLE = ('Match the attached reference images exactly in rendering style: stylized 3D animated-film look, soft studio lighting, '
         'rounded appealing proportions, high detail, cheerful. No text, no letters, no numbers, no logos anywhere.')
GREEN = ('Plain solid flat pure green background (#00FF00), completely uniform, no floor, no shadow on the background, '
         'the whole body fully inside the frame with margin around it. Do not use any green colour on the character.')
AMY = ('Amy, a cheerful 10-year-old girl student in the same sci-fi world as the reference teachers, about 4 heads tall: '
       'big bright brown eyes, warm light-tan skin, long black hair in a high ponytail with a small glowing cyan hair clip, '
       'white sci-fi school jacket with orange trim lines and a small round badge, dark navy long sports track pants with orange side stripes '
       '(full-length trousers, not a skirt), white high-tech sneakers with cyan soles.')   # 2026-10-30 老師：Amy 改穿運動長褲
BEN = ('Ben, an energetic 10-year-old boy student in the same sci-fi world as the reference teachers, about 4 heads tall: '
       'big bright hazel eyes, light skin with a few freckles, fluffy brown short hair, '
       'cyan-blue sci-fi school jacket with orange shoulder stripes and a small round badge, dark grey trousers, orange high-tech sneakers.')
ART = {}
ART['sheet-amy'] = (AMY + ' Full body, front view, standing relaxed with arms slightly away from the body, friendly closed-mouth smile. ' + GREEN, STYLE_REFS)
ART['sheet-ben'] = (BEN + ' Full body, front view, standing relaxed with arms slightly away from the body, friendly closed-mouth smile. ' + GREEN, STYLE_REFS)
GROUPS = {'sheets': ['sheet-amy', 'sheet-ben']}

# 姿勢圖（2026-10-30 定裝圖通過後）：以定裝圖為參考，保持同一個角色；全身、綠背景
KEEP = ('Use the attached image as the exact same character: same face, hair, outfit, colours and proportions. '
        'Full body in frame, 3/4 view angled slightly toward the {side} of the image, expressive animated-film acting. ' + GREEN)
POSES = {
 'amy': {'wave': 'waving hello high with her right hand, big bright open smile, walking forward energetically',
         'puzzled': 'tilting her head, scratching her head with one hand, eyebrows knitted, puzzled closed mouth',
         'shocked': 'both hands pressed on her cheeks, eyes wide open, shocked worried expression, leaning back',
         'hug': 'hugging a small yellow box of crayons to her chest with both arms, eyes closed in a happy grateful smile',
         'calm': 'leaning casually, one palm raised in a calm-down gesture, relaxed half-smile with half-closed eyes',
         'basketball': 'spinning an orange basketball on her raised index finger, the other arm pointing forward, playful grin',
         'cheer': 'jumping in the air with both fists raised, huge excited open-mouth smile',
         'sing': 'swaying to music with one hand raised keeping the beat, eyes closed, happy singing face',
         'point': 'pointing forward curiously with one hand, the other hand on her hip, interested raised eyebrows'},
 'ben':  {'crayons': 'holding up a small yellow box of colourful crayons in one hand, curious raised eyebrows, friendly smile',
         'excited': 'jumping slightly with excitement and pointing sideways with his whole arm, big open-mouth smile',
         'offer': 'holding out a small yellow box of crayons with both hands as a kind offer, gentle warm smile',
         'panic': 'hopping on one foot while pulling on a sneaker, a backpack swinging on one shoulder, panicked wide-eyed face',
         'frozen': 'frozen mid-step with both arms out, blank surprised face with big round eyes',
         'cheer': 'jumping in the air with both fists raised, huge excited open-mouth smile',
         'case': 'walking forward carrying a large orange guitar case on his back, proud cheerful smile',
         'show': 'proudly holding up a shiny orange acoustic guitar with both hands, beaming smile',
         'strum': 'playing a shiny orange acoustic guitar, strumming the strings, bobbing his head happily with eyes half closed'},
}
for who, poses in POSES.items():
    side = 'right' if who == 'amy' else 'left'   # Amy 在左邊看向右、Ben 在右邊看向左
    for k, desc in poses.items():
        ART[f'{who}-{k}'] = (KEEP.format(side=side) + ' Pose: ' + desc + '.', [f'sheet-{who}.png'])
    GROUPS[who] = [f'{who}-{k}' for k in poses]
# 嘴形：同一張臉的 6 種嘴形（程式切成 6 塊，貼到各姿勢的臉上）
for who in ('amy', 'ben'):
    ART[f'mouths-{who}'] = ('Use the attached image as the exact same character. A 3 by 2 grid of six square close-up tiles of this character\'s '
        'lower face (from nose tip to chin, same skin tone and lighting, front view), separated by thick pure green (#00FF00) gaps. '
        'Tile 1: lips gently closed in a soft smile. Tile 2: mouth wide open saying "ah". Tile 3: wide smile saying "ee" with teeth showing. '
        'Tile 4: rounded open mouth saying "oh". Tile 5: small puckered mouth saying "oo". Tile 6: slightly open relaxed mouth.', [f'sheet-{who}.png'])
GROUPS['mouths'] = ['mouths-amy', 'mouths-ben']
# 場景：16:9、沒有人、沒有任何文字或月曆
BGREF = [HERE.parent / 'art/bg-classroom-v1.png']
SCENE = ('Background plate for a children\'s animation, wide 16:9 landscape, same playful sci-fi space-station world and rendering style as the attached image, '
         'eye-level view, open floor area in the lower middle for two child characters to stand. No people, no characters, '
         'no text, no letters, no numbers, no calendars, no posters with writing.')
ART['scene-classroom'] = (SCENE + ' A bright sci-fi classroom: rows of rounded desks, a blank wooden easel with an empty canvas near the front, '
                          'round porthole windows with stars, soft cyan and warm orange light strips, morning light.', BGREF)
ART['scene-home'] = (SCENE + ' A cosy boy\'s bedroom on the space station in the morning: an unmade bed on the left, a bedside table with a round '
                     'alarm clock that has a plain face with only two hands and no numbers, a big round window showing a green space-station park, '
                     'an open doorway on the right side, toys and a small rocket model on a shelf.', BGREF)
ART['scene-hallway'] = (SCENE + ' A school hallway on the space station: a long row of rounded lockers in alternating cyan and orange, '
                        'soft ceiling light panels, a round porthole window with a planet at the far end, polished floor with reflections.', BGREF)
GROUPS['scenes'] = ['scene-classroom', 'scene-home', 'scene-hallway']
# 閉嘴版（2026-10-30）：原圖嘴巴張開的姿勢，程式畫嘴時蓋不乾淨（會有灰色痕跡）→ 生一張只把嘴巴改成閉上的版本，說話時用它當底圖
OPEN = ['amy-basketball', 'amy-cheer', 'amy-point', 'amy-shocked', 'amy-sing', 'amy-wave',
        'ben-cheer', 'ben-excited', 'ben-frozen', 'ben-panic', 'ben-show', 'ben-strum']
for k in OPEN:
    ART[f'{k}-closed'] = ('Edit the attached image. Keep EVERYTHING exactly the same: same character, same pose, same hands, same outfit, '
        'same framing and size, same plain pure green (#00FF00) background. Change ONLY the mouth: lips gently closed in a soft relaxed '
        'expression that still matches the emotion of the face (no teeth showing, mouth not open).', [f'{k}.png'])
GROUPS['closed'] = [f'{k}-closed' for k in OPEN]

def gen(k):
    out = OUT / f'{k}.png'
    if out.exists(): return k, 'skip'
    prompt, refs = ART[k]
    refs = [r if isinstance(r, pathlib.Path) else OUT / r for r in refs]
    text = (f'Use your built-in image generation tool to create this image: {prompt} {STYLE} '
            f'Save the PNG as {k}.png in the current directory. Reply with the saved file path only.')
    cmd = [shutil.which('codex'), 'exec', '--skip-git-repo-check', '-s', 'workspace-write']
    for r in refs: cmd += ['-i', str(r)]
    # 2026-10-30：codex 卡住時，用管線（pipe）讀輸出會跟著卡死（逾時只殺得掉 codex.cmd，node 子程序還拿著管線）。
    # 改成輸出寫進檔案、每 5 秒檢查一次，最多等 7 分鐘；逾時就放棄這張，重跑時再補。
    log = OUT / 'logs'; log.mkdir(exist_ok=True); lf = log / f'{k}.log'
    with open(lf, 'w', encoding='utf-8') as fo, open(log / f'{k}.prompt.txt', 'w', encoding='utf-8') as fp:
        fp.write(text)
    with open(log / f'{k}.prompt.txt', 'rb') as fi, open(lf, 'wb') as fo:
        p = subprocess.Popen(cmd + ['-'], cwd=OUT, stdin=fi, stdout=fo, stderr=subprocess.STDOUT)
        for _ in range(84):
            if p.poll() is not None: break
            time.sleep(5)
        else:
            p.kill(); return k, 'FAIL timeout'
    txt = lf.read_text(encoding='utf-8', errors='replace')
    if not out.exists():
        m = re.findall(r'[A-Za-z]:\\[^\s\]\)\(\'"]*generated_images[^\s\]\)\(\'"]*\.png', txt)   # Codex 常回 Markdown 連結 [路徑](路徑)，不能跨過括號
        if m: shutil.copy(m[-1], out)
    return k, 'ok' if out.exists() else 'FAIL ' + txt[-300:]

if __name__ == '__main__':
    keys = [k for a in sys.argv[1:] for k in GROUPS.get(a, [a])]
    with cf.ThreadPoolExecutor(3) as ex:
        for k, st in ex.map(gen, keys): print(k, st, flush=True)
