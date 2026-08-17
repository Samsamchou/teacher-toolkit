#!/usr/bin/env python3
"""Validate that the Markdown review sheet and website JSON describe one identical question bank."""

from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from pathlib import Path


BANK_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BANK_DIR.parent
JSON_PATH = BANK_DIR / "HWG7-U01-L1-vocabulary-quiz.json"
MARKDOWN_PATH = BANK_DIR / "HWG7-U01-L1-vocabulary-quiz.review.md"


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
        if not line.startswith("| hwg7-u01-l1-"):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != 9:
            raise ValueError(f"Markdown line {line_number}: expected 9 columns, found {len(cells)}")
        if current_set is None:
            raise ValueError(f"Markdown line {line_number}: question row is outside a question set")
        rows.append(
            {
                "setId": current_set,
                "number": cells[0],
                "id": cells[1],
                "sourceFilename": cells[2],
                "options": cells[4:8],
                "correctAnswer": cells[8],
            }
        )
    return rows


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def main() -> int:
    errors: list[str] = []
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    markdown_rows = parse_markdown_rows(MARKDOWN_PATH.read_text(encoding="utf-8"))

    json_questions: list[tuple[str, dict[str, object]]] = []
    for question_set in data.get("questionSets", []):
        set_id = question_set.get("id")
        questions = question_set.get("questions", [])
        if set_id not in {"type-a", "type-b"}:
            fail(errors, f"Unexpected question-set ID: {set_id!r}")
        if not isinstance(questions, list):
            fail(errors, f"{set_id}: questions must be a list")
            continue
        for question in questions:
            json_questions.append((str(set_id), question))

    expected_counts = {"type-a": 10, "type-b": 8}
    actual_counts = Counter(set_id for set_id, _ in json_questions)
    if actual_counts != expected_counts:
        fail(errors, f"Expected question counts {expected_counts}, found {dict(actual_counts)}")
    if len(json_questions) != 18:
        fail(errors, f"Expected 18 JSON questions, found {len(json_questions)}")
    if len(markdown_rows) != 18:
        fail(errors, f"Expected 18 Markdown questions, found {len(markdown_rows)}")

    ids = [str(question.get("id")) for _, question in json_questions]
    duplicate_ids = sorted(question_id for question_id, count in Counter(ids).items() if count > 1)
    if duplicate_ids:
        fail(errors, f"Duplicate JSON question IDs: {duplicate_ids}")

    markdown_by_id = {str(row["id"]): row for row in markdown_rows}
    if len(markdown_by_id) != len(markdown_rows):
        fail(errors, "Duplicate Markdown question IDs")

    source_hash_checks = 0
    correct_position_counts: dict[str, Counter[int]] = {"type-a": Counter(), "type-b": Counter()}
    for set_id, question in json_questions:
        question_id = str(question.get("id"))
        options = question.get("reviewOptions")
        correct = question.get("correctAnswer")
        position = question.get("correctOptionNumberInReview")
        asset = question.get("asset")
        if not isinstance(options, list) or len(options) != 4:
            fail(errors, f"{question_id}: requires exactly four reviewOptions")
            continue
        if len(set(options)) != 4:
            fail(errors, f"{question_id}: reviewOptions must not contain duplicates")
        if not isinstance(position, int) or not 1 <= position <= 4:
            fail(errors, f"{question_id}: correctOptionNumberInReview must be 1–4")
        elif options[position - 1] != correct:
            fail(errors, f"{question_id}: correct answer does not match its review position")
        if correct not in options:
            fail(errors, f"{question_id}: correct answer is not one of the options")
        if question.get("runtimeShuffleOptions") is not True:
            fail(errors, f"{question_id}: runtimeShuffleOptions must be true")
        if isinstance(position, int):
            correct_position_counts[set_id][position] += 1

        if not isinstance(asset, dict):
            fail(errors, f"{question_id}: missing asset metadata")
            continue
        source_path = WORKSPACE_DIR / str(asset.get("sourcePath", ""))
        expected_hash = str(asset.get("sourceSha256", ""))
        expected_bytes = asset.get("sourceBytes")
        if not source_path.is_file():
            fail(errors, f"{question_id}: source asset is missing: {source_path}")
        else:
            if source_path.stat().st_size != expected_bytes:
                fail(errors, f"{question_id}: source byte count differs")
            if sha256(source_path) != expected_hash:
                fail(errors, f"{question_id}: source SHA-256 differs")
            source_hash_checks += 1

        markdown_row = markdown_by_id.get(question_id)
        if markdown_row is None:
            fail(errors, f"{question_id}: missing from Markdown review")
            continue
        if markdown_row["setId"] != set_id:
            fail(errors, f"{question_id}: Markdown question type differs")
        if markdown_row["sourceFilename"] != asset.get("sourceFilename"):
            fail(errors, f"{question_id}: Markdown source filename differs")
        if markdown_row["options"] != options:
            fail(errors, f"{question_id}: Markdown options differ")
        if markdown_row["correctAnswer"] != correct:
            fail(errors, f"{question_id}: Markdown correct answer differs")

    json_id_set = set(ids)
    extra_markdown_ids = sorted(set(markdown_by_id) - json_id_set)
    if extra_markdown_ids:
        fail(errors, f"Markdown has unknown question IDs: {extra_markdown_ids}")

    report = {
        "status": "PASS" if not errors else "FAIL",
        "jsonFile": JSON_PATH.name,
        "markdownFile": MARKDOWN_PATH.name,
        "jsonSha256": sha256(JSON_PATH),
        "markdownSha256": sha256(MARKDOWN_PATH),
        "questionCounts": dict(actual_counts),
        "markdownQuestionCount": len(markdown_rows),
        "sourceAssetHashChecks": source_hash_checks,
        "correctAnswerPositionCounts": {
            key: {str(position): count for position, count in sorted(counter.items())}
            for key, counter in correct_position_counts.items()
        },
        "errors": errors,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
