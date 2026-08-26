#!/usr/bin/env python3
"""Read-only validation for Ershui local-curriculum folder and RDQ invariants."""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


SEMESTER_RE = re.compile(r"^\d{6}\s+在地課程[3-6]年級[上下]學期教案$")
UNIT_RE = re.compile(r"^.+\s+第(\d+)[-–](\d+)週$")
INDEX_RE = re.compile(r"^00_.+單元資料夾索引\.md$")
LESSON_DIR_RE = re.compile(r"^(\d{2})_第(\d+)節$")
SKELETON_COUNT_RE = re.compile(r"_(\d+)節骨架\.md$")
README_COUNT_RE = re.compile(r"正式節數[：:]\s*(\d+)\s*節?")
LESSON_ITEM_RE = re.compile(r"第\d+節")


@dataclass(frozen=True)
class Finding:
    severity: str
    code: str
    path: str
    message: str


def _frontmatter_status(path: Path) -> str | None:
    try:
        lines = path.read_text(encoding="utf-8-sig").splitlines()
    except OSError:
        return None
    if not lines or lines[0].strip() != "---":
        return None
    for line in lines[1:]:
        if line.strip() == "---":
            break
        if line.startswith("status:"):
            return line.split(":", 1)[1].strip()
    return None


def _read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8-sig")
    except OSError:
        return ""


def _lesson_count(unit: Path, entries: list[Path]) -> tuple[int | None, bool]:
    skeleton_counts = {
        int(match.group(1))
        for entry in entries
        if entry.is_file() and (match := SKELETON_COUNT_RE.search(entry.name))
    }
    readme = unit / "README.md"
    readme_match = README_COUNT_RE.search(_read_text(readme)) if readme.is_file() else None
    readme_count = int(readme_match.group(1)) if readme_match else None
    counts = set(skeleton_counts)
    if readme_count is not None:
        counts.add(readme_count)
    if len(counts) > 1:
        return None, True
    return (next(iter(counts)) if counts else None), False


def inspect_workspace(root: Path, required_rdq: list[Path] | None = None) -> list[Finding]:
    root = root.resolve()
    findings: list[Finding] = []
    if not root.is_dir():
        return [Finding("error", "ROOT_MISSING", str(root), "專案根目錄不存在")]

    semester_dirs = sorted(
        p for p in root.iterdir() if p.is_dir() and SEMESTER_RE.fullmatch(p.name)
    )
    if not semester_dirs:
        findings.append(Finding("warning", "NO_SEMESTER_ROOT", str(root), "找不到日期開頭的正式學期教案資料夾"))

    for semester in semester_dirs:
        indexes = [p for p in semester.iterdir() if p.is_file() and INDEX_RE.fullmatch(p.name)]
        if len(indexes) != 1:
            findings.append(Finding("error", "SEMESTER_INDEX", str(semester), "學期上層必須恰有一份 00_*單元資料夾索引.md"))
            index_text = ""
        else:
            try:
                index_text = indexes[0].read_text(encoding="utf-8-sig")
            except OSError:
                index_text = ""

        allowed_top_files = set(indexes)
        allowed_top_files.update(p for p in semester.iterdir() if p.is_file() and p.name == "README.md")
        for loose_file in sorted(p for p in semester.iterdir() if p.is_file() and p not in allowed_top_files):
            findings.append(Finding("error", "LOOSE_FILE", str(loose_file), "單元成果不得散落在學期上層"))

        unit_dirs = sorted(p for p in semester.iterdir() if p.is_dir())
        for unit in unit_dirs:
            match = UNIT_RE.fullmatch(unit.name)
            if not match:
                findings.append(Finding("error", "UNIT_NAME", str(unit), "資料夾名稱必須是「正式單元名稱 第起始週-結束週週」"))
                continue
            if int(match.group(1)) > int(match.group(2)):
                findings.append(Finding("error", "WEEK_RANGE", str(unit), "起始週不可大於結束週"))
            if index_text and unit.name not in index_text:
                findings.append(Finding("error", "INDEX_MISSING_UNIT", str(unit), "學期索引未列出此單元資料夾"))

            entries = list(unit.iterdir())
            lesson_dirs: dict[int, Path] = {}
            for entry in sorted(p for p in entries if p.is_dir()):
                lesson_match = LESSON_DIR_RE.fullmatch(entry.name)
                if lesson_match:
                    prefix = int(lesson_match.group(1))
                    number = int(lesson_match.group(2))
                    if prefix != number:
                        findings.append(Finding("error", "LESSON_FOLDER_NUMBER", str(entry), "節次資料夾的兩位數前綴必須等於節次"))
                    if number in lesson_dirs:
                        findings.append(Finding("error", "LESSON_FOLDER_DUPLICATE", str(entry), "同一節次只能有一個資料夾"))
                    lesson_dirs[number] = entry
                elif entry.name in {"_work", "_qa", "_staging", "_backup"}:
                    findings.append(Finding("error", "ROOT_SUPPORT_DIR", str(entry), "單元根目錄不得放節次工作、QA、暫存或備份資料夾"))
                elif LESSON_ITEM_RE.search(entry.name):
                    findings.append(Finding("error", "LOOSE_LESSON_ITEM", str(entry), "單一節次資料夾不得散落在單元根目錄"))

            for entry in sorted(p for p in entries if p.is_file() and LESSON_ITEM_RE.search(p.name)):
                findings.append(Finding("error", "LOOSE_LESSON_ITEM", str(entry), "單一節次檔案不得散落在單元根目錄"))

            official_count, count_conflict = _lesson_count(unit, entries)
            if count_conflict:
                findings.append(Finding("error", "LESSON_COUNT_CONFLICT", str(unit), "README與節次骨架記錄的正式節數不一致"))
            elif official_count is None:
                findings.append(Finding("warning", "LESSON_COUNT_UNKNOWN", str(unit), "尚未從正式來源記錄節數，無法驗證節次資料夾數"))
            else:
                expected = set(range(1, official_count + 1))
                actual = set(lesson_dirs)
                if actual != expected:
                    missing = sorted(expected - actual)
                    extra = sorted(actual - expected)
                    findings.append(Finding("error", "LESSON_FOLDER_COUNT", str(unit), f"正式{official_count}節必須建立等量連續資料夾；缺少={missing}，多餘={extra}"))

            lesson_started = False
            for number, lesson in sorted(lesson_dirs.items()):
                try:
                    lesson_entries = list(lesson.iterdir())
                except OSError:
                    findings.append(Finding("error", "LESSON_UNREADABLE", str(lesson), "節次資料夾無法讀取"))
                    continue
                substantive = [p for p in lesson_entries if p.name != "README.md"]
                if substantive:
                    lesson_started = True
                    expected_index = f"00_第{number}節工作索引.md"
                    if not any(p.is_file() and p.name == expected_index for p in lesson_entries):
                        findings.append(Finding("error", "LESSON_WORK_INDEX", str(lesson), f"已開始節次必須有 {expected_index}"))
                else:
                    readme = lesson / "README.md"
                    if not readme.is_file() or "尚未開始" not in _read_text(readme):
                        findings.append(Finding("error", "LESSON_PLACEHOLDER", str(lesson), "未開始節次必須以README標示尚未開始"))

            root_core = any(
                p.is_file()
                and (
                    p.name == "00_工作索引.md"
                    or "來源追溯與設計決定" in p.name
                    or "骨架" in p.name
                )
                for p in entries
            )
            if root_core or lesson_started:
                work_indexes = [p for p in entries if p.is_file() and p.name == "00_工作索引.md"]
                if len(work_indexes) != 1:
                    findings.append(Finding("warning", "UNIT_WORK_INDEX", str(unit), "已開始單元應有一份 00_工作索引.md"))
                if not any(p.is_file() and p.name.startswith("01_") and "來源追溯與設計決定" in p.name for p in entries):
                    findings.append(Finding("warning", "TRACE_MISSING", str(unit), "已開始單元尚無 01_來源追溯與設計決定"))
                if not any(p.is_file() and p.name.startswith("02_") and "骨架" in p.name for p in entries):
                    findings.append(Finding("warning", "SKELETON_MISSING", str(unit), "已開始單元尚無 02_節次骨架"))

    for rdq in required_rdq or []:
        path = rdq if rdq.is_absolute() else root / rdq
        if not path.is_file():
            findings.append(Finding("error", "RDQ_MISSING", str(path), "指定 RDQ 不存在"))
            continue
        status = _frontmatter_status(path)
        if status != "confirmed":
            findings.append(Finding("error", "RDQ_NOT_CONFIRMED", str(path), f"指定 RDQ 狀態為 {status!r}，必須是 confirmed"))

    return findings


def main() -> int:
    default_root = Path(__file__).resolve().parents[3]
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=default_root)
    parser.add_argument("--require-confirmed-rdq", action="append", default=[], type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    findings = inspect_workspace(args.root, args.require_confirmed_rdq)
    summary = {
        "root": str(args.root.resolve()),
        "errors": sum(item.severity == "error" for item in findings),
        "warnings": sum(item.severity == "warning" for item in findings),
        "findings": [asdict(item) for item in findings],
        "read_only": True,
    }
    if args.json:
        print(json.dumps(summary, ensure_ascii=False, indent=2))
    else:
        print(f"ROOT={summary['root']}")
        print(f"ERRORS={summary['errors']} WARNINGS={summary['warnings']} READ_ONLY=true")
        for item in findings:
            print(f"[{item.severity.upper()}] {item.code} | {item.path} | {item.message}")
    return 1 if summary["errors"] else 0


if __name__ == "__main__":
    sys.exit(main())
