"""tts_gemini.py — 用 gemini-3.8-flash-tts 為 lines.json 每一行產生 WAV（24 kHz／mono／16-bit）。
預設只列出將送出的請求（dry-run，不花錢）；加 --go 才實際呼叫 API。金鑰只從環境變數 GEMINI_API_KEY / GOOGLE_API_KEY 讀，不寫入檔案。
用法: python -I tts_gemini.py lines.json [--go] [--only L01,L02] [--force]
輸出: wav/<id>.wav 與 timings.json（每行實測秒數，供動畫時間軸使用）。
注意: 文字欄位會被「逐字朗讀」，舞台指示不可寫進 text；語氣寫在 style；瞬間事件用 <short pause> 這類標籤。
"""
import argparse, base64, json, pathlib, subprocess, sys

ap = argparse.ArgumentParser()
ap.add_argument('lines'); ap.add_argument('--go', action='store_true'); ap.add_argument('--only'); ap.add_argument('--force', action='store_true')
a = ap.parse_args()
root = pathlib.Path(a.lines).resolve().parent
cfg = json.loads(pathlib.Path(a.lines).read_text(encoding='utf-8'))
(wav_dir := root / 'wav').mkdir(exist_ok=True)
MODEL = cfg.get('model', 'gemini-3.8-flash-tts')
only = set(a.only.split(',')) if a.only else None
todo = [l for l in cfg['lines'] if not only or l['id'] in only]

def request(line):
    ann = {'type': 'speech_metadata'}
    if line.get('style'): ann['style'] = line['style']
    return dict(model=MODEL,
                input=[{'type': 'user_input', 'content': [{'type': 'text', 'text': line['text'], 'annotations': [ann]}]}],
                response_format={'type': 'audio'},
                generation_config={'speech_config': [{'voice': cfg['voices'][line['who']]}]})

if not a.go:
    for l in todo: print('[dry-run]', l['id'], l['who'], cfg['voices'][l['who']], '|', l.get('style', ''), '|', l['text'])
    print(f'{len(todo)} 行；不會呼叫 API。確認後加 --go。'); sys.exit()

from google import genai   # 需要 google-genai >= 2.25.0
client = genai.Client()
timings = json.loads((root / 'timings.json').read_text(encoding='utf-8')) if (root / 'timings.json').exists() else {}
for l in todo:
    out = wav_dir / f"{l['id']}.wav"
    if out.exists() and not a.force: print('skip', out.name); continue
    it = client.interactions.create(**request(l))
    out.write_bytes(base64.b64decode(it.output_audio.data))
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(out)]))
    timings[l['id']] = round(dur, 3); print('ok', out.name, dur)
(root / 'timings.json').write_text(json.dumps(timings, indent=1), encoding='utf-8')
