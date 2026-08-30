#!/usr/bin/env python3
"""Create a sanitized Homeworkclass clone from confirmed normalized input.

This command never logs in, creates Firebase resources, writes `.firebaserc`, or
deploys. The destination must not exist.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


FORBIDDEN_PARTS = {
    ".git", ".firebase", ".codex-remote-attachments", "node_modules", "dist",
    "__pycache__", "lib",
}
FORBIDDEN_FILES = {".firebaserc", ".secret.local", "firebase-debug.log", "firestore-debug.log"}


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def json_literal_list(values: list[str]) -> str:
    return "[" + ", ".join("'" + value + "'" for value in values) + "]"


def seat_expression(classes: list[dict[str, Any]]) -> str:
    clauses = []
    for item in classes:
        seats = ", ".join(str(int(seat)) for seat in item.get("seats", []))
        clauses.append(f"(classId == '{item['id']}' && seatNumber in [{seats}])")
    return "(" + " || ".join(clauses) + ")" if clauses else "false"


def safe_copy(template: Path, destination: Path) -> None:
    template_real = template.resolve()
    for source in sorted(template.rglob("*")):
        relative = source.relative_to(template)
        if any(part in FORBIDDEN_PARTS for part in relative.parts):
            continue
        if source.name in FORBIDDEN_FILES or (source.name.startswith(".env") and source.name != ".env.example"):
            continue
        if source.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(source)):
            raise ValueError(f"Template contains a link: {relative.as_posix()}")
        if source.resolve() != template_real and template_real not in source.resolve().parents:
            raise ValueError(f"Template path escapes root: {relative.as_posix()}")
        target = destination / relative
        if source.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif source.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)


def replace_placeholders(root: Path, replacements: dict[str, str]) -> None:
    text_suffixes = {"", ".css", ".html", ".js", ".json", ".md", ".mjs", ".rules", ".ts", ".tsx", ".txt", ".yaml", ".yml"}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in text_suffixes:
            continue
        try:
            content = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        updated = content
        for marker, value in replacements.items():
            updated = updated.replace(marker, value)
        if updated != content:
            path.write_text(updated, encoding="utf-8")


def bootstrap(args: argparse.Namespace) -> int:
    normalized_path = Path(args.normalized).resolve()
    approval_path = Path(args.approval).resolve()
    template = Path(args.template).resolve()
    output = Path(args.output).resolve()
    if output.exists():
        print(f"OUTPUT_MUST_NOT_EXIST: {output}", file=sys.stderr)
        return 2
    if not template.is_dir():
        print(f"TEMPLATE_NOT_FOUND: {template}", file=sys.stderr)
        return 2
    try:
        normalized = json.loads(normalized_path.read_text(encoding="utf-8"))
        approval = json.loads(approval_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"INPUT_INVALID: {type(exc).__name__}", file=sys.stderr)
        return 2
    normalized_hash = hashlib.sha256(canonical_bytes(normalized)).hexdigest()
    expected_review = f"HC1-{str(approval.get('reviewHashFull', ''))[:12].upper()}"
    if (
        approval.get("status") != "READY"
        or approval.get("approvalScope") != "source-only"
        or approval.get("normalizedSha256") != normalized_hash
        or approval.get("reviewHash") != expected_review
        or not approval.get("sourceFiles")
    ):
        print("SOURCE_GATE_MISMATCH", file=sys.stderr)
        return 2
    if approval.get("deploymentAuthorized") is not False:
        print("INVALID_APPROVAL_SCOPE", file=sys.stderr)
        return 2
    semester = normalized.get("semester", {})
    required = [semester.get("id"), semester.get("siteTitle"), normalized.get("classes"), normalized.get("subjects"), normalized.get("periods")]
    if not all(required):
        print("NORMALIZED_INPUT_INCOMPLETE", file=sys.stderr)
        return 2

    output.parent.mkdir(parents=True, exist_ok=True)
    staging = output.parent / f".{output.name}.building-{uuid.uuid4().hex[:12]}"
    try:
        staging.mkdir(parents=False, exist_ok=False)
        safe_copy(template, staging)
        data_path = staging / "src" / "data" / "semester.json"
        data_path.parent.mkdir(parents=True, exist_ok=True)
        data_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        rules_template = staging / "firestore.rules.template"
        if not rules_template.is_file():
            raise ValueError("firestore.rules.template is missing")
        rules = rules_template.read_text(encoding="utf-8")
        rules_replacements = {
            "__ACTIVE_SEMESTER_ID__": str(semester["id"]),
            "__VALID_CLASS_IDS__": json_literal_list([item["id"] for item in normalized["classes"]]),
            "__VALID_SUBJECT_IDS__": json_literal_list([item["id"] for item in normalized["subjects"]]),
            "__VALID_PERIOD_IDS__": json_literal_list([item["id"] for item in normalized["periods"]]),
            "__VALID_SEAT_EXPRESSION__": seat_expression(normalized["classes"]),
        }
        for marker, value in rules_replacements.items():
            rules = rules.replace(marker, value)
        remaining = [marker for marker in rules_replacements if marker in rules]
        if remaining:
            raise ValueError("unresolved Firestore Rules markers")
        (staging / "firestore.rules").write_text(rules, encoding="utf-8")
        rules_template.unlink()

        replace_placeholders(staging, {
            "__SITE_TITLE__": str(semester["siteTitle"]),
            "__SEMESTER_ID__": str(semester["id"]),
            "__SEMESTER_LABEL__": str(semester.get("label", semester["id"])),
        })
        if (staging / ".firebaserc").exists():
            raise ValueError("template must not create .firebaserc")

        audit = staging / "audit"
        audit.mkdir(parents=True, exist_ok=True)
        (audit / "normalized-semester.json").write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (audit / "source-gate.json").write_text(json.dumps(approval, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        files = []
        for path in sorted(staging.rglob("*")):
            if path.is_file() and path.name != "clone-manifest.json":
                files.append({"path": path.relative_to(staging).as_posix(), "bytes": path.stat().st_size, "sha256": sha256_file(path)})
        manifest = {
            "schemaVersion": 1,
            "mode": "teacher-clone",
            "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "semesterId": semester["id"],
            "normalizedSha256": normalized_hash,
            "sourceReviewHash": approval.get("reviewHash"),
            "deploymentAuthorized": False,
            "files": files,
        }
        (audit / "clone-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        (staging / "BUILD-REPORT.md").write_text(
            "\n".join([
                "# Homeworkclass 本機重製報告", "",
                f"- 網站：{semester['siteTitle']}",
                f"- 學期：{semester['id']}",
                f"- 班級／座號／科目／節次／固定課程：{len(normalized['classes'])}／{sum(len(item['seats']) for item in normalized['classes'])}／{len(normalized['subjects'])}／{len(normalized['periods'])}／{len(normalized['schedule'])}",
                "- 來源確認：已核對 review_hash；範圍只包含來源。",
                "- Firebase 正式部署：未授權、未執行。", "",
                "下一步是安裝依賴、執行本機與 Emulator QA，再提供精確部署計畫；不得自行部署。", "",
            ]),
            encoding="utf-8",
        )
        staging.rename(output)
    except Exception as exc:  # noqa: BLE001 - fail closed with type only
        if staging.exists():
            shutil.rmtree(staging)
        print(f"BOOTSTRAP_BLOCKED: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 2
    print(json.dumps({
        "operationStatus": "LOCAL_CLONE_CREATED",
        "finalState": "QA_PENDING",
        "output": str(output),
        "semesterId": semester["id"],
        "deploymentAuthorized": False,
    }, ensure_ascii=False))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a local sanitized Homeworkclass clone")
    parser.add_argument("--normalized", required=True)
    parser.add_argument("--approval", required=True)
    parser.add_argument("--template", required=True)
    parser.add_argument("--output", required=True)
    return bootstrap(parser.parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
