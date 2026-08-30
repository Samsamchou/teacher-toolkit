#!/usr/bin/env python3
"""Offline deterministic tests for the Homeworkclass Skill package."""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path
from typing import Any
from xml.sax.saxutils import escape


def tree_hash(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(root.rglob("*")):
        if path.is_file() and "__pycache__" not in path.parts:
            digest.update(path.relative_to(root).as_posix().encode("utf-8"))
            digest.update(hashlib.sha256(path.read_bytes()).digest())
    return digest.hexdigest().upper()


def run(command: list[str], expected: int) -> subprocess.CompletedProcess[str]:
    result = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    if result.returncode != expected:
        raise AssertionError(f"Unexpected exit {result.returncode}, expected {expected}: {command[1]}\n{result.stderr[-500:]}")
    return result


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def check(condition: bool, code: str) -> None:
    """Fail deterministically even when Python is invoked with ``-O``."""
    if not condition:
        raise RuntimeError(f"SELF_TEST_FAILED:{code}")


def write_asset_manifest(
    root: Path,
    asset: Path,
    *,
    sha256: str | None = None,
    byte_count: int | None = None,
) -> None:
    relative = asset.relative_to(root).as_posix()
    payload = {
        "schemaVersion": 1,
        "assets": [{
            "path": relative,
            "purpose": "Synthetic offline scanner fixture",
            "mediaType": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "bytes": asset.stat().st_size if byte_count is None else byte_count,
            "sha256": hashlib.sha256(asset.read_bytes()).hexdigest() if sha256 is None else sha256,
        }],
    }
    target = root / "assets" / "asset-manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_synthetic_xlsx(
    path: Path,
    *,
    shared_text: str = "synthetic workbook",
    hidden_sheet: bool = False,
    external_link: bool = False,
    macro: bool = False,
) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    state = ' state="hidden"' if hidden_sheet else ""
    macro_override = (
        '<Override PartName="/xl/vbaProject.bin" '
        'ContentType="application/vnd.ms-office.vbaProject"/>'
        if macro else ""
    )
    external_relationship = (
        '<Relationship Id="rId2" '
        'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" '
        'Target="https://example.invalid/synthetic" TargetMode="External"/>'
        if external_link else ""
    )
    members: dict[str, bytes] = {
        "[Content_Types].xml": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/xl/workbook.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '<Override PartName="/xl/sharedStrings.xml" '
            'ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'
            f'{macro_override}</Types>'
        ).encode("utf-8"),
        "_rels/.rels": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" '
            'Target="xl/workbook.xml"/>'
            '</Relationships>'
        ).encode("utf-8"),
        "xl/workbook.xml": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            f'<sheets><sheet name="Synthetic" sheetId="1"{state} r:id="rId1"/></sheets>'
            '</workbook>'
        ).encode("utf-8"),
        "xl/_rels/workbook.xml.rels": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" '
            'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" '
            'Target="worksheets/sheet1.xml"/>'
            f'{external_relationship}</Relationships>'
        ).encode("utf-8"),
        "xl/worksheets/sheet1.xml": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            '<sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row></sheetData>'
            '</worksheet>'
        ).encode("utf-8"),
        "xl/sharedStrings.xml": (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="1" uniqueCount="1">'
            f'<si><t>{escape(shared_text)}</t></si></sst>'
        ).encode("utf-8"),
    }
    if macro:
        members["xl/vbaProject.bin"] = b"synthetic-macro-marker"
    with zipfile.ZipFile(path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in members.items():
            archive.writestr(name, data)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Homeworkclass Skill offline self-tests")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    if output.exists():
        print("OUTPUT_MUST_NOT_EXIST", file=sys.stderr)
        return 2
    output.parent.mkdir(parents=True, exist_ok=True)
    skill = Path(__file__).resolve().parent.parent
    pipeline = skill / "scripts" / "source_pipeline.py"
    bootstrap = skill / "scripts" / "bootstrap_clone.py"
    scanner = skill / "scripts" / "scan_package.py"
    workbook = skill / "assets" / "homeworkclass-input-v1.xlsx"
    valid_fixture = skill / "assets" / "fixtures" / "valid-semester.json"
    invalid_fixture = skill / "assets" / "fixtures" / "invalid-semester.json"
    template = skill / "assets" / "homeworkclass-template"
    tests: list[dict[str, Any]] = []

    with tempfile.TemporaryDirectory(
        prefix="homeworkclass-skill-self-test-", dir=output.parent
    ) as temporary:
        temp = Path(temporary)
        before = tree_hash(skill)

        for name, source in [("xlsx-a", workbook), ("xlsx-b", workbook), ("json-valid", valid_fixture)]:
            target = temp / name
            run([sys.executable, str(pipeline), "validate", "--input", str(source), "--output", str(target)], 0)
            report = read_json(target / "validation-report.json")
            check(report["status"] == "NEEDS_CONFIRMATION", f"{name}-status")
            check(
                report["counts"] == {"classes": 3, "seats": 12, "subjects": 4, "periods": 9, "schedule_slots": 7},
                f"{name}-counts",
            )
            tests.append({"name": name, "status": "PASS", "normalizedSha256": report["normalized_sha256"]})

        xlsx_a = read_json(temp / "xlsx-a" / "validation-report.json")
        xlsx_b = read_json(temp / "xlsx-b" / "validation-report.json")
        check(xlsx_a["normalized_sha256"] == xlsx_b["normalized_sha256"], "xlsx-deterministic")
        tests.append({"name": "xlsx-deterministic", "status": "PASS"})

        invalid_target = temp / "json-invalid"
        run([sys.executable, str(pipeline), "validate", "--input", str(invalid_fixture), "--output", str(invalid_target)], 2)
        invalid_report = read_json(invalid_target / "validation-report.json")
        required_codes = {"E-SEAT-DUPLICATE", "E-FOREIGN-KEY", "E-TIME-RANGE", "E-SLOT-COLLISION"}
        actual_codes = {item["code"] for item in invalid_report["issues"]}
        check(invalid_report["status"] == "BLOCKED" and required_codes <= actual_codes, "negative-source")
        tests.append({"name": "negative-source", "status": "PASS", "codes": sorted(required_codes)})

        valid_dir = temp / "json-valid"
        valid_report = read_json(valid_dir / "validation-report.json")
        approval = temp / "source-gate.json"
        run([
            sys.executable, str(pipeline), "approve", "--report", str(valid_dir / "validation-report.json"),
            "--review-hash", valid_report["review_hash"], "--output", str(approval),
        ], 0)
        approval_data = read_json(approval)
        check(
            approval_data["approvalScope"] == "source-only" and approval_data["deploymentAuthorized"] is False,
            "source-gate-scope",
        )
        tests.append({"name": "source-gate-scope", "status": "PASS"})

        clone = temp / "generated-clone"
        run([
            sys.executable, str(bootstrap), "--normalized", str(valid_dir / "normalized-semester.json"),
            "--approval", str(approval), "--template", str(template), "--output", str(clone),
        ], 0)
        check(not (clone / ".firebaserc").exists(), "sanitized-bootstrap-firebaserc")
        clone_manifest_path = clone / "audit" / "clone-manifest.json"
        check(clone_manifest_path.is_file(), "sanitized-bootstrap-clone-manifest")
        clone_manifest = read_json(clone_manifest_path)
        check(clone_manifest["deploymentAuthorized"] is False, "sanitized-bootstrap-deployment-scope")
        tests.append({"name": "sanitized-bootstrap", "status": "PASS", "files": len(clone_manifest["files"])})

        scan_report_path = temp / "clone-scan.json"
        run([
            sys.executable, str(scanner), "--root", str(clone), "--output", str(scan_report_path),
            "--profile", "clone", "--deny-value", "reference-project-do-not-copy",
        ], 0)
        scan_report = read_json(scan_report_path)
        check(scan_report["status"] == "PASS" and scan_report["counts"]["hits"] == 0, "clone-scan")
        tests.append({"name": "clone-scan", "status": "PASS", "files": scan_report["counts"]["files"]})

        unsafe = temp / "unsafe"
        unsafe.mkdir()
        injected = "-----BEGIN " + "PRIVATE KEY-----"
        (unsafe / "unsafe.txt").write_text(injected + "\n", encoding="utf-8")
        unsafe_report_path = temp / "unsafe-scan.json"
        unsafe_result = run([
            sys.executable, str(scanner), "--root", str(unsafe), "--output", str(unsafe_report_path), "--profile", "clone",
        ], 2)
        unsafe_report = read_json(unsafe_report_path)
        check(
            unsafe_report["status"] == "BLOCKED" and unsafe_report["counts"]["secretHits"] >= 1,
            "scanner-negative-redaction-status",
        )
        check(
            injected not in unsafe_result.stdout and injected not in unsafe_report_path.read_text(encoding="utf-8"),
            "scanner-negative-redaction-content",
        )
        tests.append({"name": "scanner-negative-redaction", "status": "PASS"})

        manifest_skill = temp / "manifest-skill"
        manifest_workbook = manifest_skill / "assets" / "homeworkclass-input-v1.xlsx"
        manifest_workbook.parent.mkdir(parents=True)
        shutil.copy2(workbook, manifest_workbook)
        write_asset_manifest(manifest_skill, manifest_workbook)
        manifest_scan_path = temp / "manifest-skill-scan.json"
        run([
            sys.executable, str(scanner), "--root", str(manifest_skill),
            "--output", str(manifest_scan_path), "--profile", "skill",
        ], 0)
        manifest_scan = read_json(manifest_scan_path)
        check(manifest_scan["status"] == "PASS", "scanner-manifest-xlsx-positive-status")
        check(manifest_scan["counts"]["manifestEntries"] == 1, "scanner-manifest-xlsx-positive-count")
        check(manifest_scan["counts"]["xlsxSecurityHits"] == 0, "scanner-manifest-xlsx-positive-security")
        tests.append({"name": "scanner-manifest-xlsx-positive", "status": "PASS"})

        unknown_binary = temp / "unknown-binary"
        unknown_binary.mkdir()
        unknown_payload = "synthetic-unknown-binary-payload"
        (unknown_binary / "unknown.bin").write_bytes(unknown_payload.encode("utf-8"))
        unknown_report_path = temp / "unknown-binary-scan.json"
        unknown_result = run([
            sys.executable, str(scanner), "--root", str(unknown_binary),
            "--output", str(unknown_report_path), "--profile", "skill",
        ], 2)
        unknown_report_text = unknown_report_path.read_text(encoding="utf-8")
        unknown_rules = {hit["rule_id"] for hit in read_json(unknown_report_path)["hits"]}
        check("SRC001_UNAPPROVED_BINARY" in unknown_rules, "scanner-unknown-binary-type")
        check("SRC002_BINARY_NOT_MANIFESTED" in unknown_rules, "scanner-unknown-binary-manifest")
        check(
            unknown_payload not in unknown_result.stdout + unknown_result.stderr + unknown_report_text,
            "scanner-unknown-binary-redaction",
        )
        tests.append({"name": "scanner-unknown-binary-blocked", "status": "PASS"})

        hash_mismatch = temp / "hash-mismatch"
        mismatch_workbook = hash_mismatch / "assets" / "homeworkclass-input-v1.xlsx"
        mismatch_workbook.parent.mkdir(parents=True)
        shutil.copy2(workbook, mismatch_workbook)
        write_asset_manifest(hash_mismatch, mismatch_workbook, sha256="0" * 64)
        mismatch_report_path = temp / "hash-mismatch-scan.json"
        run([
            sys.executable, str(scanner), "--root", str(hash_mismatch),
            "--output", str(mismatch_report_path), "--profile", "skill",
        ], 2)
        mismatch_rules = {hit["rule_id"] for hit in read_json(mismatch_report_path)["hits"]}
        check("SRC002_ASSET_HASH_MISMATCH" in mismatch_rules, "scanner-manifest-hash-mismatch")
        tests.append({"name": "scanner-manifest-hash-mismatch", "status": "PASS"})

        xlsx_sentinel = temp / "xlsx-sentinel"
        sentinel_workbook = xlsx_sentinel / "assets" / "sentinel.xlsx"
        sentinel_value = "REFERENCE_TENANT_SENTINEL_7F9A2C"
        write_synthetic_xlsx(sentinel_workbook, shared_text=sentinel_value)
        write_asset_manifest(xlsx_sentinel, sentinel_workbook)
        sentinel_report_path = temp / "xlsx-sentinel-scan.json"
        sentinel_result = run([
            sys.executable, str(scanner), "--root", str(xlsx_sentinel),
            "--output", str(sentinel_report_path), "--profile", "skill",
            "--deny-value", sentinel_value,
        ], 2)
        sentinel_report_text = sentinel_report_path.read_text(encoding="utf-8")
        sentinel_rules = {hit["rule_id"] for hit in read_json(sentinel_report_path)["hits"]}
        check("ID001_SOURCE_IDENTITY" in sentinel_rules, "scanner-xlsx-sentinel-detection")
        check(
            sentinel_value not in sentinel_result.stdout + sentinel_result.stderr + sentinel_report_text,
            "scanner-xlsx-sentinel-redaction",
        )
        tests.append({"name": "scanner-xlsx-sentinel-redacted", "status": "PASS"})

        unsafe_xlsx = temp / "unsafe-xlsx"
        unsafe_workbook = unsafe_xlsx / "assets" / "unsafe.xlsx"
        write_synthetic_xlsx(unsafe_workbook, hidden_sheet=True, external_link=True, macro=True)
        write_asset_manifest(unsafe_xlsx, unsafe_workbook)
        unsafe_xlsx_report_path = temp / "unsafe-xlsx-scan.json"
        run([
            sys.executable, str(scanner), "--root", str(unsafe_xlsx),
            "--output", str(unsafe_xlsx_report_path), "--profile", "skill",
        ], 2)
        unsafe_xlsx_rules = {hit["rule_id"] for hit in read_json(unsafe_xlsx_report_path)["hits"]}
        check(
            {"XLSX001_HIDDEN_SHEET", "XLSX001_EXTERNAL_LINK", "XLSX001_MACRO"} <= unsafe_xlsx_rules,
            "scanner-xlsx-structure-blocked",
        )
        tests.append({"name": "scanner-xlsx-structure-blocked", "status": "PASS"})

        clone_image = temp / "clone-image"
        clone_image.mkdir()
        (clone_image / "unmanifested.png").write_bytes(b"\x89PNG\r\n\x1a\nsynthetic")
        clone_image_report_path = temp / "clone-image-scan.json"
        run([
            sys.executable, str(scanner), "--root", str(clone_image),
            "--output", str(clone_image_report_path), "--profile", "clone",
        ], 2)
        clone_image_rules = {hit["rule_id"] for hit in read_json(clone_image_report_path)["hits"]}
        check("SRC002_BINARY_NOT_MANIFESTED" in clone_image_rules, "scanner-clone-image-needs-manifest")
        tests.append({"name": "scanner-clone-image-needs-manifest", "status": "PASS"})

        clone_prohibited = temp / "clone-prohibited"
        clone_prohibited.mkdir()
        for filename in ("bundle.js.map", "archive.zip", "records.db", "source.xlsx"):
            (clone_prohibited / filename).write_bytes(b"synthetic-prohibited")
        clone_prohibited_report_path = temp / "clone-prohibited-scan.json"
        run([
            sys.executable, str(scanner), "--root", str(clone_prohibited),
            "--output", str(clone_prohibited_report_path), "--profile", "clone",
        ], 2)
        prohibited_report = read_json(clone_prohibited_report_path)
        prohibited_rules = [hit["rule_id"] for hit in prohibited_report["hits"]]
        check(prohibited_rules.count("SRC001_CLONE_PROHIBITED_BINARY") == 4, "scanner-clone-prohibited-binaries")
        tests.append({"name": "scanner-clone-archive-db-map-xlsx-blocked", "status": "PASS"})

        after = tree_hash(skill)
        check(before == after, "skill-source-unchanged")
        tests.append({"name": "skill-source-unchanged", "status": "PASS", "treeSha256": before})

    not_run_gates = [
        "firestore-rules-emulator",
        "production-build",
        "responsive-qa",
        "export-readback",
        "production-deployment-readback",
    ]
    report = {
        "schemaVersion": 1,
        "status": "PACKAGE_SMOKE_PASS",
        "finalState": "QA_PENDING",
        "deploymentAuthorized": False,
        "notRunGates": not_run_gates,
        "tests": tests,
    }
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "status": "PACKAGE_SMOKE_PASS",
        "finalState": "QA_PENDING",
        "tests": len(tests),
        "notRunGates": not_run_gates,
        "deploymentAuthorized": False,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
