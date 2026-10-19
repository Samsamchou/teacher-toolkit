"""commons_lookup.py — 查維基共享資源 IPA 發音錄音的檔案資訊與授權（只讀 metadata，不下載音檔）。輸出 candidates.json。"""
import json, urllib.request, urllib.parse, pathlib, re
HERE = pathlib.Path(__file__).resolve().parent
UA = {'User-Agent': 'teacher-toolkit-phonics/1.0 (classroom video; contact via GitHub Samsamchou)'}
WANT = [  # (自然發音標記, IPA, 例字, Commons 檔名)
 ('short a', 'æ', 'Saturday', 'Near-open front unrounded vowel.ogg'),
 ('short e', 'ɛ', 'Wednesday', 'Open-mid front unrounded vowel.ogg'),
 ('short i', 'ɪ', 'it', 'Near-close near-front unrounded vowel.ogg'),
 ('short o', 'ɑ', 'hot', 'Open back unrounded vowel.ogg'),
 ('short u / o', 'ʌ', 'Sunday, Monday', 'Open-mid back unrounded vowel.ogg'),
 ('schwa', 'ə', 'about', 'Mid-central vowel.ogg'),
 ('long e / ee', 'i', 'see', 'Close front unrounded vowel.ogg'),
 ('oo / ue', 'u', 'Tuesday', 'Close back rounded vowel.ogg'),
 ('short oo', 'ʊ', 'book', 'Near-close near-back rounded vowel.ogg'),
 ('aw', 'ɔ', 'saw', 'Open-mid back rounded vowel.ogg'),
 ('ur / er / ir', 'ɝ', 'Thursday, Saturday', 'Open-mid central unrounded vowel.ogg'),
 ('long a / ay (start)', 'e', 'day', 'Close-mid front unrounded vowel.ogg'),
 ('long o (start)', 'o', 'go', 'Close-mid back rounded vowel.ogg'),
 ('long i (start)', 'a', 'Friday', 'Open front unrounded vowel.ogg'),
 ('sh', 'ʃ', 'she', 'Voiceless palato-alveolar sibilant.ogg'),
 ('ch', 'tʃ', 'chair', 'Voiceless palato-alveolar affricate.ogg'),
 ('th (voiceless)', 'θ', 'Thursday', 'Voiceless dental fricative.ogg'),
 ('th (voiced)', 'ð', 'the', 'Voiced dental fricative.ogg'),
 ('ng', 'ŋ', 'sing', 'Velar nasal.ogg'),
 ('wh', 'ʍ', 'what', 'Voiceless labial-velar fricative.ogg'),
 ('w', 'w', 'Wednesday', 'Voiced labial-velar approximant.ogg'),
 ('ph / f', 'f', 'phone, Friday', 'Voiceless labiodental fricative.ogg'),
 ('ck / k', 'k', 'duck', 'Voiceless velar plosive.ogg'),
 ('s', 's', 'Sunday', 'Voiceless alveolar sibilant.ogg'),
 ('r', 'ɹ', 'Friday', 'Alveolar approximant.ogg'),
]
# 雙母音／r 控制：另外搜尋
SEARCH = ['diphthong eɪ audio', 'En-us-day.ogg', 'Diphthong ai English ogg', 'Rhotic vowel ɝ ogg', 'En-us-Sunday.ogg', 'En-us-Monday.ogg', 'En-us-Tuesday.ogg', 'En-us-Wednesday.ogg', 'En-us-Thursday.ogg', 'En-us-Friday.ogg', 'En-us-Saturday.ogg']
def api(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json'})
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30))
def info(title):
    r = api({'action': 'query', 'titles': 'File:' + title, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata|mime'})
    pg = next(iter(r['query']['pages'].values()))
    if 'imageinfo' not in pg: return None
    ii = pg['imageinfo'][0]; m = ii.get('extmetadata', {})
    g = lambda k: re.sub('<[^>]+>', '', m.get(k, {}).get('value', '')).strip()
    return {'file': title, 'url': ii['url'], 'page': ii.get('descriptionurl'), 'bytes': ii['size'], 'mime': ii.get('mime'),
            'license': g('LicenseShortName'), 'artist': g('Artist')[:120], 'attribution_required': g('AttributionRequired')}
import time
def batch_info(titles):
    res = {}
    for k in range(0, len(titles), 40):
        r = api({'action': 'query', 'titles': '|'.join('File:' + t for t in titles[k:k + 40]), 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata|mime'})
        norm = {n['to']: n['from'] for n in r['query'].get('normalized', [])}
        for pg in r['query']['pages'].values():
            t = norm.get(pg['title'], pg['title'])[5:]
            if 'imageinfo' not in pg: continue
            ii = pg['imageinfo'][0]; m = ii.get('extmetadata', {})
            g = lambda key: re.sub('<[^>]+>', '', m.get(key, {}).get('value', '')).strip()
            res[t] = {'file': t, 'url': ii['url'], 'page': ii.get('descriptionurl'), 'bytes': ii['size'], 'mime': ii.get('mime'),
                      'license': g('LicenseShortName'), 'artist': g('Artist')[:120], 'attribution_required': g('AttributionRequired')}
        time.sleep(2)
    return res
words = [q for q in SEARCH if q.endswith('.ogg')]
I = batch_info([w[3] for w in WANT] + words)
out = [{'tag': tag, 'ipa': ipa, 'example': ex, **I.get(f, {'file': f, 'missing': True})} for tag, ipa, ex, f in WANT]
out += [{'tag': 'word', **I.get(q, {'file': q, 'missing': True})} for q in words]
for q in [q for q in SEARCH if not q.endswith('.ogg')]:
    time.sleep(2)
    r = api({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srsearch': q, 'srlimit': 6})
    out.append({'tag': 'search', 'query': q, 'hits': [h['title'] for h in r['query']['search']]})
(HERE / 'candidates.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
for o in out:
    if 'hits' in o: print('SEARCH', o['query'], o['hits'])
    else: print(o['tag'], '|', o.get('ipa', ''), '|', o['file'], '|', 'MISSING' if o.get('missing') else f"{o['bytes']}B {o['license']} | {o['artist'][:40]}")
