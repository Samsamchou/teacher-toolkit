#!/usr/bin/env python3
"""Validate revision 1 of the HWG5 U01 Lesson 1 question bank."""

from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path


BANK_DIR = Path(__file__).resolve().parent
WORKSPACE_DIR = BANK_DIR.parent
JSON_PATH = BANK_DIR / "HWG5-U01-L1-vocabulary-quiz-r1.json"
MARKDOWN_PATH = BANK_DIR / "HWG5-U01-L1-vocabulary-quiz.review-r1.md"
EXPECTED_DAYS = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def jpeg_dimensions(path: Path) -> tuple[int, int]:
    start_of_frame_markers = {
        0xC0,
        0xC1,
        0xC2,
        0xC3,
        0xC5,
        0xC6,
        0xC7,
        0xC9,
        0xCA,
        0xCB,
        0xCD,
        0xCE,
        0xCF,
    }
    with path.open("rb") as source:
        if source.read(2) != b"\xff\xd8":
            raise ValueError(f"Not a JPEG: {path}")
        while True:
            prefix = source.read(1)
            if not prefix:
                break
            if prefix != b"\xff":
                continue
            marker = source.read(1)
            while marker == b"\xff":
                marker = source.read(1)
            if not marker:
                break
            marker_value = marker[0]
            if marker_value in {0xD8, 0xD9}:
                continue
            length_bytes = source.read(2)
            if len(length_bytes) != 2:
                break
            segment_length = int.from_bytes(length_bytes, "big")
            if segment_length < 2:
                break
            if marker_value in start_of_frame_markers:
                precision_and_size = source.read(5)
                if len(precision_and_size) != 5:
                    break
                height = int.from_bytes(precision_and_size[1:3], "big")
                width = int.from_bytes(precision_and_size[3:5], "big")
                return width, height
            source.seek(segment_length - 2, 1)
    raise ValueError(f"JPEG dimensions not found: {path}")


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
        if len(cells) != 9 or not cells[1].startswith("hwg5-u01-l1-"):
            continue
        if current_set is None:
            raise ValueError(
                f"Markdown line {line_number}: question row is outside a question set"
            )
        asset_parts = [part.strip() for part in cells[2].split("→", maxsplit=1)]
        rows.append(
            {
                "setId": current_set,
                "id": cells[1],
                "assetFilename": asset_parts[0],
                "processedFilename": asset_parts[1] if len(asset_parts) == 2 else None,
                "prompt": cells[3],
                "options": cells[4:8],
                "correctAnswer": cells[8],
            }
        )
    return rows


def filename_day(filename: str) -> str | None:
    match = re.fullmatch(r"\d{2}_([A-Za-z]+)\.(?:jpg|mp3)", filename)
    return match.group(1) if match else None


def main() -> int:
    errors: list[str] = []
    data = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    markdown_rows = parse_markdown_rows(MARKDOWN_PATH.read_text(encoding="utf-8"))
    question_sets = data.get("questionSets", [])
    json_questions: list[tuple[str, str, dict[str, object]]] = []
    for question_set in question_sets:
        set_id = str(question_set.get("id"))
        prompt = str(question_set.get("prompt"))
        for question in question_set.get("questions", []):
            json_questions.append((set_id, prompt, question))

    expected_counts = {"type-a": 7, "type-b": 7}
    actual_counts = Counter(set_id for set_id, _, _ in json_questions)
    if actual_counts != expected_counts:
        errors.append(f"Expected {expected_counts}, found {dict(actual_counts)}")
    if len(markdown_rows) != 14:
        errors.append(f"Expected 14 Markdown rows, found {len(markdown_rows)}")
    if data.get("reviewStatus") != "approved_teacher_2026-09-07":
        errors.append("Question bank must record the teacher approval status")
    approval = data.get("approval", {})
    if approval.get("confirmedBy") != "teacher":
        errors.append("Question bank must record teacher confirmation")
    if approval.get("evidence") != "核准 7 張圖片與 14 題題庫":
        errors.append("Question bank approval evidence differs from the teacher confirmation")
    if data.get("lesson", {}).get("quizId") != "hwg5-u01-l1-vocabulary":
        errors.append("Unexpected quizId")

    markdown_by_id = {str(row["id"]): row for row in markdown_rows}
    ids = [str(question.get("id")) for _, _, question in json_questions]
    if len(set(ids)) != len(ids):
        errors.append("Duplicate JSON question IDs")
    if len(markdown_by_id) != len(markdown_rows):
        errors.append("Duplicate Markdown question IDs")

    source_asset_checks = 0
    processed_image_checks = 0
    provenance_checks = 0
    position_counts: dict[str, Counter[int]] = {
        "type-a": Counter(),
        "type-b": Counter(),
    }
    answers_by_set: dict[str, list[str]] = {"type-a": [], "type-b": []}
    filenames_by_set: dict[str, list[str]] = {"type-a": [], "type-b": []}

    for set_id, prompt, question in json_questions:
        question_id = str(question.get("id"))
        options = question.get("options")
        answer = str(question.get("correctAnswer"))
        position = question.get("correctOptionNumberInReview")
        filename = str(question.get("assetFilename"))
        answers_by_set[set_id].append(answer)
        filenames_by_set[set_id].append(filename)

        if not isinstance(options, list) or len(options) != 4:
            errors.append(f"{question_id}: requires exactly four options")
            continue
        if len(set(options)) != 4:
            errors.append(f"{question_id}: duplicate options")
        if any(option not in EXPECTED_DAYS for option in options):
            errors.append(f"{question_id}: option outside Sunday-Saturday")
        if not isinstance(position, int) or not 1 <= position <= 4:
            errors.append(f"{question_id}: invalid correct option number")
        elif options[position - 1] != answer:
            errors.append(f"{question_id}: answer does not match review position")
        if answer not in options:
            errors.append(f"{question_id}: answer missing from options")
        if question.get("runtimeShuffleOptions") is not True:
            errors.append(f"{question_id}: runtimeShuffleOptions must be true")
        if filename_day(filename) != answer:
            errors.append(f"{question_id}: filename and answer do not match")
        if isinstance(position, int):
            position_counts[set_id][position] += 1

        asset_group = "images" if set_id == "type-a" else "audio"
        group = data["assets"][asset_group]
        manifest = group["items"].get(filename)
        if manifest is None:
            errors.append(f"{question_id}: missing source manifest for {filename}")
        else:
            source_path = WORKSPACE_DIR / group["sourceRoot"] / filename
            if not source_path.is_file():
                errors.append(f"{question_id}: missing source asset {source_path}")
            else:
                if source_path.stat().st_size != manifest["sourceBytes"]:
                    errors.append(f"{question_id}: source byte count differs")
                if sha256(source_path) != manifest["sourceSha256"]:
                    errors.append(f"{question_id}: source SHA-256 differs")
                source_asset_checks += 1
            if set_id == "type-a":
                processed_filename = str(manifest.get("processedFilename", ""))
                processed_path = WORKSPACE_DIR / group["processedRoot"] / processed_filename
                if not processed_path.is_file():
                    errors.append(f"{question_id}: missing processed image {processed_path}")
                else:
                    if processed_path.stat().st_size != manifest["processedBytes"]:
                        errors.append(f"{question_id}: processed byte count differs")
                    if sha256(processed_path) != manifest["processedSha256"]:
                        errors.append(f"{question_id}: processed SHA-256 differs")
                    try:
                        width, height = jpeg_dimensions(processed_path)
                        if width != manifest["processedWidth"]:
                            errors.append(f"{question_id}: processed width differs")
                        if height != manifest["processedHeight"]:
                            errors.append(f"{question_id}: processed height differs")
                    except ValueError as error:
                        errors.append(f"{question_id}: {error}")
                    processed_image_checks += 1

                provenance_path = (
                    WORKSPACE_DIR / group["processedRoot"] / manifest["provenanceFilename"]
                )
                if not provenance_path.is_file():
                    errors.append(f"{question_id}: missing image provenance JSON")
                else:
                    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
                    if provenance.get("model") != "gpt-image-2":
                        errors.append(f"{question_id}: unexpected provenance model")
                    if provenance.get("endpoint") != "/v1/images/edits":
                        errors.append(f"{question_id}: unexpected provenance endpoint")
                    if provenance.get("output_sha256") != manifest["processedSha256"]:
                        errors.append(f"{question_id}: provenance SHA-256 differs")
                    if provenance.get("request_id") != manifest["editRequestId"]:
                        errors.append(f"{question_id}: provenance request ID differs")
                    provenance_checks += 1
            expected_value = manifest.get(
                "expectedAnswer" if set_id == "type-a" else "expectedUtterance"
            )
            if expected_value != answer:
                errors.append(f"{question_id}: manifest expected value differs")
            planned_path = str(manifest.get("plannedWebsitePath", ""))
            if not planned_path.startswith("/assets/hwg5-u01/"):
                errors.append(f"{question_id}: invalid planned website path")

        markdown_row = markdown_by_id.get(question_id)
        if markdown_row is None:
            errors.append(f"{question_id}: missing from Markdown")
        else:
            if markdown_row["setId"] != set_id:
                errors.append(f"{question_id}: Markdown type differs")
            if markdown_row["assetFilename"] != filename:
                errors.append(f"{question_id}: Markdown asset differs")
            expected_processed = (
                manifest.get("processedFilename") if set_id == "type-a" else None
            )
            if markdown_row["processedFilename"] != expected_processed:
                errors.append(f"{question_id}: Markdown processed asset differs")
            if markdown_row["prompt"] != prompt:
                errors.append(f"{question_id}: Markdown prompt differs")
            if markdown_row["options"] != options:
                errors.append(f"{question_id}: Markdown options differ")
            if markdown_row["correctAnswer"] != answer:
                errors.append(f"{question_id}: Markdown answer differs")

    for set_id in expected_counts:
        if answers_by_set[set_id] != EXPECTED_DAYS:
            errors.append(f"{set_id}: answers are not ordered Sunday-Saturday")

    image_stems = [Path(name).stem for name in filenames_by_set["type-a"]]
    audio_stems = [Path(name).stem for name in filenames_by_set["type-b"]]
    if image_stems != audio_stems:
        errors.append("Image/audio filename pairs do not match")

    extra_ids = sorted(set(markdown_by_id) - set(ids))
    if extra_ids:
        errors.append(f"Markdown has unknown question IDs: {extra_ids}")

    report = {
        "status": "PASS" if not errors else "FAIL",
        "revision": data.get("revision"),
        "reviewStatus": data.get("reviewStatus"),
        "jsonFile": JSON_PATH.name,
        "markdownFile": MARKDOWN_PATH.name,
        "jsonSha256": sha256(JSON_PATH),
        "markdownSha256": sha256(MARKDOWN_PATH),
        "questionCounts": dict(actual_counts),
        "markdownQuestionCount": len(markdown_rows),
        "sourceAssetHashChecks": source_asset_checks,
        "processedImageHashAndDimensionChecks": processed_image_checks,
        "imageProvenanceChecks": provenance_checks,
        "imageAudioPairCount": len(image_stems),
        "correctAnswerPositionCounts": {
            key: {str(position): count for position, count in sorted(counts.items())}
            for key, counts in position_counts.items()
        },
        "audioContentAudit": data["assets"]["audio"]["contentAuditStatus"],
        "teacherApprovalRecorded": approval.get("confirmedBy") == "teacher",
        "errors": errors,
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
