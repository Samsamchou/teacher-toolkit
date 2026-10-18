# -*- coding: utf-8 -*-
"""Build the HWG7 U01+U02 story + question bank (single source of truth).

Copied from the HWG5 template (english-mission-quest-builder skill) and rewritten for
"Ken and the World Map Mix-Up". Checks run against content/bank.json, which
parse_question_bank.py made from the teacher's docx.

Outputs (next to this script):
  question-bank.v0.1.json   data for the website / Godot bridge
  STORY-題庫審閱-v0.1.md     teacher review sheet (generated, do not hand-edit)

Run:  python -I build_content.py      (exits non-zero if any check fails)
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
BANK = HERE / "bank.json"
PLAN = HERE / "battle-plan.json"
VERSION = "0.1"
LAST_SEG = "SEG-06"
# teacher decision 2026-10-18: spell "the USA" in lower case, same as the sentences
SPELL_OVERRIDE = {"The USA": "the USA"}

# ---------------------------------------------------------------- story
# English only, A1, 4-10 words per sentence. gloss = 英中對照 shown under the passage.
STORY = {
    "SEG-01": dict(image="story/STORY-01-prologue.png", title="World Friends Day", lines=[
        "Today is World Friends Day at Sunny Hill School.",
        "Colorful flags hang in the big hall.",
        "Seven new friends are coming to visit.",
        "Suddenly, a paper dragon flies into the hall!",
        "It is Map Gobbler!",
        "It eats the big world map.",
        "Now the map is blank!",
        "Tick flies to Ken.",
        "\"Let's meet the new friends first!\"",
    ], gloss=[("World Friends Day", "世界朋友日"), ("flag", "旗子"), ("hall", "大廳"),
              ("visit", "拜訪"), ("dragon", "龍"), ("world map", "世界地圖"), ("blank", "空白的")]),
    "SEG-02": dict(image="story/STORY-02-welcome.png", title="New Friends", lines=[
        "More friends come into the hall.",
        "A boy holds a postcard of a big mountain.",
        "A girl has a big pan of rice.",
        "\"Welcome to our school!\" says Ken.",
        "Tick wants to fill the map again.",
    ], gloss=[("postcard", "明信片"), ("mountain", "山"), ("pan", "平底鍋"),
              ("rice", "米飯"), ("welcome", "歡迎"), ("fill", "填滿")]),
    "SEG-03": dict(image="story/STORY-03-mapwall.png", title="The Map Wall", lines=[
        "Ken and Tick run to the map wall.",
        "The map has seven empty holes.",
        "Five more friends wait by the wall.",
        "Tom is Ken's friend from class.",
        "Wei, Mina, Lynn and Alan are new.",
        "\"Let's put the pins back!\" says Tick.",
    ], gloss=[("wall", "牆"), ("empty", "空的"), ("hole", "洞"),
              ("wait", "等待"), ("pin", "徽章別針")]),
    "SEG-04": dict(image="story/STORY-04-routes.png", title="The Route Station", lines=[
        "Six pins shine on the map now.",
        "But Map Gobbler eats the route tickets!",
        "Now nobody can go to school.",
        "Ken and Tick run to the route station.",
        "Glowing paths go to every street.",
        "\"Let's fix the routes!\" says Tick.",
    ], gloss=[("shine", "發光"), ("route", "路線"), ("ticket", "票"),
              ("nobody", "沒有人"), ("station", "站"), ("path", "小路"), ("street", "街道")]),
    "SEG-05": dict(image="story/STORY-05-echomap.png", title="The Echo Map", lines=[
        "All the routes glow again!",
        "Map Gobbler is very angry.",
        "It flies into the Map Hall.",
        "Magic map frames float in the air.",
        "\"Answer my echoes!\" shouts Map Gobbler.",
        "\"I can do it!\" says Ken.",
    ], gloss=[("glow", "發光"), ("angry", "生氣的"), ("frame", "框"),
              ("float", "漂浮"), ("echo", "回聲"), ("shout", "大喊")]),
    "SEG-06": dict(image="story/STORY-06-ending.png", title="The World Map Shines", lines=[
        "Ken puts the seven pins on the map.",
        "The world map shines again!",
        "All the routes come back, too.",
        "Map Gobbler is small and calm now.",
        "It folds a new map for everyone.",
        "\"Thank you, Ken!\" says Tick.",
        "Happy World Friends Day!",
    ], gloss=[("come back", "回來"), ("calm", "平靜的"), ("fold", "摺"), ("everyone", "每個人")]),
}

# ---------------------------------------------------------------- narration TTS (same spec as HWG5)
# Static MP3 made offline by generate_narration_tts.mjs; the API key never reaches the browser.
# speed 0.8 is applied by the API; the web player keeps playbackRate 1.0 (no double slow-down).
TTS = dict(provider="openai", model="gpt-4o-mini-tts", voice="marin", speed=0.8, format="mp3",
           accent="American English", disclosure="English audio is AI-generated, not a human recording.")

# ---------------------------------------------------------------- battles (every 3 items; seconds = battle-plan.json)
BATTLES = [
    dict(id="B01", after=3, arena="Welcome Hall", arenaZh="歡迎大廳", seconds=20,
         intro="Paper Scraps fly out of the blank map!", rewards=["Australia Pin", "Boomerang"]),
    dict(id="B02", after=6, arena="Japanese Garden", arenaZh="日式庭園", seconds=21,
         intro="Paper Cranes fly over the garden!", rewards=["Japan Pin", "Spain Pin", "Paper Fan"]),
    dict(id="B03", after=9, arena="Night Market", arenaZh="夜市", seconds=23,
         intro="Tag Imps hop between the lanterns!", rewards=["Taiwan Pin", "Bubble Tea"]),
    dict(id="B04", after=12, arena="Garden City", arenaZh="花園城市", seconds=24,
         intro="Paper Planes zoom over the fountain!", rewards=["Singapore Pin", "UK Pin", "Merlion Splash"]),
    dict(id="B05", after=15, arena="City Crosswalk", arenaZh="城市斑馬線", seconds=26,
         intro="Rolling Suitcases race across the street!", rewards=["USA Pin", "Running Shoes"]),
    dict(id="B06", after=18, arena="Bus Station", arenaZh="公車站", seconds=27,
         intro="Tag Imps and suitcases fill the stop!", rewards=["Bus Pass Shield"]),
    dict(id="B07", after=21, arena="Rainy Street", arenaZh="雨天街道", seconds=29,
         intro="Umbrella Imps and Puddle Frogs jump in the rain!", rewards=["Rain Umbrella"]),
    dict(id="B08", after=24, arena="Metro Station", arenaZh="捷運站", seconds=30,
         intro="Token Imps roll along the platform!", rewards=["Metro Map"]),
    dict(id="B09", after=27, arena="Map Hall", arenaZh="地圖大廳", seconds=67, boss=True, phase=1,
         intro="Map Gobbler raises its paper shield!", rewards=["Echo Map Piece"]),
    dict(id="B10", after=28, arena="Map Hall", arenaZh="地圖大廳", seconds=67, boss=True, phase=2,
         intro="Map Gobbler spreads its glowing wings! Stay strong, Ken!", rewards=["World Map Restored"]),
]

# ---------------------------------------------------------------- items
# lines: (speaker, text) with {1},{2},{3} blanks. No week strip / clock in this mission.
H_RED = "Look at the red circle. What is in it?"
def drag(seg, bid, img, ctx, lines, answers, distractors, hint1, hint2, correct, extra=None):
    d = dict(type="drag", segment=seg, bankId=bid, image=img, weekStrip=None, contextEn=ctx,
             lines=[dict(speaker=s, text=t) for s, t in lines],
             blanks=[dict(id=i + 1, answer=a) for i, a in enumerate(answers)],
             distractors=distractors, hint1En=hint1, hint2En=hint2, correctEn=correct)
    if extra: d.update(extra)
    return d
def spell(seg, img, ctx, answer, extra_letters, hint1, correct):
    return dict(type="spell", segment=seg, bankId="S:" + answer, image=img, weekStrip=None, contextEn=ctx,
                lines=[dict(speaker="Tick", text="Spell the word.")],
                spell=dict(answer=answer, distractorLetters=extra_letters,
                           groups=[len(w) for w in answer.split(" ")], caseSensitive=True),
                hint1En=hint1, hint2En=f"The first letter is {answer[0]}.", correctEn=correct)
ECHO = dict(mirrorFrame=True)   # replayed scene inside the echo-map frame (same CSS hook as HWG5's mirror)

ITEMS = [
    # ---- SEG-01 World Friends Day
    spell("SEG-01", "questions/Q01.png", "Tick shows Ken a picture.",
          "Australia", "ek", "Look at the kangaroo and the opera house.", "Australia. A-u-s-t-r-a-l-i-a."),
    drag("SEG-01", "D01", "questions/Q02.png", "This is Maya. She waves at Ken.",
         [("Ken", "Where {1} you from?"), ("Maya", "I'm from {2}.")], ["are", "Australia"],
         ["is", "am", "India"], "Look at the poster behind Maya.", "Ask with you: are or is? The kangaroo is a clue.",
         "I'm from Australia. Maya is from Australia."),
    spell("SEG-01", "questions/Q03.png", "Tick shows Ken a new picture.",
          "Japan", "eo", "Look at the big mountain and the sushi.", "Japan. J-a-p-a-n."),
    # ---- SEG-02 New Friends
    drag("SEG-02", "D02", "questions/Q04.png", "Andy has a postcard and a lunch box.",
         [("Maya", "Where {1} Andy from?"), ("Ken", "He is from {2}.")], ["is", "Japan"],
         ["are", "am", "Australia"], "Look at Andy's postcard and lunch box.", "Andy is one boy: is or are?",
         "He is from Japan. Andy is from Japan."),
    spell("SEG-02", "questions/Q05.png", "Look at the big pan and the church.",
          "Spain", "ro", "Look at the flag and the big pan of rice.", "Spain. S-p-a-i-n."),
    drag("SEG-02", "D03", "questions/Q06.png", "This is Amy. She shows Ken her food.",
         [("Ken", "Where {1} Amy {2}?"), ("Maya", "She is from {3}.")], ["is", "from", "Spain"],
         ["are", "to", "Japan"], "Look at the flag next to Amy.", "Where is ... from? Amy is one girl.",
         "She is from Spain. Amy is from Spain."),
    # ---- SEG-03 The Map Wall
    spell("SEG-03", "questions/Q07.png", "Look at the tall tower and the drink.",
          "Taiwan", "eo", "Look at the tall tower and the bubble tea.", "Taiwan. T-a-i-w-a-n."),
    drag("SEG-03", "D06", "questions/Q08.png", "Ken points at Tom. Tom smiles.",
         [("Mina", "Is he from {1}?"), ("Ken", "Yes, he {2}.")], ["Taiwan", "is"],
         ["Japan", "are", "isn't"], "Look at the tower and the drink behind Tom.", "Tom nods. That means yes.",
         "Yes, he is. Tom is from Taiwan."),
    spell("SEG-03", "questions/Q09.png", "Look at the lion and the water.",
          "Singapore", "lu", "Look at the lion statue with water.", "Singapore. S-i-n-g-a-p-o-r-e."),
    drag("SEG-03", "D05", "questions/Q10.png", "This is Wei. He stands by a lion statue.",
         [("Tom", "{1} he from Taiwan?"), ("Ken", "No, he {2}. He's from {3}.")], ["Is", "isn't", "Singapore"],
         ["Are", "is", "Japan"], H_RED, "He: is or isn't? Then find the lion.",
         "No, he isn't. Wei is from Singapore."),
    drag("SEG-03", "D04", "questions/Q11.png", "This is Mina. She has a postcard.",
         [("Wei", "{1} she from India?"), ("Ken", "No, she {2}. She's from {3}.")], ["Is", "isn't", "the UK"],
         ["Are", "is", "Spain"], "Look at the red circle and the postcard.", "She: is or isn't? Look at the big clock tower.",
         "No, she isn't. Mina is from the UK."),
    spell("SEG-03", "questions/Q12.png", "Look at the big statue and the flag.",
          "the USA", "kr", "Look at the statue and the flag with stars.", "The USA. T-h-e U-S-A."),
    drag("SEG-03", "D07", "questions/Q13.png", "This is Lynn. This is Alan.",
         [("Mina", "Are they from {1}?"), ("Ken", "No, they {2}.")], ["the USA", "aren't"],
         ["Japan", "isn't", "are"], H_RED, "They: are or aren't?",
         "No, they aren't. Lynn and Alan aren't from the USA."),
    # ---- SEG-04 The Route Station
    spell("SEG-04", "questions/Q14.png", "Someone walks to the school gate.",
          "on foot", "ea", "Look at the shoes and the footprints.", "On foot. O-n f-o-o-t."),
    drag("SEG-04", "D10", "questions/Q15.png", "Ken walks to school with his bag.",
         [("Tick", "{1} {2} you go to school?"), ("Ken", "I go to school {3}.")], ["How", "do", "on foot"],
         ["Where", "does", "goes"], "Look at Ken's feet.", "Ask about the way: Where or How? You: do or does?",
         "I go to school on foot. Ken walks to school."),
    spell("SEG-04", "questions/Q16.png", "Look at the yellow car.",
          "by taxi", "eo", "Look at the yellow car. People pay to ride it.", "By taxi. B-y t-a-x-i."),
    drag("SEG-04", "D11", "questions/Q17.png", "Lynn gets out of a yellow car.",
         [("Ken", "{1} does Lynn go to school?"), ("Tick", "She {2} to school {3}.")], ["How", "goes", "by taxi"],
         ["Where", "go", "on foot"], "Look at Lynn and the yellow car.", "Lynn is she: go or goes?",
         "She goes to school by taxi."),
    spell("SEG-04", "questions/Q18.png", "Many people wait at the stop.",
          "by bus", "ae", "Look at the long car and the stop.", "By bus. B-y b-u-s."),
    drag("SEG-04", "D12", "questions/Q19.png", "Alan sits by the window. He smiles.",
         [("Lynn", "{1} Alan go to school {2}?"), ("Ken", "Yes, he {3}.")], ["Does", "by bus", "does"],
         ["Do", "by taxi", "is"], "Look at the window. What is Alan in?", "Alan is he: Do or Does?",
         "Yes, he does. Alan goes to school by bus."),
    spell("SEG-04", "questions/Q20.png", "Look at the two helmets.",
          "by scooter", "ai", "Look at the small bike with a motor.", "By scooter. B-y s-c-o-o-t-e-r."),
    drag("SEG-04", "D13", "questions/Q21.png", "Amy rides with her dad.",
         [("Maya", "{1} Amy go to school by car?"), ("Ken", "No, she {2}. She goes to school {3}.")],
         ["Does", "doesn't", "by scooter"], ["Do", "don't", "by bus"], H_RED, "Amy is she: Does and doesn't, or Do and don't?",
         "No, she doesn't. Amy goes to school by scooter."),
    spell("SEG-04", "questions/Q22.png", "A train comes under the city.",
          "by metro", "ai", "Look at the station under the ground.", "By metro. B-y m-e-t-r-o."),
    drag("SEG-04", "D14", "questions/Q23.png", "Wei walks to the ticket gate.",
         [("Tom", "Do you go to school {1}?"), ("Wei", "No, I {2}. I go to school {3}.")],
         ["by train", "don't", "by metro"], ["by taxi", "doesn't", "on foot"], H_RED, "I: don't or doesn't? Look at the gate.",
         "No, I don't. Wei goes to school by metro."),
    drag("SEG-04", "D15", "questions/Q24.png", "Andy crosses the river to school.",
         [("Maya", "Does he go to school {1}?"), ("Ken", "No, he {2}. He goes to school {3}.")],
         ["by car", "doesn't", "by boat"], ["by bus", "don't", "by metro"], "Look at the red circle and the water.",
         "He: don't or doesn't? What is on the water?", "No, he doesn't. Andy goes to school by boat."),
    # ---- SEG-05 The Echo Map (replays #11, #13, #21 inside the echo frame)
    drag("SEG-05", "D08", "questions/Q11.png", "The echo map shows Mina again.",
         [("Wei", "{1}"), ("Ken", "No, she isn't. She's from the UK.")], ["Is she from India?"],
         ["Is he from India?", "Are they from India?", "Is she from the UK?"], H_RED,
         "Mina is she. The answer says no.", "Is she from India? No, she isn't.", extra=ECHO),
    drag("SEG-05", "D09", "questions/Q13.png", "The echo map shows Lynn and Alan.",
         [("Mina", "Are they from the USA?"), ("Ken", "{1}")], ["No, they aren't."],
         ["Yes, they are.", "No, she isn't.", "No, he isn't."], H_RED, "They: are or aren't?",
         "No, they aren't. They aren't from the USA.", extra=ECHO),
    drag("SEG-05", "D16", "questions/Q27.png", "The echo map shows Maya on her bike.",
         [("Ken", "{1}"), ("Maya", "I go to school by bike.")], ["How do you go to school?"],
         ["How does she go to school?", "Where are you from?", "Do you go to school by bike?"],
         "Look at Maya's answer.", "Maya says I. Ask with How and you.",
         "How do you go to school? Maya goes to school by bike."),
    drag("SEG-05", "D17", "questions/Q21.png", "The last echo shows Amy and her dad.",
         [("Ken", "{1}"), ("Maya", "No, she doesn't. She goes to school by scooter.")], ["Does Amy go to school by car?"],
         ["Does Amy go to school by scooter?", "Does Andy go to school by car?", "Is Amy from Spain?"], H_RED,
         "The answer says she doesn't. What is in the red circle?", "Does Amy go to school by car? No, she doesn't.",
         extra=ECHO),
]

# ---------------------------------------------------------------- checks
FUNCTION_WORDS = {"is", "isn't", "are", "aren't", "from", "do", "does", "don't", "doesn't", "goes", "how",
                  "Is", "Are", "Do", "Does", "How"}

def load_bank():
    b = json.loads(BANK.read_text(encoding="utf-8"))
    spells = [SPELL_OVERRIDE.get(s, s) for s in b["spelling"]]
    rows = {d["id"]: d for d in b["drag"]}
    return spells, rows

def words(s): return re.findall(r"[A-Za-z0-9:'’]+", s)

def run_checks():
    errs = []
    spells, rows = load_bank()
    sp = [i for i in ITEMS if i["type"] == "spell"]; dr = [i for i in ITEMS if i["type"] == "drag"]
    if len(ITEMS) != len(spells) + len(rows): errs.append(f"item count {len(ITEMS)} != bank {len(spells) + len(rows)}")
    if len(sp) != len(spells) or len(dr) != len(rows): errs.append(f"spell {len(sp)} drag {len(dr)}")
    if sorted(i["spell"]["answer"] for i in sp) != sorted(spells): errs.append(f"spell words differ from bank: {spells}")
    if sorted(i["bankId"] for i in dr) != sorted(rows): errs.append("drag ids differ from bank")
    for it in dr:
        r = rows[it["bankId"]]
        mine = [b["answer"] for b in it["blanks"]]
        if mine != r["blanks"]: errs.append(f"{it['bankId']} answers {mine} != bank bold {r['blanks']}")
        full = " ".join(l["text"] for l in it["lines"])
        for b in it["blanks"]: full = full.replace("{%d}" % b["id"], b["answer"])
        src = r["question"] + " " + r["answer"]
        if re.sub(r"\s+", " ", full) != re.sub(r"\s+", " ", src).strip():
            errs.append(f"{it['bankId']} sentence '{full}' != bank '{src}'")
        if len(it["distractors"]) < 2: errs.append(f"{it['bankId']} <2 distractors")
        if set(it["distractors"]) & set(mine): errs.append(f"{it['bankId']} distractor equals answer")
        if len(set(it["distractors"])) != len(it["distractors"]): errs.append(f"{it['bankId']} duplicate distractor")
    for i in sp:
        a = i["spell"]["answer"]
        if set(i["spell"]["distractorLetters"]) & set(a.replace(" ", "").lower()):
            errs.append(f"spell {a}: distractor letter also in the word")
    # every image exists
    img_root = HERE.parent / "assets" / "imagegen"
    for k, s in STORY.items():
        if not (img_root / s["image"]).exists(): errs.append(f"{k} missing image {s['image']}")
    for n_, it in enumerate(ITEMS, 1):
        if not (img_root / it["image"]).exists(): errs.append(f"#{n_} missing image {it['image']}")
    # sentence length (<=10 words) for story + contexts
    for k, s in STORY.items():
        for line in s["lines"]:
            if len(words(line)) > 10: errs.append(f"{k} too long ({len(words(line))}): {line}")
    for n_, it in enumerate(ITEMS, 1):
        for sent in re.split(r"(?<=[.!?])\s+", it["contextEn"]):
            if len(words(sent)) > 10: errs.append(f"#{n_} context too long: {sent}")
    # leak check: no answer visible (story/context/glossary) before its item is solved
    spell_order = [i["spell"]["answer"] for i in ITEMS if i["type"] == "spell"]
    seen_text = []
    for n_, it in enumerate(ITEMS, 1):
        seg = STORY[it["segment"]]
        if not any(x[0] == it["segment"] for x in seen_text):
            seen_text.append((it["segment"], " ".join(seg["lines"]) + " " + " ".join(g[0] for g in seg["gloss"])))
        visible = " ".join(t for _, t in seen_text) + " " + it["contextEn"]
        answers = [it["spell"]["answer"]] if it["type"] == "spell" else [b["answer"] for b in it["blanks"]]
        for a in answers:
            if a in FUNCTION_WORDS or (" " in a and a[-1] in ".?"): continue
            if re.search(r"\b%s\b" % re.escape(a), visible, re.I):
                errs.append(f"#{n_} {it['bankId']} answer '{a}' already visible in story/context")
        # a tile must not show a spelling word before it is spelled
        done = {j["spell"]["answer"] for j in ITEMS[:n_] if j["type"] == "spell"}
        later = [w for w in spell_order if w not in done]
        if it["type"] == "drag":
            for t in it["distractors"] + [b["answer"] for b in it["blanks"]]:
                for w in later:
                    if re.search(r"\b%s\b" % re.escape(w), t): errs.append(f"#{n_} tile '{t}' shows '{w}' before its spelling item")
        seen_text.append((f"ctx{n_}", it["contextEn"]))
    # same sentence with different blanks must be far apart (>= 7 items, teacher-approved order)
    pos = {it["bankId"]: n for n, it in enumerate(ITEMS, 1)}
    for a, b in [("D04", "D08"), ("D07", "D09"), ("D13", "D17")]:
        if pos[b] - pos[a] < 7: errs.append(f"{a}/{b} too close ({pos[a]}, {pos[b]})")
    # battles = teacher-approved plan
    plan = json.loads(PLAN.read_text(encoding="utf-8"))["rows"]
    if [(b["after"], b["seconds"], bool(b.get("boss"))) for b in BATTLES] != \
       [(r["afterQuestion"], int(r["seconds"]), r["boss"]) for r in plan]:
        errs.append("BATTLES differ from battle-plan.json")
    # glossary must not contain answers of its own segment items
    for k, s in STORY.items():
        seg_answers = {a.lower() for it in ITEMS if it["segment"] == k
                       for a in ([it["spell"]["answer"]] if it["type"] == "spell" else [b["answer"] for b in it["blanks"]])}
        for g, _ in s["gloss"]:
            if g.lower() in seg_answers: errs.append(f"{k} glossary leaks {g}")
    if LAST_SEG in {it["segment"] for it in ITEMS}: errs.append(f"{LAST_SEG} is the ending and must have no items")
    return errs

# ---------------------------------------------------------------- outputs
def build():
    items = []
    for n, it in enumerate(ITEMS, 1):
        d = dict(seq=n, id=f"Q{n:02d}", **it)
        d["battleAfter"] = next((b["id"] for b in BATTLES if b["after"] == n), None)
        # Tick reads the answer explanation aloud; the student must play it before Next unlocks
        d["feedbackTts"] = dict(text=it["correctEn"], path=f"audio/feedback/Q{n:02d}.mp3", requiresListen=True)
        items.append(d)
    data = dict(version=VERSION, title="Ken and the World Map Mix-Up", unit="HWG7 U01+U02",
                endingSegment=LAST_SEG, narrationTts=TTS,
                story={k: dict(id=k, **{**v, "gloss": [dict(en=e, zh=z) for e, z in v["gloss"]]},
                               requiresListen=True,
                               tts=dict(text=" ".join(v["lines"]), path=f"audio/narration/{k}.mp3"))
                       for k, v in STORY.items()},
                battles=BATTLES, items=items)
    (HERE / f"question-bank.v{VERSION}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [f"# Ken and the World Map Mix-Up｜故事旁白與題庫審閱 v{VERSION}", "",
          "> 由 `build_content.py` 產生，請勿手改；要修改請告訴 Claude 改原始資料再重建。",
          "> 〔 〕＝拖放空格；作答畫面無中文，中文只出現在旁白難字表。", ""]
    shown = set()
    def seg_head(seg):
        s = STORY[seg]
        return ["", f"## {seg}｜{s['title']}", "", f"![{seg}](../assets/imagegen/{s['image']})", ""] + \
               [f"> {l}" for l in s["lines"]] + ["", "難字：" + "；".join(f"{e}｜{z}" for e, z in s["gloss"]), ""]
    for it in items:
        seg = it["segment"]
        if seg not in shown:
            shown.add(seg)
            md += seg_head(seg)
            md += ["| # | 題 | 圖 | 畫面句 | 題目 | 干擾選項／字母 | 提示 1 → 提示 2 | 答對解析（Tick 念） |",
                   "|---|---|---|---|---|---|---|---|"]
        if it["type"] == "spell":
            q = f"拼 **{it['spell']['answer']}**"; opts = "干擾字母：" + " ".join(it["spell"]["distractorLetters"])
            bid = "S"
        else:
            q = " / ".join(f"{l['speaker']}: " + re.sub(r"\{(\d)\}", lambda m: "〔" + it["blanks"][int(m.group(1)) - 1]["answer"] + "〕", l["text"]) for l in it["lines"])
            opts = "、".join(it["distractors"]); bid = it["bankId"]
        extra = "（回聲框）" if it.get("mirrorFrame") else ""
        img = Path(it["image"]).stem
        md.append(f"| {it['seq']} | {bid}{extra} | {img} | {it['contextEn']} | {q} | {opts} | {it['hint1En']} → {it['hint2En']} | {it['correctEn']} |")
        if it["battleAfter"]:
            b = next(x for x in BATTLES if x["id"] == it["battleAfter"])
            md.append(f"| ⚔ | {b['id']} | | {b['intro']} | **{b['arenaZh']}**（{b['seconds']} 秒{'，Boss 第 %d 階段' % b['phase'] if b.get('boss') else ''}） | 獎勵：{'、'.join(b['rewards'])} | | |")
    md += seg_head(LAST_SEG)
    (HERE / f"STORY-題庫審閱-v{VERSION}.md").write_text("\n".join(md) + "\n", encoding="utf-8")

if __name__ == "__main__":
    errs = run_checks()
    if errs:
        print("CHECK FAILED:"); [print(" -", e) for e in errs]; sys.exit(1)
    build()
    sp = sum(i["type"] == "spell" for i in ITEMS)
    print(f"OK: {len(ITEMS)} items ({sp} spell, {len(ITEMS) - sp} drag), {len(STORY)} story segments, "
          f"{len(BATTLES)} battles; all checks passed")
