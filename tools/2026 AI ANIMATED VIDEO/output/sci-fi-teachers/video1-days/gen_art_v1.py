"""gen_art_v1.py — 影片 1 的 14 張插圖（gpt-image-2 generate，中品質；老師 2026-10-20 同意 A 方案）。
已存在的檔案略過，不重複收費。輸出 art/<id>.png 與 .json 紀錄。用法：python -I gen_art_v1.py [id ...]
"""
import sys, subprocess, pathlib, concurrent.futures as cf

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'art'; OUT.mkdir(exist_ok=True)
TOOL = str(pathlib.Path.home() / '.claude/skills/gpt-image-2-api/scripts/gpt-image-2.mjs')
STYLE = ('Stylized 3D animated-film look, playful friendly sci-fi world for primary-school children, bright cheerful colours '
         'with soft cyan and warm orange accents, clean shapes, soft lighting, gentle depth of field. '
         'Absolutely no text, no letters, no numbers, no words, no logos, no signs with writing anywhere in the image.')
CARD = 'Square illustration for a "day of the week" picture card, one clear central subject on a simple space background. '
KIDS = ('Cheerful diverse primary-school children (about 10 years old) in light sci-fi school uniforms, '
        'friendly faces, natural poses. ')
CTX = 'Wide 16:9 scene illustration for an English lesson, the main action clearly readable in the centre. '
ART = {
 'day-sun': CARD + 'A smiling golden sun with gentle solar-panel rays floating in space, warm glow, small orbiting satellites.',
 'day-mon': CARD + 'A cute moon base on the crescent moon, round domes with glowing windows, a tiny moon rover, Earth in the distance.',
 'day-tue': CARD + 'A friendly rounded rocket launching upward from a launch pad, soft puffy exhaust clouds, stars behind.',
 'day-wed': CARD + 'A playful water planet space station, bubbles of water floating in zero gravity around a small blue planet.',
 'day-thu': CARD + 'A colourful thunder nebula with cute harmless lightning sparks and a small spaceship sailing past.',
 'day-fri': CARD + 'A fun space party on a glowing pink-gold planet, balloons shaped like planets, confetti stars floating.',
 'day-sat': CARD + 'A ringed planet like Saturn with a tiny hover-skateboard gliding along its rings, playful and sporty.',
 'ctx-sun': CTX + KIDS + 'Playing outside in a green park inside a space station dome: running, flying a kite, a ball, trees and grass, stars and a planet visible through the dome.',
 'ctx-mon': CTX + KIDS + 'Art class in a sci-fi classroom: children painting colourful planets on easels, paint palettes, floating paint drops.',
 'ctx-tue': CTX + KIDS + 'PE class in a low-gravity gym: children jumping very high with happy faces, soft padded floor, bouncy balls floating.',
 'ctx-wed': CTX + KIDS + 'Music class: children tapping glowing star-shaped chime bells and a futuristic xylophone, musical sparkles in the air (no written notes).',
 'ctx-thu': CTX + KIDS + 'A cosy reading corner on a space station: children sitting on bean bags reading picture books (blank covers), a window with stars.',
 'ctx-fri': CTX + KIDS + 'After school, children with backpacks walking happily into a space park with hover swings and a small pond, sunset light over a planet horizon.',
 'ctx-sat': CTX + KIDS + 'Children playing basketball on a futuristic outdoor court on a space station, one child shooting the ball toward a glowing hoop.',
}

def gen(k):
    out = OUT / f'{k}.png'
    if out.exists(): return k, 'skip'
    size = '1024x1024' if k.startswith('day-') else '1536x1024'
    r = subprocess.run(['node', TOOL, 'generate', '--prompt', ART[k] + ' ' + STYLE, '--output', str(out), '--size', size, '--quality', 'medium'],
                       capture_output=True, text=True, encoding='utf-8')
    return k, 'ok' if r.returncode == 0 and out.exists() else 'FAIL ' + (r.stdout + r.stderr)[-300:]

if __name__ == '__main__':
    keys = sys.argv[1:] or list(ART)
    with cf.ThreadPoolExecutor(4) as ex:
        for k, st in ex.map(gen, keys): print(k, st, flush=True)
