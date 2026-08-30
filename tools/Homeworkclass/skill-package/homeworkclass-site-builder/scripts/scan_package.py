#!/usr/bin/env python3
"""Fail-closed identity, secret, and unsafe-file scanner for Skill/clone output."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path, PurePosixPath
from typing import Any


TEXT_EXTENSIONS = {
    "", ".cjs", ".css", ".csv", ".html", ".js", ".json", ".lock", ".md",
    ".mjs", ".py", ".rules", ".svg", ".toml", ".ts", ".tsx", ".txt",
    ".yaml", ".yml",
}
TEXT_FILE_NAMES = {".env.example", "firestore.rules.template"}
ASSET_MANIFEST_RELATIVE = PurePosixPath("assets/asset-manifest.json")
SKILL_BINARY_ALLOWLIST = {".xlsx", ".png", ".jpg", ".jpeg", ".webp"}
CLONE_IMAGE_ALLOWLIST = {".png", ".jpg", ".jpeg", ".webp"}
MANIFEST_CONTROLLED_TEXT_ASSETS = {".svg"}
CLONE_PROHIBITED_SUFFIXES = {
    ".xlsx", ".xls", ".xlsm", ".xlsb", ".zip", ".7z", ".rar", ".tar",
    ".gz", ".bz2", ".xz", ".db", ".sqlite", ".sqlite3", ".map",
}
EXPECTED_MEDIA_TYPES = {
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
}
DISALLOWED_NAMES = {
    ".firebaserc", ".secret.local", "firebase-debug.log", "firestore-debug.log",
}
DISALLOWED_DIRS = {
    ".firebase", ".git", ".codex-remote-attachments", "dist", "lib", "node_modules",
    "__pycache__",
}
SUSPICIOUS_FILE_PARTS = {"backup", "firestore-export", "service-account", "session", "cookie"}
SECRET_PATTERNS = {
    "SEC001_PRIVATE_KEY": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "SEC001_GOOGLE_API_KEY": re.compile(r"AIza[0-9A-Za-z_-]{30,}"),
    "SEC001_JWT": re.compile(r"\beyJ[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\.[0-9A-Za-z_-]{8,}\b"),
    "SEC001_SERVICE_ACCOUNT": re.compile(r'"(?:private_key|private_key_id|client_email)"\s*:'),
    "SEC002_BCRYPT": re.compile(r"\$2[aby]\$\d{2}\$[./0-9A-Za-z]{53}"),
    "SEC002_PIN_CONTEXT": re.compile(r"(?i)\b(?:pin|passcode|通行碼)\b[^\r\n]{0,40}\b\d{6}\b"),
    "SEC002_SESSION": re.compile(r"(?i)\b(?:session|cookie|refresh[_-]?token|access[_-]?token)\b\s*[:=]\s*['\"][^'\"]{12,}"),
}
EMAIL_PATTERN = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
ABSOLUTE_PATH_PATTERN = re.compile(r"(?i)(?:\b[A-Z]:[\\/](?:Users|Documents|我的雲端硬碟|115)|/Users/|/home/)")
SHA256_PATTERN = re.compile(r"^[0-9a-fA-F]{64}$")
MAX_XLSX_ENTRIES = 2048
MAX_XLSX_MEMBER_BYTES = 10 * 1024 * 1024
MAX_XLSX_TOTAL_BYTES = 50 * 1024 * 1024
MAX_XLSX_COMPRESSION_RATIO = 200
REQUIRED_XLSX_MEMBERS = {
    "[Content_Types].xml", "_rels/.rels", "xl/workbook.xml",
}


def fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8", errors="ignore")).hexdigest().upper()[:12]


def add_hit(
    hits: list[dict[str, Any]],
    rule: str,
    root: Path,
    path: Path,
    *,
    line: int | None = None,
    value: str = "",
    member: str = "",
    deny_values: list[str] | None = None,
) -> None:
    try:
        relative = path.relative_to(root).as_posix()
    except ValueError:
        relative = "<outside-root>"
    deny_values = deny_values or []
    path_is_sensitive = (
        EMAIL_PATTERN.search(relative) is not None
        or ABSOLUTE_PATH_PATTERN.search(relative) is not None
        or any(pattern.search(relative) for pattern in SECRET_PATTERNS.values())
        or any(deny.casefold() in relative.casefold() for deny in deny_values)
    )
    hit: dict[str, Any] = {
        "rule_id": rule,
        "path": "<redacted-path>" if path_is_sensitive else relative,
        "pathFingerprint": fingerprint(relative),
        "line": line,
        "fingerprint": fingerprint(value) if value else "",
    }
    if member:
        hit["memberFingerprint"] = fingerprint(member)
    hits.append(hit)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().lower()


def scan_text_content(
    content: str,
    hits: list[dict[str, Any]],
    root: Path,
    path: Path,
    deny_values: list[str],
    *,
    member: str = "",
    skip_generic_email: bool = False,
) -> None:
    for line_number, line in enumerate(content.splitlines(), start=1):
        for rule, pattern in SECRET_PATTERNS.items():
            match = pattern.search(line)
            if match:
                add_hit(
                    hits, rule, root, path, line=line_number, value=match.group(0),
                    member=member, deny_values=deny_values,
                )
        if not skip_generic_email:
            email = EMAIL_PATTERN.search(line)
            if email:
                add_hit(
                    hits, "ID002_EMAIL", root, path, line=line_number,
                    value=email.group(0), member=member, deny_values=deny_values,
                )
        scanner_pattern_definition = (
            path.name == "scan_package.py"
            and "ABSOLUTE_PATH_PATTERN = re.compile" in line
        )
        absolute = None if scanner_pattern_definition else ABSOLUTE_PATH_PATTERN.search(line)
        if absolute:
            add_hit(
                hits, "ID002_ABSOLUTE_PATH", root, path, line=line_number,
                value=absolute.group(0), member=member, deny_values=deny_values,
            )
        folded = line.casefold()
        for deny in deny_values:
            if deny.casefold() in folded:
                add_hit(
                    hits, "ID001_SOURCE_IDENTITY", root, path, line=line_number,
                    value=deny, member=member, deny_values=deny_values,
                )


def safe_manifest_relative(value: Any) -> PurePosixPath | None:
    if not isinstance(value, str) or not value or "\\" in value:
        return None
    if value.startswith("/") or re.match(r"^[A-Za-z]:", value) or "//" in value:
        return None
    parsed = PurePosixPath(value)
    if parsed.is_absolute() or any(part in {"", ".", ".."} for part in parsed.parts):
        return None
    return parsed


def load_asset_manifest(
    root: Path,
    hits: list[dict[str, Any]],
    deny_values: list[str],
) -> tuple[dict[str, dict[str, Any]], bool]:
    manifest_path = root.joinpath(*ASSET_MANIFEST_RELATIVE.parts)
    if not manifest_path.exists():
        return {}, False
    if manifest_path.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(manifest_path)):
        add_hit(hits, "FS001_LINK", root, manifest_path, deny_values=deny_values)
        return {}, True
    try:
        payload = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        add_hit(hits, "SRC002_ASSET_MANIFEST_INVALID", root, manifest_path, deny_values=deny_values)
        return {}, True
    if not isinstance(payload, dict) or payload.get("schemaVersion") != 1 or not isinstance(payload.get("assets"), list):
        add_hit(hits, "SRC002_ASSET_MANIFEST_INVALID", root, manifest_path, deny_values=deny_values)
        return {}, True

    entries: dict[str, dict[str, Any]] = {}
    allowed_manifest_suffixes = SKILL_BINARY_ALLOWLIST | MANIFEST_CONTROLLED_TEXT_ASSETS
    for index, item in enumerate(payload["assets"]):
        marker = f"entry-{index}"
        if not isinstance(item, dict):
            add_hit(
                hits, "SRC002_ASSET_MANIFEST_INVALID", root, manifest_path,
                value=marker, deny_values=deny_values,
            )
            continue
        relative = safe_manifest_relative(item.get("path"))
        purpose = item.get("purpose")
        expected_bytes = item.get("bytes")
        expected_sha = item.get("sha256")
        media_type = item.get("mediaType")
        if (
            relative is None
            or not isinstance(purpose, str)
            or not purpose.strip()
            or type(expected_bytes) is not int
            or expected_bytes < 1
            or not isinstance(expected_sha, str)
            or SHA256_PATTERN.fullmatch(expected_sha) is None
        ):
            add_hit(
                hits, "SRC002_ASSET_MANIFEST_INVALID", root, manifest_path,
                value=marker, deny_values=deny_values,
            )
            continue
        relative_text = relative.as_posix()
        key = relative_text.casefold()
        suffix = relative.suffix.lower()
        if key in entries or suffix not in allowed_manifest_suffixes:
            add_hit(
                hits, "SRC002_ASSET_MANIFEST_INVALID", root, manifest_path,
                value=relative_text, deny_values=deny_values,
            )
            continue
        if media_type != EXPECTED_MEDIA_TYPES.get(suffix):
            add_hit(
                hits, "SRC002_ASSET_MEDIA_TYPE_MISMATCH", root, manifest_path,
                value=relative_text, deny_values=deny_values,
            )
        if any(part in DISALLOWED_DIRS for part in relative.parts):
            add_hit(
                hits, "SRC002_ASSET_MANIFEST_INVALID", root, manifest_path,
                value=relative_text, deny_values=deny_values,
            )
            continue
        target = root.joinpath(*relative.parts)
        try:
            target.resolve(strict=False).relative_to(root)
        except ValueError:
            add_hit(
                hits, "SRC002_ASSET_MANIFEST_INVALID", root, manifest_path,
                value=relative_text, deny_values=deny_values,
            )
            continue
        entry = {
            "path": relative_text,
            "bytes": expected_bytes,
            "sha256": expected_sha.lower(),
            "purpose": purpose.strip(),
            "mediaType": media_type,
        }
        entries[key] = entry
        if not target.is_file():
            add_hit(
                hits, "SRC002_MANIFEST_ASSET_MISSING", root, target,
                value=relative_text, deny_values=deny_values,
            )
            continue
        if target.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(target)):
            add_hit(hits, "FS001_LINK", root, target, deny_values=deny_values)
            continue
        actual_bytes = target.stat().st_size
        actual_sha = file_sha256(target)
        if actual_bytes != expected_bytes:
            add_hit(
                hits, "SRC002_ASSET_SIZE_MISMATCH", root, target,
                value=str(actual_bytes), deny_values=deny_values,
            )
        if actual_sha != expected_sha.lower():
            add_hit(
                hits, "SRC002_ASSET_HASH_MISMATCH", root, target,
                value=actual_sha, deny_values=deny_values,
            )
    return entries, True


def xml_local_name(name: str) -> str:
    return name.rsplit("}", 1)[-1]


def decode_ooxml_text(data: bytes) -> str | None:
    for encoding in ("utf-8-sig", "utf-16"):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return None


def inspect_xlsx(
    root: Path,
    path: Path,
    hits: list[dict[str, Any]],
    deny_values: list[str],
) -> None:
    if not zipfile.is_zipfile(path):
        add_hit(hits, "XLSX001_INVALID_ZIP", root, path, deny_values=deny_values)
        return
    try:
        with zipfile.ZipFile(path) as archive:
            infos = archive.infolist()
            if len(infos) > MAX_XLSX_ENTRIES:
                add_hit(hits, "XLSX001_ZIP_LIMIT", root, path, value=str(len(infos)), deny_values=deny_values)
                return
            names: set[str] = set()
            safe_infos: list[zipfile.ZipInfo] = []
            total_size = 0
            expansion_safe = True
            for info in infos:
                if info.is_dir():
                    continue
                member = info.filename
                parsed = PurePosixPath(member)
                invalid_member = (
                    not member
                    or "\\" in member
                    or member.startswith("/")
                    or re.match(r"^[A-Za-z]:", member) is not None
                    or parsed.is_absolute()
                    or any(part in {"", ".", ".."} for part in parsed.parts)
                )
                if invalid_member:
                    add_hit(
                        hits, "XLSX001_ZIP_STRUCTURE", root, path, value=member,
                        member=member, deny_values=deny_values,
                    )
                    expansion_safe = False
                    continue
                lower = parsed.as_posix().casefold()
                if lower in names:
                    add_hit(
                        hits, "XLSX001_ZIP_STRUCTURE", root, path, value=member,
                        member=member, deny_values=deny_values,
                    )
                    expansion_safe = False
                    continue
                names.add(lower)
                if info.flag_bits & 0x1:
                    add_hit(hits, "XLSX001_ENCRYPTED", root, path, member=member, deny_values=deny_values)
                    expansion_safe = False
                total_size += info.file_size
                ratio = info.file_size / max(info.compress_size, 1)
                if (
                    info.file_size > MAX_XLSX_MEMBER_BYTES
                    or total_size > MAX_XLSX_TOTAL_BYTES
                    or ratio > MAX_XLSX_COMPRESSION_RATIO
                ):
                    add_hit(
                        hits, "XLSX001_ZIP_LIMIT", root, path, value=str(info.file_size),
                        member=member, deny_values=deny_values,
                    )
                    expansion_safe = False
                if "vbaproject" in lower or "/macrosheets/" in lower or "/dialogsheets/" in lower:
                    add_hit(hits, "XLSX001_MACRO", root, path, member=member, deny_values=deny_values)
                if lower.startswith("xl/activex/") or lower.startswith("xl/embeddings/"):
                    add_hit(hits, "XLSX001_EMBEDDED_OBJECT", root, path, member=member, deny_values=deny_values)
                if lower.startswith("xl/externallinks/"):
                    add_hit(hits, "XLSX001_EXTERNAL_LINK", root, path, member=member, deny_values=deny_values)
                safe_infos.append(info)

            missing = {item.casefold() for item in REQUIRED_XLSX_MEMBERS} - names
            for required in sorted(missing):
                add_hit(
                    hits, "XLSX001_ZIP_STRUCTURE", root, path, value=required,
                    deny_values=deny_values,
                )
            if not expansion_safe:
                return
            bad_member = archive.testzip()
            if bad_member:
                add_hit(
                    hits, "XLSX001_INVALID_ZIP", root, path, value=bad_member,
                    member=bad_member, deny_values=deny_values,
                )
                return

            for info in safe_infos:
                member = info.filename
                suffix = PurePosixPath(member).suffix.lower()
                if suffix not in {".xml", ".rels"}:
                    continue
                try:
                    data = archive.read(info)
                except (OSError, RuntimeError, zipfile.BadZipFile):
                    add_hit(
                        hits, "XLSX001_INVALID_ZIP", root, path, member=member,
                        deny_values=deny_values,
                    )
                    continue
                text = decode_ooxml_text(data)
                if text is None:
                    add_hit(
                        hits, "XLSX001_XML_ENCODING", root, path, member=member,
                        deny_values=deny_values,
                    )
                    continue
                if "<!DOCTYPE" in text.upper() or "<!ENTITY" in text.upper():
                    add_hit(
                        hits, "XLSX001_UNSAFE_XML", root, path, member=member,
                        deny_values=deny_values,
                    )
                scan_text_content(text, hits, root, path, deny_values, member=member)
                try:
                    xml_root = ET.fromstring(data)
                except ET.ParseError:
                    add_hit(
                        hits, "XLSX001_XML_INVALID", root, path, member=member,
                        deny_values=deny_values,
                    )
                    continue

                lower_member = member.casefold()
                if lower_member == "[content_types].xml" and (
                    "macroenabled" in text.casefold() or "vbaproject" in text.casefold()
                ):
                    add_hit(hits, "XLSX001_MACRO", root, path, member=member, deny_values=deny_values)
                if suffix == ".rels":
                    for element in xml_root.iter():
                        attributes = {xml_local_name(key).casefold(): str(value) for key, value in element.attrib.items()}
                        target_mode = attributes.get("targetmode", "").casefold()
                        relation_type = attributes.get("type", "").casefold()
                        target = attributes.get("target", "")
                        if (
                            target_mode == "external"
                            or "externallink" in relation_type
                            or re.match(r"(?i)^(?:https?|file):", target)
                            or re.match(r"(?i)^[A-Z]:[\\/]", target)
                            or target.startswith("\\\\")
                        ):
                            add_hit(
                                hits, "XLSX001_EXTERNAL_LINK", root, path,
                                value=target or relation_type, member=member,
                                deny_values=deny_values,
                            )
                            break
                if lower_member == "xl/workbook.xml":
                    for element in xml_root.iter():
                        local = xml_local_name(element.tag).casefold()
                        if local == "sheet" and element.attrib.get("state", "visible").casefold() != "visible":
                            add_hit(
                                hits, "XLSX001_HIDDEN_SHEET", root, path,
                                value=element.attrib.get("name", "hidden"), member=member,
                                deny_values=deny_values,
                            )
                        if local == "definedname" and element.attrib.get("hidden", "0").casefold() in {"1", "true"}:
                            add_hit(
                                hits, "XLSX001_HIDDEN_DATA", root, path,
                                member=member, deny_values=deny_values,
                            )
                if lower_member.startswith("xl/worksheets/"):
                    formula_found = False
                    hidden_data_found = False
                    for element in xml_root.iter():
                        local = xml_local_name(element.tag).casefold()
                        if local == "f":
                            formula_found = True
                        if local in {"row", "col"} and element.attrib.get("hidden", "0").casefold() in {"1", "true"}:
                            hidden_data_found = True
                    if formula_found:
                        add_hit(hits, "XLSX001_FORMULA", root, path, member=member, deny_values=deny_values)
                    if hidden_data_found:
                        add_hit(hits, "XLSX001_HIDDEN_DATA", root, path, member=member, deny_values=deny_values)
    except (OSError, RuntimeError, zipfile.BadZipFile, zipfile.LargeZipFile):
        add_hit(hits, "XLSX001_INVALID_ZIP", root, path, deny_values=deny_values)


def validate_image_signature(root: Path, path: Path, hits: list[dict[str, Any]], deny_values: list[str]) -> None:
    try:
        header = path.read_bytes()[:16]
    except OSError:
        add_hit(hits, "SRC001_IMAGE_INVALID", root, path, deny_values=deny_values)
        return
    suffix = path.suffix.lower()
    valid = (
        (suffix == ".png" and header.startswith(b"\x89PNG\r\n\x1a\n"))
        or (suffix in {".jpg", ".jpeg"} and header.startswith(b"\xff\xd8\xff"))
        or (suffix == ".webp" and header.startswith(b"RIFF") and header[8:12] == b"WEBP")
    )
    if not valid:
        add_hit(hits, "SRC001_IMAGE_INVALID", root, path, deny_values=deny_values)


def scan(args: argparse.Namespace) -> int:
    requested_root = Path(args.root)
    if requested_root.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(requested_root)):
        print("ROOT_LINK_NOT_ALLOWED", file=sys.stderr)
        return 2
    root = requested_root.resolve()
    output = Path(args.output).resolve()
    if not root.is_dir():
        print("ROOT_NOT_FOUND", file=sys.stderr)
        return 2
    try:
        output.relative_to(root)
        print("OUTPUT_MUST_BE_OUTSIDE_SCAN_ROOT", file=sys.stderr)
        return 2
    except ValueError:
        pass
    deny_values = [value for value in args.deny_value if value]
    hits: list[dict[str, Any]] = []
    file_count = 0
    text_count = 0
    binary_count = 0
    manifest_entries, manifest_present = load_asset_manifest(root, hits, deny_values)
    manifest_missing_reported = False

    for current, directories, files in os.walk(root, topdown=True, followlinks=False):
        current_path = Path(current)
        directories.sort()
        files.sort()
        for directory in list(directories):
            candidate = current_path / directory
            if candidate.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(candidate)):
                add_hit(hits, "FS001_LINK", root, candidate, deny_values=deny_values)
                directories.remove(directory)
            elif directory in DISALLOWED_DIRS:
                add_hit(hits, "FS002_DISALLOWED_DIR", root, candidate, deny_values=deny_values)
                directories.remove(directory)

        for filename in files:
            path = current_path / filename
            if path.is_symlink() or (hasattr(os.path, "isjunction") and os.path.isjunction(path)):
                add_hit(hits, "FS001_LINK", root, path, deny_values=deny_values)
                continue
            try:
                path.resolve().relative_to(root)
            except (OSError, ValueError):
                add_hit(hits, "FS001_LINK", root, path, deny_values=deny_values)
                continue
            if not path.is_file():
                continue
            file_count += 1
            relative = path.relative_to(root).as_posix()
            manifest_entry = manifest_entries.get(relative.casefold())
            if path.name in DISALLOWED_NAMES or (path.name.startswith(".env") and path.name != ".env.example"):
                add_hit(hits, "CFG001_PRIVATE_CONFIG", root, path, deny_values=deny_values)
            lower_name = path.name.lower()
            if any(part in lower_name for part in SUSPICIOUS_FILE_PARTS):
                add_hit(hits, "DATA002_SUSPICIOUS_FILE", root, path, deny_values=deny_values)
            suffix = path.suffix.lower()
            if suffix not in TEXT_EXTENSIONS and path.name not in TEXT_FILE_NAMES:
                binary_count += 1
                if not manifest_present and not manifest_missing_reported:
                    add_hit(
                        hits, "SRC002_ASSET_MANIFEST_MISSING", root,
                        root.joinpath(*ASSET_MANIFEST_RELATIVE.parts), deny_values=deny_values,
                    )
                    manifest_missing_reported = True
                if manifest_entry is None:
                    add_hit(hits, "SRC002_BINARY_NOT_MANIFESTED", root, path, deny_values=deny_values)

                if args.profile == "skill":
                    if suffix not in SKILL_BINARY_ALLOWLIST:
                        add_hit(hits, "SRC001_UNAPPROVED_BINARY", root, path, deny_values=deny_values)
                    elif suffix == ".xlsx":
                        inspect_xlsx(root, path, hits, deny_values)
                    elif suffix in CLONE_IMAGE_ALLOWLIST and manifest_entry is not None:
                        validate_image_signature(root, path, hits, deny_values)
                else:
                    if suffix in CLONE_PROHIBITED_SUFFIXES:
                        add_hit(hits, "SRC001_CLONE_PROHIBITED_BINARY", root, path, deny_values=deny_values)
                    elif suffix not in CLONE_IMAGE_ALLOWLIST:
                        add_hit(hits, "SRC001_UNAPPROVED_BINARY", root, path, deny_values=deny_values)
                    elif manifest_entry is not None:
                        validate_image_signature(root, path, hits, deny_values)
                continue

            text_count += 1
            if suffix in MANIFEST_CONTROLLED_TEXT_ASSETS and manifest_entry is None:
                if not manifest_present and not manifest_missing_reported:
                    add_hit(
                        hits, "SRC002_ASSET_MANIFEST_MISSING", root,
                        root.joinpath(*ASSET_MANIFEST_RELATIVE.parts), deny_values=deny_values,
                    )
                    manifest_missing_reported = True
                add_hit(hits, "SRC002_BINARY_NOT_MANIFESTED", root, path, deny_values=deny_values)
            try:
                content = path.read_text(encoding="utf-8")
            except (OSError, UnicodeDecodeError):
                add_hit(hits, "SRC001_UNREADABLE_TEXT", root, path, deny_values=deny_values)
                continue
            scan_text_content(
                content, hits, root, path, deny_values,
                skip_generic_email=path.name in {"package-lock.json", "pnpm-lock.yaml", "yarn.lock"},
            )

    status = "PASS" if not hits else "BLOCKED"
    report = {
        "schemaVersion": 1,
        "profile": args.profile,
        "status": status,
        "rootFingerprint": fingerprint(root.name),
        "counts": {
            "files": file_count,
            "textFiles": text_count,
            "binaryFiles": binary_count,
            "hits": len(hits),
            "sourceIdentityHits": sum(hit["rule_id"] == "ID001_SOURCE_IDENTITY" for hit in hits),
            "secretHits": sum(hit["rule_id"].startswith("SEC") for hit in hits),
            "absolutePathHits": sum(hit["rule_id"] == "ID002_ABSOLUTE_PATH" for hit in hits),
            "unapprovedBinaryCount": sum(
                hit["rule_id"] in {
                    "SRC001_UNAPPROVED_BINARY", "SRC001_CLONE_PROHIBITED_BINARY",
                    "SRC002_BINARY_NOT_MANIFESTED",
                }
                for hit in hits
            ),
            "assetManifestFailures": sum(hit["rule_id"].startswith("SRC002_") for hit in hits),
            "xlsxSecurityHits": sum(hit["rule_id"].startswith("XLSX") for hit in hits),
            "manifestEntries": len(manifest_entries),
        },
        "hits": hits,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": status, "counts": report["counts"]}, ensure_ascii=False))
    return 0 if status == "PASS" else 2


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan a Homeworkclass Skill or clone")
    parser.add_argument("--root", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--profile", choices=["skill", "clone"], required=True)
    parser.add_argument("--deny-value", action="append", default=[])
    return scan(parser.parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
