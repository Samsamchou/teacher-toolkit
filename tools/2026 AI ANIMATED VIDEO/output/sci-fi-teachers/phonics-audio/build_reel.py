"""build_reel.py — 用 processed/*.wav 組試聽帶 reel-days.wav／.mp3 與 reel-days.md（不重跑語音辨識）。
2026-10-19 老師決定：a/e/i/o/u 短母音與 wh/sh/th/ph/ch 組合音都用老師提供的 references 音檔。"""
import subprocess, pathlib
import numpy as np, soundfile as sf
HERE = pathlib.Path(__file__).resolve().parent; P = HERE / 'processed'; SR = 48000
REEL = [
 ('短母音', [('short a /æ/（老師音檔）', 'short-a-1'), ('short e /ɛ/（老師音檔）', 'short-e-1'), ('short i /ɪ/（老師音檔）', 'short-i-1'),
            ('short o /ɑ/（老師音檔）', 'short-o-1'), ('short u /ʌ/（老師音檔）', 'short-u-1')], None),
 ('Sunday', [('u /ʌ/（老師音檔 short u）', 'short-u-1'), ('ay /eɪ/（字母名 A）', 'En-us-A_upper')], 'En-us-Sunday'),
 ('Monday', [('o 唸 /ʌ/（老師音檔 short u）', 'short-u-1'), ('ay /eɪ/（字母名 A）', 'En-us-A_upper')], 'En-us-Monday'),
 ('Tuesday', [('ue /uː/（美式單字 blue）', 'En-us-blue'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Tuesday'),
 ('Wednesday', [('e /ɛ/（老師音檔 short e）', 'short-e-1'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Wednesday'),
 ('Thursday', [('th /θ/（老師音檔 th voiceless）', 'dg-th-voiceless'), ('ur /ɝ/（美式單字 er）', 'En-us-er'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Thursday'),
 ('Friday', [('i /aɪ/（字母名 I）', 'En-us-I'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Friday'),
 ('Saturday', [('a /æ/（老師音檔 short a）', 'short-a-1'), ('ur /ɚ/（美式單字 er）', 'En-us-er'), ('ay /eɪ/', 'En-us-A_upper')], 'En-us-Saturday'),
 ('組合音', [('wh（老師音檔）', 'dg-wh'), ('sh /ʃ/（老師音檔）', 'dg-sh'), ('th /θ/ 無聲（老師音檔）', 'dg-th-voiceless'),
           ('th /ð/ 有聲（老師音檔）', 'dg-th-voiced'), ('ph /f/（老師音檔）', 'dg-ph'), ('ch /tʃ/（老師音檔）', 'dg-ch')], None),
]
def load(stem):
    a, sr = sf.read(str(P / f'{stem}.wav'), dtype='float32'); assert sr == SR, stem; return a
GAP, BIG = np.zeros(int(.7 * SR), np.float32), np.zeros(int(1.4 * SR), np.float32)
buf, t = [], 0.0
md = ['# 七個星期單字：發音試聽帶 v4', '', '開頭是 a/e/i/o/u 短母音（老師提供的音檔），接著每個星期單字先播重點母音，再播完整單字（美式真人錄音），最後是組合音。時間為試聽帶內的秒數。', '',
      '| 時間 | 單字 | 播放內容 | 檔案 |', '|---|---|---|---|']
for word, parts, wfile in REEL:
    for label, stem in parts + ([('完整單字', wfile)] if wfile else []):
        a = load(stem); md.append(f'| {t:5.1f}s | {word} | {label} | {stem} |'); buf += [a, GAP]; t += (len(a) + len(GAP)) / SR
    buf.append(BIG); t += len(BIG) / SR
reel = np.concatenate(buf); sf.write(str(HERE / 'reel-days.wav'), reel, SR, subtype='PCM_16')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(HERE / 'reel-days.wav'), '-b:a', '192k', str(HERE / 'reel-days.mp3')], check=True)
md += ['', '## 音檔來源', '- 短母音 a/e/i/o/u：老師提供（`references/[a|e|i|o|u].mp3`，每檔唸兩次，取第一次；第二次存為 `short-<v>-2.wav` 備用）。',
       '- 組合音 wh、sh、th（無聲／有聲）、ph、ch：老師提供（`references/[wh].mp3` 等，每檔一次）。',
       '- 其他：維基共享資源（見 `sources.json`；CC BY-SA 3.0 需在片尾標註作者與授權）。',
       '- 本機 ffmpeg 9.0.1 解舊 Ogg 會截斷，Commons 檔已改用 libsndfile 解碼（`process_audio.py`）。']
(HERE / 'reel-days.md').write_text('\n'.join(md) + '\n', encoding='utf-8'); print('reel', round(len(reel) / SR, 1), 's')
