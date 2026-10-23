# HWG5 U03 全片合成：封面 → C01–C13（教師核准版，可剪尾）→ 封底；英文字幕依配音時間表。
# 輸出 final/：1080p 字幕版／無字幕版、720p 字幕版／無字幕版、SRT、ASS、manifest。
# 用法：uv run --no-project --with pillow python -X utf8 post/assemble.py
import json, hashlib, shutil, subprocess
from pathlib import Path
from PIL import ImageFont

HERE = Path(__file__).resolve().parents[1]
SRC = HERE.parent / 'H3_C06_voice-first_v01'
POST = HERE / 'post'; FINAL = HERE / 'final'; WORK = POST / 'work'
FINAL.mkdir(exist_ok=True); WORK.mkdir(exist_ok=True)
FONTDIR = HERE.parents[1] / 'HWG 7 U02 CLIPS/114 句型情境/Six_Friends_20260914/postproduction/fonts'
COVER_SEC, END_SEC, W, H, FPS = 4.5, 6.0, 1920, 1080, 24
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
lock = {d['id']: d for d in json.loads((SRC / 'full-film-dialogue-lock.json').read_text(encoding='utf-8-sig'))['dialogue']}
import sys
SEL = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'selected-clips.json'
sel = json.loads(SEL.read_text(encoding='utf-8'))
if len(sys.argv) > 2: FINAL = HERE / sys.argv[2]; FINAL.mkdir(exist_ok=True)
CLIPS = [f'C{i:02d}' for i in range(1, 14)]
BAR_CLIPS = {'C10', 'C11'}
LOW_TWO_LINE = {'C12'}   # 兩行字幕會蓋到畫面中的路名牌：字級 80、貼近底部   # 畫面底部有奶油色字幕框：字幕置中放進框內
missing = [c for c in CLIPS if c not in sel]
assert not missing, f'未核准：{missing}'
COLORS = {'Teddy': '&H0063D8FF', 'Abu': '&H00FFE0A0', 'Police Officer': '&H00FFFFFF'}   # ASS &HAABBGGRR：Teddy 暖黃、Abu 淺藍、警察白


def run(args):
    p = subprocess.run([str(a) for a in args], capture_output=True)
    if p.returncode:
        raise RuntimeError(p.stderr.decode('utf-8', 'replace')[-2500:])
    return p


def dur(p):
    return float(run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]).stdout)


ENC = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(FPS),
       '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2']
segs, events, t, rows = [], [], 0.0, []

# 封面、封底：靜圖＋靜音
for name, img, sec in [('00_cover', POST / 'HWG5U03_Cover_V01.png', COVER_SEC), ('99_ending', POST / 'HWG5U03_Ending_V01.png', END_SEC)]:
    out = WORK / f'{name}.mp4'
    run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', FPS, '-i', img, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
         '-t', sec, '-vf', f'scale={W}:{H},fade=t=in:st=0:d=0.5' if name == '00_cover' else f'scale={W}:{H},fade=t=out:st={sec-0.8}:d=0.8',
         *ENC, '-shortest', out])
segs.append(WORK / '00_cover.mp4'); t = COVER_SEC

for c in CLIPS:
    info = sel[c]; src = (HERE / info['file']).resolve()
    assert sha(src) == info['sha256'], c
    cut = info.get('trim_end_sec')
    out = WORK / f'{c}.mp4'
    args = ['ffmpeg', '-y', '-v', 'error', '-i', src]
    if cut:
        args += ['-t', cut]
    vf = f'scale={W}:{H}:flags=lanczos'
    if info.get('cover_bar'):   # 蓋掉模型畫進奶油色字幕框的文字（框內 y 914–1043，取內側）
        vf += ',drawbox=x=72:y=926:w=1772:h=106:color=0xFCF2E5:t=fill'
    run(args + ['-vf', vf, '-af', 'aresample=48000', *ENC, out])
    d = dur(out); segs.append(out)
    tl_path = SRC / 'audio' / ('review' if c == 'C06' else 'fullfilm') / f'{c}_timeline_v01.json'
    tl = json.loads(tl_path.read_text(encoding='utf-8-sig'))
    for e in tl['events']:
        assert e['start'] < d - 0.5, (c, e['text'], d)   # 時間表 end 含尾端餘裕；實際聲音已用 silencedetect 確認在剪點前結束
        text = lock[e['line_id']]['text'].replace('’', "'")
        events.append({'clip': c, 'line_id': e['line_id'], 'speaker': e['speaker'], 'text': text, 'margin_v': 47 if c in BAR_CLIPS else 0,
                       'start': round(t + e['start'] - 0.05, 3), 'end': round(t + min(e['end'] + 0.25, d), 3)})
    rows.append({'clip': c, 'source': info['file'], 'source_sha256': info['sha256'], 'platform': info['platform'], 'take': info['take'],
                 'trim_end_sec': cut, 'start_in_film': round(t, 3), 'duration': round(d, 3)})
    t += d
segs.append(WORK / '99_ending.mp4'); total = t + END_SEC
for a, b in zip(events, events[1:]):
    a['end'] = min(a['end'], b['start'] - 0.04)

# 字幕換行：1080p 字級 94（720p 63 等比）、最多兩行
font = ImageFont.truetype(str(FONTDIR / 'ComicRelief-Bold.ttf'), 94)
def wrap(s):
    if font.getlength(s) <= 1700:
        return [s]
    w = s.split(); best = min(range(1, len(w)), key=lambda k: abs(font.getlength(' '.join(w[:k])) - font.getlength(' '.join(w[k:]))))
    lines = [' '.join(w[:best]), ' '.join(w[best:])]; assert max(map(font.getlength, lines)) <= 1700, s
    return lines
stamp = lambda x, ass: (f'{int(x//3600)}:{int(x%3600//60):02}:{x%60:05.2f}' if ass else
                        f'{int(x//3600):02}:{int(x%3600//60):02}:{int(x%60):02},{int(round(x%1*1000)) % 1000:03}')
BREAK = chr(92) + 'N'
srt, ass_lines = [], []
for i, e in enumerate(events, 1):
    lines = wrap(e['text']); e['display'] = lines
    pre = ''
    if e['clip'] in LOW_TWO_LINE and len(lines) > 1:
        pre = chr(123) + chr(92) + 'fs80' + chr(125); e['margin_v'] = 22
    srt += [str(i), f"{stamp(e['start'], False)} --> {stamp(e['end'], False)}", *lines, '']
    ass_lines.append(f"Dialogue: 0,{stamp(e['start'], True)},{stamp(e['end'], True)},{e['speaker'].replace(' ', '')},,0,0,{e['margin_v']},,{pre}{BREAK.join(lines)}")
styles = '\n'.join(f"Style: {k.replace(' ', '')},Comic Relief,94,{v},&H000000FF,&H00203040,&H64000000,-1,0,0,0,100,100,0,0,1,5,2,2,80,80,108,1"
                   for k, v in COLORS.items())
ass = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
{styles}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
""" + '\n'.join(ass_lines) + '\n'
(FINAL / 'HWG5U03_Captions_V01.srt').write_text('\n'.join(srt), encoding='utf-8')
(FINAL / 'HWG5U03_Captions_V01.ass').write_text(ass, encoding='utf-8')

# 串接 → 無字幕母帶 → 燒字幕；720p 版
lst = WORK / 'concat.txt'; lst.write_text(''.join(f"file '{s.as_posix()}'\n" for s in segs), encoding='utf-8')
nosub = FINAL / 'HWG5U03_Full_NoSubtitles_1080p_V01.mp4'
run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', '-movflags', '+faststart', nosub])
shutil.copy2(FINAL / 'HWG5U03_Captions_V01.ass', WORK / 'subs.ass'); shutil.copytree(FONTDIR, WORK / 'fonts', dirs_exist_ok=True)
sub = FINAL / 'HWG5U03_Full_EnglishSubtitles_1080p_V01.mp4'
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(nosub), '-vf', 'subtitles=subs.ass:fontsdir=fonts',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', str(sub)],
               cwd=WORK, check=True)
for big, small in [(sub, 'HWG5U03_Full_EnglishSubtitles_720p_V01.mp4'), (nosub, 'HWG5U03_Full_NoSubtitles_720p_V01.mp4')]:
    run(['ffmpeg', '-y', '-v', 'error', '-i', big, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
         '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-movflags', '+faststart', FINAL / small])
# 響度：量整片 → 線性加增益到約 -16 LUFS，限幅器 -1.5 dBFS（教室播放音量；原配音母帶不動）
import re as _re
meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(nosub), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True, errors='replace').stderr
lufs_before = float(_re.findall(r'I:\s*(-?[\d.]+) LUFS', meas)[-1]); gain = round(-16.0 - lufs_before, 2)
for f in [nosub, sub, FINAL / 'HWG5U03_Full_EnglishSubtitles_720p_V01.mp4', FINAL / 'HWG5U03_Full_NoSubtitles_720p_V01.mp4']:
    tmp = f.with_name(f.stem + '_tmp.mp4')
    run(['ffmpeg', '-y', '-v', 'error', '-i', f, '-c:v', 'copy', '-af', f'volume={gain}dB,alimiter=limit=0.8414:level=false',
         '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', tmp])
    tmp.replace(f)
meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(nosub), '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True, errors='replace').stderr
loud = {'before_LUFS': lufs_before, 'gain_dB': gain, 'after_LUFS': float(_re.findall(r'I:\s*(-?[\d.]+) LUFS', meas)[-1]),
        'after_true_peak_dBFS': float(_re.findall(r'Peak:\s*(-?[\d.]+) dBFS', meas)[-1])}
outs = sorted(FINAL.glob('*.*'))
manifest = {'loudness': loud, 'total_sec_planned': round(total, 3), 'cover_sec': COVER_SEC, 'ending_sec': END_SEC, 'clips': rows, 'subtitle_events': events,
            'files': [{'file': p.name, 'bytes': p.stat().st_size, 'sha256': sha(p), 'duration': round(dur(p), 3) if p.suffix == '.mp4' else None} for p in outs]}
(FINAL / 'manifest_V01.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'total': round(total, 2), 'events': len(events), 'files': [(f['file'], f['duration']) for f in manifest['files']]}, ensure_ascii=False))
