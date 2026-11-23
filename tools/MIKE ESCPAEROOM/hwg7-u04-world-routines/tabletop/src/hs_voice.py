"""he/she films: voice lines with word timings (edge-tts word boundaries) -> tabletop/audio/hs_<station>_<key>.mp3 + hs_<station>_words.json
  python tabletop/src/hs_voice.py japan
Anchor (asks, off screen) = Jenny, the website's question voice; reporter (answers, off screen) = Ana; both -12 %.
(Taiwan was made with taiwan_getup_voice.py, same voices.)"""
import asyncio, json, sys
from pathlib import Path
import edge_tts
out = Path(__file__).resolve().parents[1] / 'audio'
ANCHOR, REPORTER = ('en-US-JennyNeural', '+0Hz', '-12%'), ('en-US-AnaNeural', '+0Hz', '-12%')
LINES = {
    'japan': {'q': ('This is Haruto. What time does he take a shower?',) + ANCHOR,
              'a': ('He takes a shower at eight twenty.',) + REPORTER,
              'wash': ('First, he washes in the shower.',) + REPORTER,
              'bath': ("Then he sits in the hot bath. It's called ofuro.",) + REPORTER,
              'bed': ("He goes to bed at nine o'clock.",) + REPORTER},
    'usa': {'q': ('This is Emma. What time does she have lunch?',) + ANCHOR,
            'a': ('She has lunch at eleven thirty.',) + REPORTER,
            'cafe': ('She eats lunch in the school cafeteria.',) + REPORTER,
            'food': ('She has a sandwich, an apple and milk.',) + REPORTER,
            'min': ('Lunch is only twenty-five minutes!',) + REPORTER},
    'spain': {'q': ('This is Lucia. What time does she have lunch?',) + ANCHOR,
              'a': ("She has lunch at two o'clock.",) + REPORTER,
              'eat': ('Lunch is her big meal. She eats soup, fish and fruit with her family.',) + REPORTER,
              'rest': ('Then she rests for a while.',) + REPORTER},
    'uk': {'q': ('This is Oliver. What time does he go home?',) + ANCHOR,
           'a': ('He goes home at three fifteen.',) + REPORTER,
           'ends': ('School ends at three fifteen.',) + REPORTER,
           'dad': ('His dad walks him home.',) + REPORTER,
           'snack': ('He has a snack, and then he does his homework.',) + REPORTER},
    'kenya': {'q': ('This is Amani. What time does she have dinner?',) + ANCHOR,
              'a': ('She has dinner at seven thirty.',) + REPORTER,
              'fam': ('Her family eats dinner together.',) + REPORTER,
              'eat': ('She eats ugali and sukuma wiki.',) + REPORTER,
              'flour': ('Ugali is made from white corn flour.',) + REPORTER},
    'india': {'q': ('This is Arjun. What time does he play cricket?',) + ANCHOR,
              'a': ("He plays cricket at five o'clock.",) + REPORTER,
              'friends': ('He plays cricket with his friends in the street.',) + REPORTER,
              'bag': ('A school bag is the wicket!',) + REPORTER,
              'home': ('He goes home at six thirty.',) + REPORTER},
    'singapore': {'q': ('This is Ling. What time does she study English?',) + ANCHOR,
                  'a': ("She studies English at four o'clock.",) + REPORTER,
                  'class': ('She goes to an English class after school.',) + REPORTER,
                  'read': ('She reads a story and writes new words.',) + REPORTER,
                  'home': ("She goes home at six o'clock.",) + REPORTER},
    'australia': {'q': ('This is Jack. What time does he do his homework?',) + ANCHOR,
                  'a': ('He does his homework at four forty-five.',) + REPORTER,
                  'soccer': ('He plays soccer after school.',) + REPORTER,
                  'table': ('Then he does his homework at the kitchen table.',) + REPORTER,
                  'twenty': ('It takes twenty minutes.',) + REPORTER},
}


async def main(station):
    words = {}
    for key, (text, voice, pitch, rate) in LINES[station].items():
        com = edge_tts.Communicate(text, voice, pitch=pitch, rate=rate, boundary='WordBoundary')
        ws = []
        with open(out / f'hs_{station}_{key}.mp3', 'wb') as fh:
            async for ch in com.stream():
                if ch['type'] == 'audio': fh.write(ch['data'])
                elif ch['type'] == 'WordBoundary': ws.append([ch['text'], round(ch['offset'] / 1e7, 3), round((ch['offset'] + ch['duration']) / 1e7, 3)])
        words[key] = {'text': text, 'words': ws}
        print(key, round(ws[-1][2], 2) if ws else '-', text)
    (out / f'hs_{station}_words.json').write_text(json.dumps(words, ensure_ascii=False, indent=1), encoding='utf-8')
asyncio.run(main(sys.argv[1]))
