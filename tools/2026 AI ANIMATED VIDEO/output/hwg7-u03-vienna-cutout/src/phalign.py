"""語音強制對齊：從配音檔量出每個音素真正的起訖時間（20 ms 解析度）。
模型：facebook/wav2vec2-lv-60-espeak-cv-ft（音素 CTC，本機 CPU 跑，免費）。
    phones = align(wav_path, "I play the piano in my free time.")
    → [dict(word, phone(ARPAbet), t0, t1)]
"""
import json, re, subprocess
import numpy as np
import cmudict

MODEL = 'facebook/wav2vec2-lv-60-espeak-cv-ft'
SR = 16000; HOP = 320/SR
CMU = cmudict.dict()
IPA = dict(AA=['ɑː', 'ɑ'], AE=['æ'], AH=['ʌ', 'ə', 'ɐ'], AO=['ɔː', 'ɔ', 'ɑː'], AW=['aʊ'], AY=['aɪ'], EH=['ɛ'], ER=['ɚ', 'ɜː'], EY=['eɪ'],
           IH=['ɪ', 'ᵻ'], IY=['iː', 'i'], OW=['oʊ'], OY=['ɔɪ'], UH=['ʊ'], UW=['uː', 'u'],
           B=['b'], CH=['tʃ'], D=['d', 'ɾ'], DH=['ð'], F=['f'], G=['ɡ'], HH=['h'], JH=['dʒ'], K=['k'], L=['l'], M=['m'], N=['n'], NG=['ŋ'],
           P=['p'], R=['ɹ'], S=['s'], SH=['ʃ'], T=['t', 'ɾ'], TH=['θ'], V=['v'], W=['w'], Y=['j'], Z=['z'], ZH=['ʒ'])
RCOL = dict(AO='ɔːɹ', AA='ɑːɹ', EH='ɛɹ', IH='ɪɹ', UH='ʊɹ', OW='oːɹ', IY='ɪɹ')   # espeak 把「母音＋R」合成一個符號
VOW = {'AA', 'AE', 'AH', 'AO', 'AW', 'AY', 'EH', 'ER', 'EY', 'IH', 'IY', 'OW', 'OY', 'UH', 'UW'}
_m = {}

def _load():
    if _m: return _m
    import torch
    from transformers import Wav2Vec2ForCTC
    from huggingface_hub import hf_hub_download
    _m['vocab'] = json.load(open(hf_hub_download(MODEL, 'vocab.json'), encoding='utf-8'))
    _m['model'] = Wav2Vec2ForCTC.from_pretrained(MODEL).eval(); _m['torch'] = torch
    return _m

def word_phones(word):
    w = re.sub(r"[^a-z']", '', word.lower())
    if w in CMU: return list(CMU[w][0])
    if w.endswith("'s") and w[:-2] in CMU: return list(CMU[w[:-2]][0]) + ['Z']
    if w.endswith("'re") and w[:-3] in CMU: return list(CMU[w[:-3]][0]) + ['R']
    raise KeyError(f'no pronunciation for {word!r}; add it to EXTRA')

def load16k(path):
    out = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-f', 's16le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.int16).astype(np.float32)/32768

def emissions(audio):
    m = _load(); torch = m['torch']
    x = (audio - audio.mean())/(audio.std() + 1e-7)
    with torch.no_grad():
        lg = m['model'](torch.from_numpy(x)[None]).logits[0]
    return torch.log_softmax(lg, -1).numpy()

def units_for(text):
    """→ [(word, [arpabet…], [vocab ids])]；母音＋R、弱 AH＋L 併成一個對齊單位。"""
    v = _load()['vocab']; units = []
    for wi, word in enumerate(text.split()):
        if not re.search('[A-Za-z]', word): continue
        ph = word_phones(word); i = 0
        while i < len(ph):
            b = re.sub(r'\d', '', ph[i]); nxt = re.sub(r'\d', '', ph[i + 1]) if i + 1 < len(ph) else None
            cands = list(IPA[b]); group = [ph[i]]
            if b in RCOL and nxt == 'R':
                cands += [RCOL[b], 'ɹ']; group.append(ph[i + 1]); i += 1
            elif ph[i] == 'AH0' and nxt == 'L':
                cands += ['əl', 'l']; group.append(ph[i + 1]); i += 1
            ids = [v[c] for c in cands if c in v]
            units.append(((wi, word), group, ids)); i += 1
    return units

def viterbi(em, units, blank=0):
    T = em.shape[0]; S = 2*len(units) + 1; NEG = -1e9
    e = np.full((T, S), NEG, np.float32)
    e[:, 0::2] = em[:, blank][:, None]
    for k, (_, _, ids) in enumerate(units): e[:, 2*k + 1] = em[:, ids].max(1)
    dp = np.full((T, S), NEG, np.float32); bp = np.zeros((T, S), np.int8)
    dp[0, 0] = e[0, 0]; dp[0, 1] = e[0, 1]
    for t in range(1, T):
        stay = dp[t - 1]; s1 = np.concatenate(([NEG], dp[t - 1, :-1])); s2 = np.concatenate(([NEG, NEG], dp[t - 1, :-2]))
        s2[0::2] = NEG                                   # 只有音素狀態可以跳過中間的 blank
        st = np.stack([stay, s1, s2]); bp[t] = st.argmax(0); dp[t] = st.max(0) + e[t]
    s = S - 1 if dp[T - 1, S - 1] >= dp[T - 1, S - 2] else S - 2
    path = np.zeros(T, np.int32)
    for t in range(T - 1, -1, -1):
        path[t] = s; s -= bp[t, s]
    return path

def align(wav, text):
    audio = load16k(wav); em = emissions(audio); units = units_for(text); path = viterbi(em, units)
    hop = len(audio)/SR/em.shape[0]
    n = int(SR*hop); rms = np.array([np.sqrt(np.mean(audio[i*n:(i + 1)*n]**2) + 1e-12) for i in range(em.shape[0])]); rms /= np.percentile(rms, 95)
    starts = []
    for k in range(len(units)):
        fr = np.where(path == 2*k + 1)[0]; starts.append((fr[0], fr[-1]))
    out = []
    for k, ((wi, word), group, _) in enumerate(units):
        f0, f1 = starts[k]
        nxt = starts[k + 1][0] if k + 1 < len(units) else em.shape[0]
        end = nxt
        if (nxt - f1)*hop > 0.12:                         # 後面是停頓：用音量找這個音真正結束的地方
            end = f1 + 1
            while end < nxt and rms[end] > 0.08: end += 1
        t0, t1 = f0*hop, end*hop
        if len(group) == 1: out.append(dict(word=word, wi=wi, phone=group[0], t0=t0, t1=t1))
        else:
            k0 = 0.62 if group[1] == 'R' else 0.55
            mid = t0 + (t1 - t0)*k0
            out.append(dict(word=word, wi=wi, phone=group[0], t0=t0, t1=mid)); out.append(dict(word=word, wi=wi, phone=group[1], t0=mid, t1=t1))
    return out

if __name__ == '__main__':
    import sys
    for p in align(sys.argv[1], sys.argv[2]): print(f"{p['t0']:.2f}-{p['t1']:.2f}  {p['phone']:4s} {p['word']}")
