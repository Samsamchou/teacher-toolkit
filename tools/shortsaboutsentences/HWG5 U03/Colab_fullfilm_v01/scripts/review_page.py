# 由 qa/<clip>_c<take>/auto-qa.json ＋ notes.json（人工判讀）建立驗收頁 review/<clip>_c<take>/index.html。
# 用法：python -X utf8 scripts/review_page.py C01 1
import html, json, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
clip, take = sys.argv[1], int(sys.argv[2])
Q = HERE / 'qa' / f'{clip}_c{take}'
qa = json.loads((Q / 'auto-qa.json').read_text(encoding='utf-8'))
notes = json.loads((Q / 'notes.json').read_text(encoding='utf-8'))  # verdict, headline, dialogue, mouth, audio, look, buttons[[label,sec]]
D = HERE / 'review' / f'{clip}_c{take}'
(D / 'evidence').mkdir(parents=True, exist_ok=True)
spec = json.loads((HERE / 'specs' / clip / 'spec.json').read_text(encoding='utf-8'))
shutil.copy2(HERE / qa['video'], D / f'{clip}_c{take}.mp4')
shutil.copy2(qa['guide'], D / 'guide.wav')
for p in Q.glob('*.jpg'):
    shutil.copy2(p, D / 'evidence' / p.name)
shutil.copy2(Q / 'brightness-curve.png', D / 'evidence' / 'brightness-curve.png')
for key in ('first_frame', 'last_frame'):
    if spec.get(key):
        shutil.copy2((HERE / 'specs' / clip / spec[key]).resolve(), D / 'evidence' / f'{key}.png')
e = html.escape
ok = notes['verdict'] == 'PASS'
btns = ''.join(f'<button data-t="{t}">{e(l)}</button>' for l, t in notes.get('buttons', []))
imgs = lambda pat: ''.join(f'<img loading="lazy" src="evidence/{p.name}" alt="{p.stem}">' for p in sorted((D / 'evidence').glob(pat)))
page = f'''<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{clip} Colab 第 {take} 次｜HWG5 U03 驗收</title><style>
:root{{color-scheme:dark}}*{{box-sizing:border-box}}body{{margin:0;background:#101826;color:#eaf1fb;font:17px/1.6 system-ui,sans-serif}}main{{max-width:1080px;margin:auto;padding:22px}}h1{{font-size:28px;margin:6px 0}}h2{{font-size:21px}}a{{color:#9ad7ff}}.muted{{color:#b5c4d8}}.panel{{background:#1b293e;padding:18px;border-radius:14px;margin:18px 0}}.banner{{border-left:5px solid {'#5fd39a' if ok else '#ffbe6d'};background:{'#173a2b' if ok else '#42301c'};padding:12px 18px;border-radius:8px}}video{{width:100%;max-height:520px;background:#000;display:block;border-radius:10px}}button,select{{font:inherit;padding:7px 11px;border:1px solid #617894;border-radius:7px;background:#263b56;color:#fff;cursor:pointer}}.controls{{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:12px 0}}.dialogue{{font-size:21px;color:#ffe5a3;margin:0 0 12px}}.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}}.grid div{{background:#17253a;padding:16px;border-radius:10px}}.grid b{{color:#9cedc5}}.grid b.issue{{color:#ffbe6d}}audio{{width:100%}}img{{max-width:100%}}.sources{{display:grid;grid-template-columns:1fr 1fr;gap:12px}}figure{{margin:0}}figcaption,.small{{color:#b5c4d8;font-size:14px}}details{{margin:16px 0}}summary{{cursor:pointer;font-weight:600}}@media(max-width:700px){{main{{padding:14px}}.grid,.sources{{grid-template-columns:1fr}}h1{{font-size:24px}}}}</style></head><body><main>
<div class="muted">HWG5 U03 · Google Colab G4 / H3 · {qa['width']} × {qa['height']} · {qa['frames']} 幀 · seed {qa['seed']} · 第 {take} 次（上限 3 次）</div>
<h1>{clip}｜Colab 第 {take} 次｜影片驗收</h1>
<p class="banner"><strong>{e(notes['headline'])}</strong><br>{e(notes.get('summary',''))}</p>
<section class="panel"><p class="dialogue">{e(notes['dialogue'])}</p>
<video id="v" controls playsinline preload="metadata" poster="evidence/first_frame.png" src="{clip}_c{take}.mp4"></video>
<div class="controls"><button data-t="0">從頭播放</button><button id="bp">播放／暫停</button>{btns}<label>速度 <select id="sp"><option value="1">1× 原速</option><option value="0.75">0.75×</option><option value="0.5">0.5× 慢看嘴型</option></select></label><span id="tm">0.00 秒</span></div>
<a href="{clip}_c{take}.mp4" download>下載影片</a> · <a href="guide.wav" download>下載原配音</a></section>
<div class="grid"><div><b class="{'' if notes.get('mouth_ok', True) else 'issue'}">嘴型</b><p>{e(notes['mouth'])}</p></div>
<div><b class="{'' if qa['source_audio_pass'] else 'issue'}">原配音</b><p>{e(notes['audio'])} 相關係數 {qa['AAC_to_guide_zero_lag_correlation']:.5f}。</p></div>
<div><b class="{'' if qa['brightness_pass'] and notes.get('look_ok', True) else 'issue'}">光線與畫面</b><p>{e(notes['look'])} 最暗處為首幀亮度的 {qa['brightness_min_ratio']:.0%}（{qa['brightness_min_at_sec']:.2f} 秒；門檻 70%）。</p></div></div>
<section class="panel"><h2>亮度曲線</h2><img src="evidence/brightness-curve.png" alt="亮度曲線"><img src="evidence/lighting-comparison.jpg" alt="首幀、最暗、末幀對照"><p class="small">藍線是每一幀相對核准首幀的亮度；紅線是 70% 門檻。下方為首幀、最暗幀、末幀實際畫面（未調色）。</p></section>
<section class="panel"><h2>原配音</h2><audio id="a" controls preload="metadata" src="guide.wav"></audio></section>
<details><summary>核准首尾分鏡</summary><div class="sources"><figure><img loading="lazy" src="evidence/first_frame.png" alt="首幀"><figcaption>核准首幀</figcaption></figure><figure><img loading="lazy" src="evidence/last_frame.png" alt="尾幀"><figcaption>核准尾幀</figcaption></figure></div></details>
<details><summary>嘴型放大（每秒 12 張）</summary>{imgs('mouth-contact-*.jpg')}</details>
<details><summary>全畫面抽查（每 0.25 秒）</summary>{imgs('whole-contact-*.jpg')}</details>
<p>看完後在對話告訴我：{clip} 這版核准，或不通過（附時間點）。</p>
<p class="small">自動檢查：完整解碼、原配音比對、亮度曲線；人工檢查：全畫面與嘴型抽格。不能證明逐音素同步。</p></main>
<script>const v=document.getElementById('v'),a=document.getElementById('a');[v,a].forEach(m=>m.addEventListener('play',()=>[v,a].forEach(n=>{{if(n!==m)n.pause()}})));document.querySelectorAll('button[data-t]').forEach(b=>b.onclick=()=>{{v.currentTime=+b.dataset.t;v.play()}});bp.onclick=()=>v.paused?v.play():v.pause();sp.onchange=e=>v.playbackRate=+e.target.value;v.ontimeupdate=()=>tm.textContent=v.currentTime.toFixed(2)+' 秒';</script></body></html>'''
(D / 'index.html').write_text(page, encoding='utf-8')
print(D / 'index.html')
