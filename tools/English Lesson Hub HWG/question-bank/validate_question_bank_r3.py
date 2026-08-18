#!/usr/bin/env python3
"""Validate revision 3 of the HWG7 U01 Lesson 1 question bank."""

from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from pathlib import Path


BANK_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BANK_DIR.parent
JSON_PATH = BANK_DIR / "HWG7-U01-L1-vocabulary-quiz-r3.json"
MARKDOWN_PATH = BANK_DIR / "HWG7-U01-L1-vocabulary-quiz.review-r3.md"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_markdown_rows(markdown: str) -> list[dict[str, object]]:
    current_set: str | None = None
    rows: list[dict[str, object]] = []
    for line_number, line in enumerate(markdown.splitlines(), start=1):
        if line.startswith("## Type A"):
            current_set = "type-a"
            continue
        if line.startswith("## Type B"):
            current_set = "type-b"
            continue
        if not line.startswith("|"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != 9 or not cells[1].startswith("hwg7-u01-l1-"):
            continue
        if current_set is None:
            raise ValueError(f"Markdown line {line_number}: question row is outside a question set")
        rows.append(
            {
                "setId": current_set,
                "id": cells[1],
                "assetFilename": cells[2],
                "options": cells[4:8],
                "correctAnswer": cells[8],
            }
        )
    return rows


def main() -> int:
    errors: list[str] = []
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    markdown_rows = parse_markdown_rows(MARKDOWN_PATH.read_text(encoding="utf-8"))
    question_sets = data.get("questionSets", [])
    json_questions: list[tuple[str, dict[str, object]]] = []
    for question_set in question_sets:
        set_id = str(question_set.get("id"))
        for question in question_set.get("questions", []):
            json_questions.append((set_id, question))

    expected_counts = {"type-a": 10, "type-b": 8}
    actual_counts = Counter(set_id for set_id, _ in json_questions)
    if actual_counts != expected_counts:
        errors.append(f"Expected {expected_counts}, found {dict(actual_counts)}")
    if len(markdown_rows) != 18:
        errors.append(f"Expected 18 Markdown rows, found {len(markdown_rows)}")

    markdown_by_id = {str(row["id"]): row for row in markdown_rows}
    ids = [str(question.get("id")) for _, question in json_questions]
    if len(set(ids)) != len(ids):
        errors.append("Duplicate JSON question IDs")
    if len(markdown_by_id) != len(markdown_rows):
        errors.append("Duplicate Markdown question IDs")

    source_asset_checks = 0
    position_counts: dict[str, Counter[int]] = {"type-a": Counter(), "type-b": Counter()}
    for set_id, question in json_questions:
        question_id = str(question.get("id"))
        options = question.get("options")
        answer = question.get("correctAnswer")
        position = question.get("correctOptionNumberInReview")
        if not isinstance(options, list) or len(options) != 4:
            errors.append(f"{question_id}: requires exactly four options")
            continue
        if len(set(options)) != 4:
            errors.append(f"{question_id}: duplicate options")
        if not isinstance(position, int) or not 1 <= position <= 4:
            errors.append(f"{question_id}: invalid correct option number")
        elif options[position - 1] != answer:
            errors.append(f"{question_id}: answer does not match review position")
        if answer not in options:
            errors.append(f"{question_id}: answer missing from options")
        if question.get("runtimeShuffleOptions") is not True:
            errors.append(f"{question_id}: runtimeShuffleOptions must be true")
        if isinstance(position, int):
            position_counts.setdefault(set_id, Counter())[position] += 1

        asset_group = "images" if set_id == "type-a" else "audio"
        group = data["assets"][asset_group]
        filename = str(question.get("assetFilename"))
        manifest = group["items"].get(filename)
        if manifest is None:
            errors.append(f"{question_id}: missing source manifest for {filename}")
        else:
            explicit_source_path = manifest.get("sourcePath")
            source_path = (
                WORKSPACE_DIR / str(explicit_source_path)
                if explicit_source_path else WORKSPACE_DIR / group["sourceRoot"] / filename
            )
            if not source_path.is_file():
                errors.append(f"{question_id}: missing source asset {source_path}")
            else:
                if source_path.stat().st_size != manifest["sourceBytes"]:
                    errors.append(f"{question_id}: source byte count differs")
                if sha256(source_path) != manifest["sourceSha256"]:
                    errors.append(f"{question_id}: source SHA-256 differs")
                source_asset_checks += 1
            planned_path = str(manifest.get("plannedWebsitePath", ""))
            if not planned_path.startswith("/assets/"):
                errors.append(f"{question_id}: invalid planned website path")

        markdown_row = markdown_by_id.get(question_id)
        if markdown_row is None:
            errors.append(f"{question_id}: missing from Markdown")
        else:
            if markdown_row["setId"] != set_id:
                errors.append(f"{question_id}: Markdown type differs")
            if markdown_row["assetFilename"] != filename:
                errors.append(f"{question_id}: Markdown asset differs")
            if markdown_row["options"] != options:
                errors.append(f"{question_id}: Markdown options differ")
            if markdown_row["correctAnswer"] != answer:
                errors.append(f"{question_id}: Markdown answer differs")

    extra_ids = sorted(set(markdown_by_id) - set(ids))
    if extra_ids:
        errors.append(f"Markdown has unknown question IDs: {extra_ids}")

    report = {
        "status": "PASS" if not errors else "FAIL",
        "revision": data.get("revision"),
        "jsonFile": JSON_PATH.name,
        "markdownFile": MARKDOWN_PATH.name,
        "jsonSha256": sha256(JSON_PATH),
        "markdownSha256": sha256(MARKDOWN_PATH),
        "questionCounts": dict(actual_counts),
        "markdownQuestionCount": len(markdown_rows),
        "sourceAssetHashChecks": source_asset_checks,
        "correctAnswerPositionCounts": {
            key: {str(position): count for position, count in sorted(counts.items())}
            for key, counts in position_counts.items()
        },
        "errors": errors
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
