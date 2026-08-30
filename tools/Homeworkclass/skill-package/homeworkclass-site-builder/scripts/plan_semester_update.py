#!/usr/bin/env python3
"""Create a read-only plan for adding a semester to an existing project."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


SKIP_PARTS = {".git", ".firebase", ".codex-remote-attachments", "node_modules", "dist", "lib", "__pycache__"}
PRIVATE_NAMES = {".firebaserc", ".secret.local"}


def canonical_hash(value: Any) -> str:
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def plan(args: argparse.Namespace) -> int:
    project = Path(args.project).resolve()
    normalized_path = Path(args.normalized).resolve()
    approval_path = Path(args.approval).resolve()
    output = Path(args.output).resolve()
    if not project.is_dir():
        print("PROJECT_NOT_FOUND", file=sys.stderr)
        return 2
    if output.exists():
        print("OUTPUT_MUST_NOT_EXIST", file=sys.stderr)
        return 2
    try:
        normalized = json.loads(normalized_path.read_text(encoding="utf-8"))
        approval = json.loads(approval_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"INPUT_INVALID: {type(exc).__name__}", file=sys.stderr)
        return 2
    normalized_hash = canonical_hash(normalized)
    expected_review = f"HC1-{str(approval.get('reviewHashFull', ''))[:12].upper()}"
    if (
        approval.get("status") != "READY"
        or approval.get("approvalScope") != "source-only"
        or approval.get("normalizedSha256") != normalized_hash
        or approval.get("reviewHash") != expected_review
        or approval.get("deploymentAuthorized") is not False
    ):
        print("SOURCE_APPROVAL_MISMATCH", file=sys.stderr)
        return 2

    text_files: list[Path] = []
    runtime_files: list[Path] = []
    semester_registry_files: list[Path] = []
    private_files: list[str] = []
    rules_path = project / "firestore.rules"
    for path in sorted(project.rglob("*")):
        relative = path.relative_to(project)
        if any(part in SKIP_PARTS for part in relative.parts):
            continue
        if not path.is_file():
            continue
        if path.name in PRIVATE_NAMES or (path.name.startswith(".env") and path.name != ".env.example"):
            private_files.append(relative.as_posix())
            continue
        if path.suffix.lower() in {"", ".css", ".html", ".js", ".json", ".md", ".mjs", ".rules", ".ts", ".tsx", ".yaml", ".yml"}:
            text_files.append(path)
            relative_parts = relative.parts
            in_runtime_tree = bool(relative_parts and relative_parts[0] in {"src", "functions"})
            is_test = any(part in {"test", "tests", "__tests__"} for part in relative_parts) or ".test." in path.name or ".spec." in path.name
            if path == rules_path or (in_runtime_tree and not is_test):
                runtime_files.append(path)
            if relative.as_posix() in {
                "src/data/semester.json", "src/data/semesters.json",
                "src/config/semester.json", "src/config/semesters.json",
            }:
                semester_registry_files.append(path)

    combined = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in runtime_files)
    registry_values: list[dict[str, Any]] = []
    for path in semester_registry_files:
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(value, dict):
                registry_values.append(value)
        except json.JSONDecodeError:
            pass
    has_structured_registry = bool(registry_values)
    has_semester_ids = has_structured_registry and "semesterId" in combined
    has_active_semester = has_structured_registry and ("activeSemesterId" in combined or "ACTIVE_SEMESTER" in combined)
    rules_text = rules_path.read_text(encoding="utf-8", errors="ignore") if rules_path.is_file() else ""
    rules_semester_aware = "semesterId" in rules_text and ("activeSemester" in rules_text or "ACTIVE_SEMESTER" in rules_text)
    legacy_v1 = not (has_semester_ids and has_active_semester and rules_semester_aware)
    status = "REQUIRES_LEGACY_V1_ADAPTER_OR_MIGRATION" if legacy_v1 else "READY_FOR_ISOLATED_UPDATE"
    new_semester_id = normalized.get("semester", {}).get("id", "")
    registry_text = "\n".join(path.read_text(encoding="utf-8", errors="ignore") for path in semester_registry_files)
    duplicate_id_hint = bool(new_semester_id and new_semester_id in registry_text)
    if duplicate_id_hint:
        status = "BLOCKED_DUPLICATE_SEMESTER_ID"

    report = {
        "schemaVersion": 1,
        "status": status,
        "blocking": status != "READY_FOR_ISOLATED_UPDATE",
        "projectName": project.name,
        "newSemesterId": new_semester_id,
        "normalizedSha256": normalized_hash,
        "sourceReviewHash": approval.get("reviewHash"),
        "deploymentAuthorized": False,
        "checks": {
            "hasSemesterIds": has_semester_ids,
            "hasStructuredSemesterRegistry": has_structured_registry,
            "hasActiveSemesterState": has_active_semester,
            "rulesSemesterAware": rules_semester_aware,
            "duplicateSemesterIdHint": duplicate_id_hint,
            "privateFilesDetectedWithoutReading": len(private_files),
            "textFilesInspected": len(text_files),
            "runtimeFilesInspected": len(runtime_files),
            "semesterRegistryFilesInspected": len(semester_registry_files),
        },
        "requiredSequence": [
            "Create a complete isolated project copy without private files or dependencies.",
            "Export and read back current-semester record IDs, counts, and hashes.",
            "For legacy v1, implement either a read-only legacy adapter or an explicitly authorized Admin migration.",
            "Add the confirmed semester definition and keep exactly one writable active semester.",
            "Make UI and Firestore Rules reject writes to archived semesters.",
            "Run unit tests, Rules Emulator, build, responsive QA, export readback, and identity/secret scans.",
            "Present the exact Firebase change scope and wait for a separate deployment authorization.",
        ],
    }
    output.mkdir(parents=True, exist_ok=False)
    (output / "semester-update-plan.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    lines = [
        "# Homeworkclass 學期更新計畫", "",
        f"- 狀態：**{status}**",
        f"- 目標專案：`{project.name}`",
        f"- 新學期：`{new_semester_id}`",
        f"- 私有設定檔：偵測到 {len(private_files)} 個；未讀取、未複製。",
        "- Firebase 正式部署：未授權、未執行。", "",
        "## 必經順序", "",
    ]
    lines.extend(f"{index}. {step}" for index, step in enumerate(report["requiredSequence"], start=1))
    if legacy_v1:
        lines.extend(["", "## 阻擋說明", "", "此專案仍是沒有 `semesterId` 的 legacy v1。不得只替換課表或直接部署新 Rules；先建立唯讀 adapter，或另行授權並完成可回復的 Admin migration。"])
    if duplicate_id_hint:
        lines.extend(["", "## 阻擋說明", "", "在目標原始碼中找到相同學期 ID；必須確認是重跑、既有草稿或真正衝突，不得新增重複版本。"])
    (output / "semester-update-plan.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps({"status": status, "output": str(output), "deploymentAuthorized": False}, ensure_ascii=False))
    return 0 if status == "READY_FOR_ISOLATED_UPDATE" else 2


def main() -> int:
    parser = argparse.ArgumentParser(description="Plan an isolated Homeworkclass semester update")
    parser.add_argument("--project", required=True)
    parser.add_argument("--normalized", required=True)
    parser.add_argument("--approval", required=True)
    parser.add_argument("--output", required=True)
    return plan(parser.parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
