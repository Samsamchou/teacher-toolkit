# -*- coding: utf-8 -*-
"""Read a teacher's question-bank .docx (no python-docx needed) into JSON.

Conventions used by the teacher's banks (HWG5 U01+U02 was the first):
  * a paragraph that lists spelling words: "單字題 1. Thursday 2. Tuesday ..." (any numbered list
    that appears before the first table, or after a heading containing 單字/拼字/spelling)
  * one or more tables with rows:  number | question | answer
  * **bold** text inside a row is what the student must supply (a drag blank, or the whole
    sentence for a "complete answer" item)

Usage:
  python -I parse_question_bank.py "<bank>.docx" [--out bank.json]
Prints a summary and every warning; exit code 1 if nothing usable was found.
"""
import json, re, sys, zipfile
from pathlib import Path


def runs_text(xml_fragment):
    """Text of a paragraph/cell with bold runs wrapped in **…** (adjacent bold runs merged)."""
    out = ""
    for r in re.findall(r"<w:r[ >].*?</w:r>", xml_fragment, re.S):
        t = "".join(re.findall(r"<w:t[^>]*>(.*?)</w:t>", r, re.S))
        if not t:
            continue
        t = t.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&apos;", "'").replace("&quot;", '"')
        bold = re.search(r'<w:b(?: w:val="(?:1|true|on)")?\s*/>', r) and not re.search(r'<w:b w:val="(?:0|false|off)"', r)
        out += f"**{t}**" if bold and t.strip() else t
    out = re.sub(r"\*\*(\s*)\*\*", r"\1", out)          # merge **a****b** -> **ab**
    return out.replace("’", "'").replace("‘", "'")


def parse(docx_path):
    xml = zipfile.ZipFile(docx_path).read("word/document.xml").decode("utf8")
    body = xml.split("<w:body>", 1)[1]
    warnings, spelling, drag, notes = [], [], [], []
    first_table_seen = False
    for m in re.finditer(r"<w:tbl>.*?</w:tbl>|<w:p[ >].*?</w:p>", body, re.S):
        block = m.group(0)
        if block.startswith("<w:tbl>"):
            first_table_seen = True
            for row in re.findall(r"<w:tr[ >].*?</w:tr>", block, re.S):
                cells = [" / ".join(runs_text(p) for p in re.findall(r"<w:p[ >].*?</w:p>", c, re.S)).strip(" /")
                         for c in re.findall(r"<w:tc>.*?</w:tc>", row, re.S)]
                if not cells or not re.fullmatch(r"\d{1,3}", cells[0].strip()):
                    continue  # header row
                if len(cells) < 3:
                    warnings.append(f"row {cells[0]}: expected number | question | answer, got {cells}")
                    continue
                q, a = cells[1].strip(), cells[2].strip()
                # Teacher notes written in Chinese (often bold, e.g. **這題有3個正確答案**, or in brackets)
                # are instructions, not answer text: pull them out before reading the blanks.
                cjk = r"[　-鿿＀-￯]"
                teacher_notes = []
                def strip_notes(s):
                    for pat in (rf"\(?\**[^()*]*{cjk}[^()*]*\**\)?",):
                        for m_ in re.findall(pat, s):
                            if re.search(cjk, m_):
                                teacher_notes.append(re.sub(r"[*()]", "", m_).strip())
                                s = s.replace(m_, "")
                    return re.sub(r"\*\*\s*\*\*", "", s).strip()
                q, a = strip_notes(q), strip_notes(a)
                expected = None
                for n_ in teacher_notes:
                    mm = re.search(r"(\d+)\s*個正確答案", n_)
                    if mm: expected = int(mm.group(1))
                bold = [b.strip() for b in re.findall(r"\*\*(.+?)\*\*", q + "  " + a)]
                # A teacher count larger than the bold runs means a run holds several blanks
                # ("**How do**" = How / do). Split multi-word runs that are not fixed phrases
                # (by bus, on foot, the UK, social studies stay whole) until the count matches.
                phrase = re.compile(r"^(by|on|the|in|at)\s|\s(studies)$", re.I)
                while expected and len(bold) < expected:
                    k = next((i for i, b in enumerate(bold) if " " in b and not phrase.search(b)), None)
                    if k is None: break
                    bold[k:k + 1] = bold[k].split(" ", 1)
                plain = lambda s: re.sub(r"\*\*", "", s).strip()
                only_bold = lambda s: bool(s) and s.startswith("**") and s.endswith("**") and s.count("**") == 2
                kind = ("complete-answer" if only_bold(a) and "**" not in q else
                        "complete-question" if only_bold(q) and "**" not in a else "gap")
                if kind != "gap":
                    bold = [plain(a) if kind == "complete-answer" else plain(q)]
                item = {"id": f"D{int(cells[0]):02d}", "question": plain(q), "answer": plain(a),
                        "questionMarked": q, "answerMarked": a, "blanks": bold, "kind": kind}
                if teacher_notes: item["teacherNotes"] = teacher_notes
                if expected: item["teacherBlankCount"] = expected
                if not bold:
                    warnings.append(f"{item['id']}: no bold text, so the blank is unknown — ask the teacher")
                if expected and len(bold) != expected and kind == "gap":
                    warnings.append(f"{item['id']}: teacher says {expected} answers but found {len(bold)} blanks {bold} — confirm with the teacher")
                drag.append(item)
        else:
            text = runs_text(block).strip()
            if not text:
                continue
            # split on "1." "2." … — Word often runs items together: "1. Thursday2. Tuesday3. …"
            parts = re.split(r"(?<![\d:])(\d{1,2})\.\s*", re.sub(r"\*\*", "", text))
            words = [(parts[i], re.match(r"[A-Za-z][A-Za-z' -]*", parts[i + 1]).group(0).strip())
                     for i in range(1, len(parts) - 1, 2) if re.match(r"[A-Za-z]", parts[i + 1])]
            is_spell_para = (not first_table_seen and len(words) >= 3) or re.search(r"單字|拼字|spelling", text, re.I)
            if is_spell_para and words:
                for _, w in words:
                    w = w.strip()
                    if w and w not in spelling:
                        spelling.append(w)
            else:
                notes.append(re.sub(r"\*\*", "", text))
    if not spelling:
        warnings.append("no spelling list found (expected a numbered word list before the first table)")
    used = " ".join(d["question"] + " " + d["answer"] for d in drag)
    for w in spelling:
        if w[0].isupper() and w.split()[0].lower() in {"the", "by", "on", "a", "an"} and re.search(rf"\b{re.escape(w.lower())}\b", used.lower()):
            warnings.append(f"spelling '{w}' is capitalized but the sentences use '{w[0].lower() + w[1:]}' — spelling is case-sensitive, confirm the target with the teacher")
    if not drag:
        warnings.append("no question table found")
    ids = [d["id"] for d in drag]
    if len(ids) != len(set(ids)):
        warnings.append("duplicate question numbers in the tables")
    repeats = {}
    for d in drag:
        repeats.setdefault(d["question"] + " " + d["answer"], []).append(d["id"])
    for sent, group in repeats.items():
        if len(group) > 1:
            notes.append(f"same sentence used by {', '.join(group)} (different blanks) — place them apart in the story")
    return {"source": str(docx_path), "spelling": spelling, "drag": drag, "notes": notes, "warnings": warnings}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    src = Path(sys.argv[1])
    data = parse(src)
    out = Path(sys.argv[sys.argv.index("--out") + 1]) if "--out" in sys.argv else None
    if out:
        out.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    sys.stdout.reconfigure(encoding="utf-8")
    kinds = {}
    for d in data["drag"]:
        kinds[d["kind"]] = kinds.get(d["kind"], 0) + 1
    print(f"spelling {len(data['spelling'])}: {', '.join(data['spelling'])}")
    print(f"drag {len(data['drag'])}: " + ", ".join(f"{k} {v}" for k, v in kinds.items()))
    for d in data["drag"]:
        print(f"  {d['id']} [{d['kind']}] {d['questionMarked']} | {d['answerMarked']}")
    for n in data["notes"]:
        print("NOTE", n)
    for w in data["warnings"]:
        print("WARN", w)
    sys.exit(1 if not data["drag"] and not data["spelling"] else 0)
