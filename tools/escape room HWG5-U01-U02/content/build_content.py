# -*- coding: utf-8 -*-
"""Build the HWG5 U01+U02 story + question bank (single source of truth).

Outputs (next to this script):
  question-bank.v0.1.json   data for the website / Godot bridge
  STORY-題庫審閱-v0.1.md     teacher review sheet (generated, do not hand-edit)

Run:  python -I build_content.py      (exits non-zero if any check fails)
"""
import json, re, sys, zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
DOCX = HERE.parent / "HWG5 U01 + U02 題目與答案表.docx"
VERSION = "0.1"

# ---------------------------------------------------------------- story
# English only, A1, 4-10 words per sentence. gloss = 英中對照 shown under the passage.
STORY = {
    "SEG-01": dict(image="story/STORY-01-prologue.png", title="The Frozen Clock", lines=[
        "It is a sunny morning at Sunny Hill School.",
        "Ken walks to school with his friends.",
        "Suddenly, the big clock tower stops!",
        "A purple monster flies over the tower.",
        "It is Time Muncher!",
        "It eats the gears of the week.",
        "It eats the class schedule, too!",
        "A little clock spirit flies to Ken.",
        "\"I am Tick. Please help me!\"",
    ], gloss=[("clock tower", "鐘塔"), ("suddenly", "突然"), ("monster", "怪物"),
              ("gear", "齒輪"), ("class schedule", "課表"), ("spirit", "精靈")]),
    "SEG-02": dict(image="story/STORY-02-monday.png", title="Gate One", lines=[
        "Tick opens a glowing gate.",
        "Ken steps into a bright room.",
        "There are paints and pictures everywhere.",
        "\"Let's fix the class schedule!\" says Tick.",
    ], gloss=[("glowing", "發光的"), ("gate", "門"), ("paint", "顏料"),
              ("everywhere", "到處"), ("fix", "修好")]),
    "SEG-03": dict(image="story/STORY-03-tuesday.png", title="Gate Two", lines=[
        "Tick opens the next gate.",
        "A new day starts.",
        "Ken hears a piano and a drum.",
        "\"What a beautiful room!\" says Ken.",
        "\"Look at the calendar!\" says Tick.",
    ], gloss=[("next", "下一個"), ("hear", "聽見"), ("piano", "鋼琴"),
              ("drum", "鼓"), ("beautiful", "美麗的"), ("calendar", "日曆")]),
    "SEG-04": dict(image="story/STORY-04-wednesday.png", title="Gate Three", lines=[
        "Ken and Tick run to the next gate.",
        "Jack is inside.",
        "Colorful blocks fly in the air.",
        "Jack counts with an abacus.",
        "\"Hi, Ken! Can you help?\" asks Jack.",
    ], gloss=[("colorful", "彩色的"), ("block", "積木"), ("count", "數數"),
              ("abacus", "算盤")]),
    "SEG-05": dict(image="story/STORY-05-thursday.png", title="Gate Four", lines=[
        "The next gate opens to a long hall.",
        "Big clock hands move on the floor.",
        "Jenny and Tom are there, too.",
        "There are two doors.",
        "One door has a book.",
        "One door has a bottle.",
    ], gloss=[("hall", "走廊"), ("clock hands", "時鐘指針"), ("move", "移動"),
              ("floor", "地板"), ("bottle", "瓶子")]),
    "SEG-06": dict(image="story/STORY-06-friday.png", title="Gate Five", lines=[
        "The last school gate opens.",
        "Ken sees a big gym.",
        "There are balls and cones.",
        "There is a map room, too.",
        "All four friends are here!",
    ], gloss=[("last", "最後的"), ("gym", "體育館"), ("cone", "角錐"),
              ("map", "地圖"), ("friend", "朋友")]),
    "SEG-07": dict(image="story/STORY-07-weekend.png", title="The Rooftop", lines=[
        "Ken and Tick climb to the rooftop.",
        "There is no school today.",
        "Kids fly kites in the park.",
        "Wait! A big shadow is in the sky!",
        "Time Muncher is here!",
    ], gloss=[("climb", "爬"), ("rooftop", "屋頂"), ("kite", "風箏"),
              ("park", "公園"), ("shadow", "影子")]),
    "SEG-08": dict(image="story/STORY-08-clockcore.png", title="The Clock Core", lines=[
        "Ken jumps into the clock tower.",
        "Big gold gears turn and turn.",
        "Magic mirrors float in the air.",
        "\"Answer my mirrors!\" shouts Time Muncher.",
        "\"I can do it!\" says Ken.",
    ], gloss=[("turn", "轉動"), ("mirror", "鏡子"), ("float", "漂浮"),
              ("answer", "回答"), ("shout", "大喊")]),
    "SEG-09": dict(image="story/STORY-09-ending.png", title="Time Moves Again", lines=[
        "Ken puts the seven gears in the tower.",
        "Tick! Tock! The big clock moves again!",
        "The class schedule is back.",
        "Time Muncher is small and happy now.",
        "\"Thank you, Ken!\" says Tick.",
        "Everyone cheers. Time is safe again!",
    ], gloss=[("seven", "七"), ("back", "回來"), ("cheer", "歡呼"), ("safe", "安全的")]),
}

# ---------------------------------------------------------------- narration TTS (same spec as HWG5/HWG7 Sentence review)
# Static MP3 made offline by generate_narration_tts.mjs; the API key never reaches the browser.
# speed 0.8 is applied by the API; the web player keeps playbackRate 1.0 (no double slow-down).
TTS = dict(provider="openai", model="gpt-4o-mini-tts", voice="marin", speed=0.8, format="mp3",
           accent="American English", disclosure="English audio is AI-generated, not a human recording.")

# ---------------------------------------------------------------- battles (every 3 items)
BATTLES = [
    dict(id="B01", after=3, arena="Clock Tower Plaza", arenaZh="鐘塔廣場", seconds=20,
         intro="Gear Gremlins jump out of the clock!", rewards=["Monday Gear"]),
    dict(id="B02", after=6, arena="Art Room", arenaZh="美術教室", seconds=21,
         intro="Paint Blobs fill the room!", rewards=["Paint Splash", "Tuesday Gear"]),
    dict(id="B03", after=9, arena="Music Hall", arenaZh="音樂廳", seconds=22,
         intro="Sound Bats fly around the piano!", rewards=["Music Note Shield"]),
    dict(id="B04", after=12, arena="Math Lab", arenaZh="數學實驗室", seconds=23,
         intro="Block Golems fall from the air!", rewards=["Wednesday Gear", "Ruler Boomerang"]),
    dict(id="B05", after=15, arena="Long Hall", arenaZh="星期四走廊", seconds=24,
         intro="Clock-Hand Beetles run on the floor!", rewards=["Thursday Gear"]),
    dict(id="B06", after=18, arena="Language Room", arenaZh="語言教室", seconds=25,
         intro="Ink Blobs drip from the ceiling!", rewards=["Textbook Guard", "Word Bubble"]),
    dict(id="B07", after=21, arena="Science Lab", arenaZh="科學實驗室", seconds=26,
         intro="Bubble Slimes pop out of the tubes!", rewards=["Science Potion"]),
    dict(id="B08", after=24, arena="Gym and Map Room", arenaZh="體育館與地圖室", seconds=28,
         intro="Bouncy Ball Imps bounce everywhere!", rewards=["Friday Gear", "Speed Sneakers", "Globe Compass"]),
    dict(id="B09", after=27, arena="Rooftop", arenaZh="鐘塔屋頂", seconds=30,
         intro="A strong wind blows on the rooftop!", rewards=["Weekend Gears"]),
    dict(id="B10", after=30, arena="Clock Core", arenaZh="鐘塔核心", seconds=60, boss=True, phase=1,
         intro="Time Muncher raises its gear shield!", rewards=["Mirror Shard"]),
    dict(id="B11", after=32, arena="Clock Core", arenaZh="鐘塔核心", seconds=60, boss=True, phase=2,
         intro="Time Muncher is angry! Stay strong, Ken!", rewards=["Clock Restarted"]),
]

# ---------------------------------------------------------------- items
# lines: (speaker, text) with {1},{2} blanks.  strip: (highlight, zhLabel or None)
H_DAY = ("Look at the week strip again.", "Find the bright day on the strip.")
H_DO = "I or you: use do. He or she: use does."
H_DOQ = "Who is it? You: Do. He, she or a name: Does."
def drag(seg, bid, img, strip, ctx, lines, answers, distractors, hint1, hint2, correct, extra=None):
    d = dict(type="drag", segment=seg, bankId=bid, image=img, weekStrip=strip, contextEn=ctx,
             lines=[dict(speaker=s, text=t) for s, t in lines],
             blanks=[dict(id=i + 1, answer=a) for i, a in enumerate(answers)],
             distractors=distractors, hint1En=hint1, hint2En=hint2, correctEn=correct)
    if extra: d.update(extra)
    return d
def spell(seg, bid, img, strip, ctx, answer, extra_letters, hint1, correct):
    return dict(type="spell", segment=seg, bankId=bid, image=img, weekStrip=strip, contextEn=ctx,
                lines=[dict(speaker="Tick", text="Spell the word.")],
                spell=dict(answer=answer, distractorLetters=extra_letters,
                           groups=[len(w) for w in answer.split(" ")], caseSensitive=True),
                hint1En=hint1, hint2En=f"The first letter is {answer[0]}.", correctEn=correct)
def strip(day, zh=None): return dict(highlight=day, zhLabel=zh)

ITEMS = [
    # ---- Prologue (SEG-01)
    drag("SEG-01", "D02", "questions/Q01.png", None, "Ken looks up at the clock.",
         [("Tick", "What {1} is it?"), ("Ken", "It's {2}.")], ["time", "9:50"], ["day", "9:15", "5:50"],
         "Look at the clock hands.", "The short hand is near 10. The long hand is on 10.",
         "It's 9:50. The clock stopped at 9:50.",
         extra=dict(clock=dict(time="9:50", cx=765.08, cy=343.86, r=204.5))),
    drag("SEG-01", "D04", "questions/Q02.png", strip("Mon"), "Kids are coming to school.",
         [("Tick", "What day {1} it?"), ("Ken", "It's {2}.")], ["is", "Monday"], ["do", "are", "Sunday"],
         H_DAY[0], H_DAY[1], "It's Monday. A new school week starts."),
    # ---- Monday (SEG-02)
    drag("SEG-02", "D05", "questions/Q03.png", strip("Mon"), "Tick points at the room.",
         [("Tick", "Is it {1} today?"), ("Ken", "Yes, it {2}.")], ["Monday", "is"], ["Sunday", "isn't", "does"],
         "Look at Ken's face. Is it yes or no?", "Ken nods. That means yes.",
         "Yes, it is. Today is Monday."),
    drag("SEG-02", "D10", "questions/Q04.png", strip("Mon"), "Jenny is painting a picture.",
         [("Jenny", "Do you have {1} class on Monday?"), ("Ken", "Yes, I {2}.")], ["art", "do"],
         ["PE", "does", "don't"], "Look at the things in the picture.", H_DO,
         "Yes, I do. Ken has art class on Monday."),
    # ---- Tuesday (SEG-03)
    spell("SEG-03", "S2", "questions/Q05.png", strip("Tue", "星期二"), "Tick turns a big page. A new day starts.",
          "Tuesday", "hrn", "Look at the bright day on the strip.", "Tuesday. T-u-e-s-d-a-y."),
    drag("SEG-03", "D06", "questions/Q06.png", strip("Tue"), "Tick points at the art room. Ken shakes his head.",
         [("Tick", "Is it Monday today?"), ("Ken", "No, it {1}. It's {2}.")], ["isn't", "Tuesday"],
         ["is", "doesn't", "Sunday"], "Look at Ken's head. Is it yes or no?", H_DAY[1],
         "No, it isn't. It's Tuesday."),
    spell("SEG-03", "S11", "questions/Q07.png", strip("Tue"), "Ken plays a recorder. Listen to the notes!",
          "music", "ka", "Look at the recorder and the piano.", "Music. M-u-s-i-c."),
    drag("SEG-03", "D14", "questions/Q08.png", strip("Tue"), "Jenny listens to Ken. She smiles.",
         [("Jenny", "Do you have {1} class on Tuesday?"), ("Ken", "Yes, I {2}.")], ["music", "do"],
         ["art", "does", "is"], "Look at the things in Ken's hands.", H_DO,
         "Yes, I do. Ken has music class on Tuesday."),
    # ---- Wednesday (SEG-04)
    spell("SEG-04", "S3", "questions/Q09.png", strip("Wed", "星期三"), "The blocks spin. A new day starts.",
          "Wednesday", "st", "Look at the bright day on the strip.", "Wednesday. W-e-d-n-e-s-d-a-y."),
    drag("SEG-04", "D01", "questions/Q10.png", strip("Wed"), "Tick holds a shiny gear. Ken looks at it.",
         [("Tick", "What {1} is today?"), ("Ken", "It's {2}.")], ["day", "Wednesday"],
         ["time", "Monday", "Tuesday"], H_DAY[0], "What day is today? Find the bright day.",
         "It's Wednesday. Tick gets the Wednesday gear."),
    spell("SEG-04", "S9", "questions/Q11.png", strip("Wed"), "Look at the desk. What class is it?",
          "math", "en", "Look at the abacus and the blocks.", "Math. M-a-t-h."),
    drag("SEG-04", "D13", "questions/Q12.png", strip("Wed"), "Jack is busy with the abacus.",
         [("Ken", "{1} Jack have {2} class on Wednesday?"), ("Jenny", "Yes, he does.")], ["Does", "math"],
         ["Do", "Is", "music"], "Look at Jack's desk.", H_DOQ,
         "Does Jack have math class? Yes, he does."),
    # ---- Thursday (SEG-05)
    spell("SEG-05", "S1", "questions/Q13.png", strip("Thu", "星期四"), "Ken stands in the long hall. A new day starts.",
          "Thursday", "en", "Look at the bright day on the strip.", "Thursday. T-h-u-r-s-d-a-y."),
    drag("SEG-05", "D03", "questions/Q14.png", strip("Thu"), "Ken and Tick look out the window.",
         [("Tick", "What day is {1}?"), ("Ken", "It's {2}.")], ["today", "Thursday"],
         ["it", "Tuesday", "Wednesday"], H_DAY[0], H_DAY[1], "It's Thursday. The long hall is open."),
    spell("SEG-05", "S6", "questions/Q15.png", strip("Thu"), "Look at the book on the desk.",
          "Chinese", "as", "Look at the book cover.", "Chinese. C-h-i-n-e-s-e."),
    drag("SEG-05", "D11", "questions/Q16.png", strip("Thu"), "Jenny looks at the class schedule.",
         [("Jenny", "{1} you have {2} class on Thursday?"), ("Ken", "No, I don't.")], ["Do", "Chinese"],
         ["Does", "Is", "math"], "Look at the red circle. What is in it?", H_DOQ,
         "No, I don't. Ken doesn't have Chinese class on Thursday."),
    spell("SEG-05", "S7", "questions/Q17.png", strip("Thu"), "Look at the headphones and the book.",
          "English", "ae", "Look at the headphones and the speech bubbles.", "English. E-n-g-l-i-s-h."),
    drag("SEG-05", "D12", "questions/Q18.png", strip("Thu"), "Tom reads a picture book. He has headphones.",
         [("Ken", "Does he have {1} class on Thursday?"), ("Jenny", "Yes, he {2}.")], ["English", "does"],
         ["Chinese", "do", "is"], "Look at Tom's headphones.", H_DO,
         "Yes, he does. Tom has English class on Thursday."),
    spell("SEG-05", "S8", "questions/Q19.png", strip("Thu"), "Look at the microscope and the tubes.",
          "science", "sk", "Look at the microscope.", "Science. S-c-i-e-n-c-e."),
    drag("SEG-05", "D16", "questions/Q20.png", strip("Thu"), "Jenny looks into a microscope.",
         [("Ken", "{1} Jenny have {2} class on Thursday?"), ("Tom", "Yes, she does.")], ["Does", "science"],
         ["Do", "Is", "English"], "Look at Jenny's goggles and the microscope.", H_DOQ,
         "Does Jenny have science class? Yes, she does."),
    # ---- Friday (SEG-06)
    spell("SEG-06", "S4", "questions/Q21.png", strip("Fri", "星期五"), "The school week is almost over.",
          "Friday", "er", "Look at the bright day on the strip.", "Friday. F-r-i-d-a-y."),
    drag("SEG-06", "D15", "questions/Q22.png", strip("Fri"), "Jenny walks past the gym.",
         [("Ken", "Does she have {1} class on Friday?"), ("Tom", "No, she {2}.")], ["PE", "doesn't"],
         ["art", "don't", "isn't"], "Look at the red circle. What is in it?", "She: does or doesn't? Is it yes or no?",
         "No, she doesn't. Jenny doesn't have PE class on Friday."),
    spell("SEG-06", "S10", "questions/Q23.png", strip("Fri"), "Look at the globe and the map.",
          "social studies", "en", "Look at the globe and the map.", "Social studies. S-o-c-i-a-l  s-t-u-d-i-e-s."),
    drag("SEG-06", "D17", "questions/Q24.png", strip("Fri"), "The four friends look at the board.",
         [("Jenny", "Do we have {1} class on Friday?"), ("Ken", "No, we {2}.")], ["social studies", "don't"],
         ["science", "doesn't", "aren't"], "Look at the red circle. What is in it?", "We: do or don't? Is it yes or no?",
         "No, we don't. We don't have social studies on Friday."),
    # ---- Weekend (SEG-07)
    drag("SEG-07", "D07", "questions/Q25.png", strip("Sat"), "Tick looks at the park.",
         [("Tick", "{1} it Sunday today?"), ("Ken", "No, it {2}.")], ["Is", "isn't"],
         ["Do", "Does", "don't"], "Look at the week strip. Is it Sunday?", "Ken shakes his head. That means no.",
         "No, it isn't. It isn't Sunday."),
    spell("SEG-07", "S5", "questions/Q26.png", strip("Sat", "星期六"), "Kids are playing in the park.",
          "Saturday", "ne", "Look at the bright day on the strip.", "Saturday. S-a-t-u-r-d-a-y."),
    drag("SEG-07", "D08", "questions/Q03.png", strip("Mon"), "Time Muncher drops a magic mirror. Look inside!",
         [("Tick", "Is it Monday today?"), ("Ken", "{1}")], ["Yes, it is."],
         ["No, it isn't.", "Yes, it does.", "Yes, I do."], H_DAY[0], "Is it ...? Use it is or it isn't.",
         "Yes, it is. The mirror shows Monday.", extra=dict(mirrorFrame=True)),
    # ---- Clock core (SEG-08)
    drag("SEG-08", "D09", "questions/Q06.png", strip("Tue"), "The mirror shows Tick and Ken again.",
         [("Tick", "Is it Monday today?"), ("Ken", "{1}")], ["No, it isn't. It's Tuesday."],
         ["Yes, it is.", "No, it isn't. It's Thursday.", "No, I don't. It's Tuesday."],
         H_DAY[0], "Is it ...? Use it isn't. Then say the day.",
         "No, it isn't. It's Tuesday.", extra=dict(mirrorFrame=True)),
    drag("SEG-08", "D18", "questions/Q04.png", strip("Mon"), "The mirror shows the art room.",
         [("Jenny", "Do you have art class on Monday?"), ("Ken", "{1}")], ["Yes, I do."],
         ["Yes, he does.", "No, I don't.", "Yes, it is."], "Look at Ken's face.", "Ken nods. Do you ...? Answer with I.",
         "Yes, I do. Ken has art class on Monday.", extra=dict(mirrorFrame=True)),
    drag("SEG-08", "D19", "questions/Q16.png", strip("Thu"), "The mirror shows Jenny and Ken in the hall.",
         [("Jenny", "Do you have Chinese class on Thursday?"), ("Ken", "{1}")], ["No, I don't."],
         ["Yes, I do.", "No, she doesn't.", "No, it isn't."], "Look at the red circle.", "Ken shakes his head. Do you ...? Answer with I.",
         "No, I don't. Ken doesn't have Chinese class on Thursday.", extra=dict(mirrorFrame=True)),
    drag("SEG-08", "D20", "questions/Q31.png", strip("Tue"), "The mirror shows Tom in the gym.",
         [("Ken", "Does Tom have PE class on Tuesday?"), ("Jenny", "{1}")], ["Yes, he does."],
         ["Yes, I do.", "No, he doesn't.", "Yes, she does."], "Look at Tom. What is he doing?",
         "Tom is he. Is it yes or no?", "Yes, he does. Tom has PE class on Tuesday."),
    drag("SEG-08", "D21", "questions/Q32.png", strip("Fri"), "The last mirror shows Jenny.",
         [("Tom", "Does Jenny have music class on Friday?"), ("Ken", "{1}")], ["No, she doesn't."],
         ["No, he doesn't.", "Yes, she does.", "No, I don't."], "Look at the red circle.",
         "Jenny is she. Is it yes or no?", "No, she doesn't. Jenny doesn't have music class on Friday."),
]

# ---------------------------------------------------------------- checks
FUNCTION_WORDS = {"is", "isn't", "do", "does", "don't", "doesn't", "it", "today", "day", "time", "Is", "Do", "Does"}
SPELL_ORDER = ["Thursday", "Tuesday", "Wednesday", "Friday", "Saturday", "Chinese", "English",
               "science", "math", "social studies", "music"]

def bank_from_docx():
    x = zipfile.ZipFile(DOCX).read("word/document.xml").decode("utf8")
    def runs(seg):
        out = ""
        for r in re.findall(r"<w:r[ >].*?</w:r>", seg, re.S):
            t = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", r, re.S))
            if t:
                b = re.search(r'<w:b(?: w:val="(?:1|true)")?/>', r)
                out += ("**" + t + "**") if b and t.strip() else t
        return out
    text = runs(x)
    spells = re.findall(r"\d+\.\s*([A-Za-z ]+?)(?=\d+\.|拖|$)", text.split("拖放")[0])
    rows = {}
    for row in re.findall(r"<w:tr[ >].*?</w:tr>", x, re.S):
        cells = [runs(c) for c in re.findall(r"<w:tc>.*?</w:tc>", row, re.S)]
        if cells and cells[0].strip().isdigit():
            rows["D%02d" % int(cells[0])] = (cells[1].strip(), cells[2].strip())
    return [s.strip() for s in spells], rows

def norm(s):
    return re.sub(r"\*\*\s*\*\*", "", s).replace("’", "'").strip()

def run_checks():
    errs = []
    spells, rows = bank_from_docx()
    if len(ITEMS) != 32: errs.append(f"item count {len(ITEMS)}")
    sp = [i for i in ITEMS if i["type"] == "spell"]; dr = [i for i in ITEMS if i["type"] == "drag"]
    if len(sp) != 11 or len(dr) != 21: errs.append(f"spell {len(sp)} drag {len(dr)}")
    if sorted(i["spell"]["answer"] for i in sp) != sorted(spells): errs.append(f"spell words differ from docx: {spells}")
    if sorted(i["bankId"] for i in dr) != sorted(rows): errs.append("drag ids differ from docx")
    for it in dr:
        q, a = rows[it["bankId"]]
        bold = re.findall(r"\*\*(.+?)\*\*", norm(q) + " " + norm(a))
        bold = [b.strip() for b in bold]
        mine = [b["answer"] for b in it["blanks"]]
        if [norm(b) for b in bold] != mine:
            errs.append(f"{it['bankId']} answers {mine} != docx bold {bold}")
        full = " ".join(l["text"] for l in it["lines"])
        for b in it["blanks"]: full = full.replace("{%d}" % b["id"], b["answer"])
        src = re.sub(r"\*\*", "", q + " " + a)
        if re.sub(r"\s+", " ", full) != re.sub(r"\s+", " ", src).strip():
            errs.append(f"{it['bankId']} sentence '{full}' != docx '{src}'")
        if len(it["distractors"]) < 2: errs.append(f"{it['bankId']} <2 distractors")
        if set(it["distractors"]) & set(mine): errs.append(f"{it['bankId']} distractor equals answer")
    # sentence length (4-10 words) for story + contexts; exclamations allowed shorter
    for k, s in STORY.items():
        for line in s["lines"]:
            n = len(re.findall(r"[A-Za-z0-9:'’]+", line))
            if n > 10: errs.append(f"{k} too long ({n}): {line}")
    for n_, it in enumerate(ITEMS, 1):
        for sent in re.split(r"(?<=[.!?])\s+", it["contextEn"]):
            if len(re.findall(r"[A-Za-z0-9:'’]+", sent)) > 10: errs.append(f"#{n_} context too long: {sent}")
    # leak check: no answer word visible (story/context/glossary/distractors) before its item is solved
    seen_text = []
    for n_, it in enumerate(ITEMS, 1):
        seg = STORY[it["segment"]]
        if not any(x[0] == it["segment"] for x in seen_text):
            seen_text.append((it["segment"], " ".join(seg["lines"]) + " " + " ".join(g[0] for g in seg["gloss"])))
        visible = " ".join(t for _, t in seen_text) + " " + it["contextEn"]
        answers = [it["spell"]["answer"]] if it["type"] == "spell" else [b["answer"] for b in it["blanks"]]
        for a in answers:
            if a in FUNCTION_WORDS or " " in a and a.endswith("."): continue
            if re.search(r"\b%s\b" % re.escape(a), visible, re.I):
                errs.append(f"#{n_} {it['bankId']} answer '{a}' already visible in story/context")
        # distractor tiles must not show a spelling word before it is spelled
        later = [w for w in SPELL_ORDER if all(not (j["type"] == "spell" and j["spell"]["answer"] == w)
                                              for j in ITEMS[:n_])]
        if it["type"] == "drag":
            for t in it["distractors"] + [b["answer"] for b in it["blanks"]]:
                if t in later: errs.append(f"#{n_} tile '{t}' shown before its spelling item")
        seen_text.append((f"ctx{n_}", it["contextEn"]))
    # battles every 3
    if [b["after"] for b in BATTLES] != [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 32]: errs.append("battle spacing")
    # glossary must not contain answers of its own segment items
    for k, s in STORY.items():
        seg_answers = {a for it in ITEMS if it["segment"] == k
                       for a in ([it["spell"]["answer"]] if it["type"] == "spell" else [b["answer"] for b in it["blanks"]])}
        for g, _ in s["gloss"]:
            if g in seg_answers: errs.append(f"{k} glossary leaks {g}")
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
    data = dict(version=VERSION, title="Ken and the Frozen Clock Tower", unit="HWG5 U01+U02",
                weekStripOrder=["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                weekStripLabels={"Sun": "Sun.", "Mon": "Mon.", "Tue": "Tue.", "Wed": "Wed.",
                                 "Thu": "Thu.", "Fri": "Fri.", "Sat": "Sat."},
                narrationTts=TTS,
                story={k: dict(id=k, **{**v, "gloss": [dict(en=e, zh=z) for e, z in v["gloss"]]},
                               requiresListen=True,
                               tts=dict(text=" ".join(v["lines"]), path=f"audio/narration/{k}.mp3"))
                       for k, v in STORY.items()},
                battles=BATTLES, items=items)
    (HERE / f"question-bank.v{VERSION}.json").write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    md = [f"# Ken and the Frozen Clock Tower｜故事旁白與題庫審閱 v{VERSION}", "",
          "> 由 `build_content.py` 產生，請勿手改；要修改請告訴 Claude 改原始資料再重建。",
          "> 〔 〕＝拖放空格；作答畫面無中文，中文只出現在旁白難字表與拼字題亮起的星期格。", ""]
    shown = set()
    for it in items:
        seg = it["segment"]
        if seg not in shown:
            shown.add(seg); s = STORY[seg]
            md += ["", f"## {seg}｜{s['title']}", "", f"![{seg}](../assets/imagegen/{s['image']})", ""]
            md += [f"> {l}" for l in s["lines"]] + [""]
            md += ["難字：" + "；".join(f"{e}｜{z}" for e, z in s["gloss"]), ""]
            md += ["| # | 題 | 畫面句 | 題目 | 選項／字母 | 星期條 | 提示 1 → 提示 2 | 答對解析 |", "|---|---|---|---|---|---|---|---|"]
        if it["type"] == "spell":
            q = f"拼 **{it['spell']['answer']}**"; opts = "干擾字母：" + " ".join(it["spell"]["distractorLetters"])
        else:
            q = " / ".join(f"{l['speaker']}: " + re.sub(r"\{(\d)\}", lambda m: "〔" + it["blanks"][int(m.group(1)) - 1]["answer"] + "〕", l["text"]) for l in it["lines"])
            opts = "、".join(it["distractors"])
        st = "—" if not it["weekStrip"] else (it["weekStrip"]["highlight"] + (f"→{it['weekStrip']['zhLabel']}" if it["weekStrip"]["zhLabel"] else ""))
        extra = "（鏡框）" if it.get("mirrorFrame") else ""
        md.append(f"| {it['seq']} | {it['bankId']}{extra} | {it['contextEn']} | {q} | {opts} | {st} | {it['hint1En']} → {it['hint2En']} | {it['correctEn']} |")
        if it["battleAfter"]:
            b = next(x for x in BATTLES if x["id"] == it["battleAfter"])
            md.append(f"| ⚔ | {b['id']} | {b['intro']} | **{b['arenaZh']}**（{b['seconds']} 秒{'，Boss 第 %d 階段' % b['phase'] if b.get('boss') else ''}） | 獎勵：{'、'.join(b['rewards'])} | | | |")
    s = STORY["SEG-09"]
    md += ["", "## SEG-09｜" + s["title"], "", f"![SEG-09](../assets/imagegen/{s['image']})", ""]
    md += [f"> {l}" for l in s["lines"]] + ["", "難字：" + "；".join(f"{e}｜{z}" for e, z in s["gloss"]), ""]
    (HERE / f"STORY-題庫審閱-v{VERSION}.md").write_text("\n".join(md) + "\n", encoding="utf-8")

if __name__ == "__main__":
    errs = run_checks()
    if errs:
        print("CHECK FAILED:"); [print(" -", e) for e in errs]; sys.exit(1)
    build()
    print(f"OK: 32 items (11 spell, 21 drag), {len(STORY)} story segments, {len(BATTLES)} battles; all checks passed")
