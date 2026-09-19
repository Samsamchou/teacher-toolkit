from pathlib import Path
import json,hashlib
out=Path('public/plinkoh/cards')
def text(x,y,t,size=30,color='#321451'):
 return f'<text x="{x}" y="{y}" text-anchor="middle" font-family="Trebuchet MS,Arial,sans-serif" font-size="{size}" font-weight="900" fill="{color}">{t}</text>'
def ball(x,y,r=26):
 return f'''<g transform="translate({x} {y}) scale({r/44})"><ellipse cy="46" rx="35" ry="7" fill="#241147" opacity=".16"/><circle r="44" fill="url(#ball)" stroke="#4a155c" stroke-width="3"/><g fill="#ffc9e6"><path d="M-16-4C-38-16-24-30-16-20C-8-30 6-16-16-4Z"/><path d="M18 19C-4 7 10-7 18 3C26-7 40 7 18 19Z"/><path d="M-14 34C-30 24-21 14-14 21C-7 14 3 24-14 34Z"/></g><ellipse cx="-19" cy="-27" rx="9" ry="15" transform="rotate(35 -19 -27)" fill="white" opacity=".8"/></g>'''
def peg(x,y):
 return f'<circle cx="{x}" cy="{y+4}" r="14" fill="#321b78" opacity=".3"/><circle cx="{x}" cy="{y}" r="13" fill="url(#peg)" stroke="#5b2b9d" stroke-width="3"/><circle cx="{x-4}" cy="{y-4}" r="4" fill="#deb3ff"/>'
def arrow(x,y,w=34,color='#532784'):
 return f'<path d="M{x} {y}h{w-10}m-10-9 10 9-10 9" fill="none" stroke="{color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'
def badge(x,y,w,t,color='#fff',size=34):
 return f'<rect x="{x-w/2}" y="{y-35}" width="{w}" height="48" rx="13" fill="{color}" stroke="#623a91" stroke-width="2"/>'+text(x,y,t,size)
def slot(x,y,value,color='#ffc62f',w=94):
 return f'<path d="M{x-w/2} {y}l12-13h{w-24}l12 13" fill="#fffacb" stroke="#4b2370" stroke-width="3"/><rect x="{x-w/2}" y="{y}" width="{w}" height="46" rx="5" fill="{color}" stroke="#4b2370" stroke-width="4"/>'+text(x,y+34,value,33)
def board():
 return '<rect x="28" y="19" width="264" height="127" rx="17" fill="url(#board)" stroke="#9b70db" stroke-width="4"/>'
def crown(x,y):
 return f'<path d="M{x-22} {y}l-5-25 17 12 10-21 10 21 17-12-5 25Z" fill="#ffd536" stroke="#946117" stroke-width="3"/><path d="M{x-22} {y+5}h44" stroke="#946117" stroke-width="4"/>'
scenes={}
scenes['double-pegs']=board()+''.join(peg(x,y) for x,y in [(67,64),(160,93),(251,64),(95,125),(225,125)])+ball(133,52,25)+'<path d="m145 73 7 9m20-17-4 13m19 6-12 1" stroke="#fff352" stroke-width="5" stroke-linecap="round"/>'+badge(79,195,84,'+1')+arrow(131,180,48)+badge(238,195,98,'+2','#ffe33e',43)
scenes['double-slot']=board()+''.join(peg(x,49) for x in [75,160,245])+ball(160,85,22)+'<path d="M160 109v12m-7-6 7 8 7-8" stroke="white" stroke-width="4" fill="none"/>'+slot(160,120,'20','#ffcb27')+badge(64,209,74,'20',size=30)+arrow(111,194,37)+badge(206,209,95,'40','#fff06b',37)+'<path d="m271 182 3 7 8 1-6 5 1 8-6-4-7 4 2-8-6-5 8-1Z" fill="#c18315"/>'
scenes['bonus-10']='<rect x="25" y="28" width="270" height="158" rx="19" fill="#ffedaf"/>'+ball(74,90,36)+'<path d="M115 80q54-45 109 5" fill="none" stroke="#e4a932" stroke-width="8" stroke-dasharray="9 8"/>'+arrow(227,88,26,'#b27513')+'<g transform="rotate(-9 202 70)"><rect x="146" y="27" width="112" height="68" rx="13" fill="#ffe02e" stroke="#a46a13" stroke-width="4"/>'+text(202,75,'+10',44)+'</g>'+badge(89,190,85,'30')+arrow(143,173,46)+badge(246,190,86,'40','#fff06b',42)
scenes['second-chance']='<rect x="22" y="30" width="122" height="175" rx="20" fill="#efe5f6"/><rect x="173" y="30" width="125" height="175" rx="20" fill="#fff0a5" stroke="#dea51c" stroke-width="3"/>'+text(43,55,'1',22)+text(194,55,'2',22)+ball(81,96,28)+ball(235,96,28)+badge(81,172,86,'30',size=34)+badge(235,172,86,'50','#ffdc32',43)+crown(235,39)+f'<path d="m251 185 8 8 16-18" stroke="#21864a" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'+arrow(142,156,30)
scenes['big-ball']='<rect x="22" y="22" width="276" height="181" rx="20" fill="#e4efff"/><path d="M36 150h247" stroke="#94a9cb" stroke-width="3" stroke-dasharray="7 6"/>'+ball(78,117,30)+ball(232,105,42)+arrow(129,101,55)+badge(78,192,73,'1×',size=29)+badge(232,192,96,'1.4×','#ffef7e',34)+'<path d="M177 64h9V55m91 0v9h9M177 142h9v9m91 0v-9h9" fill="none" stroke="#3868b9" stroke-width="3"/>'
scenes['safe-landing']='<rect x="22" y="24" width="276" height="180" rx="20" fill="#e8f5d6"/>'+ball(78,74,28)+badge(78,154,79,'12',size=35)+arrow(128,135,52)+'<path d="m234 33 53 18v67q-4 39-53 64-49-25-53-64V51Z" fill="url(#shield)" stroke="#36693b" stroke-width="4"/><path d="m234 46 40 14v57q-3 28-40 49-37-21-40-49V60Z" fill="none" stroke="#d8f3a3" stroke-width="3"/>'+text(234,117,'20',49)+'<path d="M192 133h84" stroke="#fff" stroke-width="5"/>'+text(234,153,'MIN',15,'#fff')+'<path d="M38 193h247" stroke="#639247" stroke-width="5" stroke-linecap="round"/>'
titles={'double-pegs':'Peg points +1 become +2','double-slot':'Landing slot 20 becomes 40','bonus-10':'Add 10 to the score: 30 becomes 40','second-chance':'Drop ball 1 and ball 2; keep the higher 50-point result','big-ball':'The same ball grows from radius 1 to 1.4','safe-landing':'A 12-point score becomes the minimum 20 points'}
manifest=[]
for id,scene in scenes.items():
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 230" role="img" aria-labelledby="title"><title id="title">{titles[id]}</title><defs><radialGradient id="ball" cx="30%" cy="20%" r="80%"><stop stop-color="#ffb0d5"/><stop offset=".4" stop-color="#ec4284"/><stop offset="1" stop-color="#672063"/></radialGradient><radialGradient id="peg" cx="30%" cy="20%"><stop stop-color="#c299f5"/><stop offset="1" stop-color="#8255d5"/></radialGradient><linearGradient id="board" x2="0" y2="1"><stop stop-color="#94c6ff"/><stop offset="1" stop-color="#579cf4"/></linearGradient><linearGradient id="shield" x2="1" y2="1"><stop stop-color="#9bce55"/><stop offset="1" stop-color="#398946"/></linearGradient></defs>{scene}</svg>'''
 path=out/f'{id}.svg';path.write_text(svg,encoding='utf-8');manifest.append({'id':id,'url':f'/plinkoh/cards/{id}.svg','description':titles[id],'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
(out/'manifest.json').write_text(json.dumps({'format':'hand-authored-svg','version':'2026.09.19-card-art.1','cards':manifest},indent=2)+'\n',encoding='utf-8')
p=Path('src/PlinkOhGame.jsx');s=p.read_text(encoding='utf-8');a=s.index('function CardArt(');b=s.index('function Logo()',a);s=s[:a]+'''function CardArt({card}){return <img className="po-card-art" src={`/plinkoh/cards/${card.id}.svg`} alt="" draggable="false"/>}
'''+s[b:];p.write_text(s,encoding='utf-8')
print('Saved six illustrated SVG cards and integrated CardArt.')
