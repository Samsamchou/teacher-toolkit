#!/usr/bin/env python3
"""Install or compare the canonical Ershui curriculum skill."""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sys
import time
import uuid
from pathlib import Path


SKILL_NAME = "ershui-local-curriculum-builder"
CANONICAL_SOURCE = Path(
    r"G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui\skills\ershui-local-curriculum-builder"
)
IGNORED_NAMES = {"__pycache__", ".DS_Store"}
IGNORED_SUFFIXES = {".pyc", ".pyo"}


def _included(path: Path) -> bool:
    return not any(part in IGNORED_NAMES for part in path.parts) and path.suffix not in IGNORED_SUFFIXES


def manifest(root: Path) -> dict[str, tuple[int, str]]:
    result: dict[str, tuple[int, str]] = {}
    if not root.is_dir():
        return result
    for path in sorted(p for p in root.rglob("*") if p.is_file() and _included(p.relative_to(root))):
        digest = hashlib.sha256()
        with path.open("rb") as handle:
            for block in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(block)
        result[path.relative_to(root).as_posix()] = (path.stat().st_size, digest.hexdigest().upper())
    return result


def manifest_digest(items: dict[str, tuple[int, str]]) -> str:
    digest = hashlib.sha256()
    for name, (size, sha) in sorted(items.items()):
        digest.update(f"{name}\0{size}\0{sha}\n".encode("utf-8"))
    return digest.hexdigest().upper()


def compare(source: Path, target: Path) -> tuple[bool, list[str]]:
    source_manifest = manifest(source)
    target_manifest = manifest(target)
    differences: list[str] = []
    for name in sorted(source_manifest.keys() - target_manifest.keys()):
        differences.append(f"MISSING_TARGET {name}")
    for name in sorted(target_manifest.keys() - source_manifest.keys()):
        differences.append(f"EXTRA_TARGET {name}")
    for name in sorted(source_manifest.keys() & target_manifest.keys()):
        if source_manifest[name] != target_manifest[name]:
            differences.append(f"HASH_MISMATCH {name}")
    return not differences, differences


def _copy_to_stage(source: Path, stage: Path) -> None:
    def ignore(directory: str, names: list[str]) -> set[str]:
        ignored = {name for name in names if name in IGNORED_NAMES}
        ignored.update(name for name in names if Path(name).suffix in IGNORED_SUFFIXES)
        return ignored

    shutil.copytree(source, stage, ignore=ignore)


def sync(source: Path, target: Path) -> Path | None:
    target_parent = target.parent
    target_parent.mkdir(parents=True, exist_ok=True)
    stage = target_parent / f".{SKILL_NAME}-staging-{uuid.uuid4().hex}"
    backup: Path | None = None
    _copy_to_stage(source, stage)
    exact, differences = compare(source, stage)
    if not exact:
        shutil.rmtree(stage)
        raise RuntimeError("暫存副本驗證失敗: " + "; ".join(differences))

    try:
        if target.exists():
            backup = target_parent / f".{SKILL_NAME}-backup-{time.strftime('%Y%m%d-%H%M%S')}"
            if backup.exists():
                raise RuntimeError(f"備份路徑已存在: {backup}")
            target.rename(backup)
        stage.rename(target)
    except Exception:
        if stage.exists():
            shutil.rmtree(stage)
        if backup is not None and backup.exists() and not target.exists():
            backup.rename(target)
        raise
    return backup


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("check", "sync"))
    default_home = Path(os.environ.get("CODEX_HOME", Path.home() / ".codex"))
    parser.add_argument("--target", type=Path, default=default_home / "skills" / SKILL_NAME)
    args = parser.parse_args()

    source = Path(__file__).resolve().parents[1]
    if source != CANONICAL_SOURCE.resolve():
        print(f"ERROR: 只能從專案正式來源執行。偵測到 {source}", file=sys.stderr)
        return 2
    target = args.target.resolve()
    if target.name != SKILL_NAME or target.parent.name != "skills":
        print(f"ERROR: 目標必須是 skills/{SKILL_NAME}: {target}", file=sys.stderr)
        return 2
    if source == target:
        print("ERROR: 正式來源與安裝目標不可相同", file=sys.stderr)
        return 2

    if args.action == "sync":
        backup = sync(source, target)
        if backup:
            print(f"BACKUP={backup}")

    exact, differences = compare(source, target)
    source_manifest = manifest(source)
    target_manifest = manifest(target)
    print(f"SOURCE={source}")
    print(f"TARGET={target}")
    print(f"SOURCE_FILES={len(source_manifest)} TARGET_FILES={len(target_manifest)}")
    print(f"SOURCE_MANIFEST_SHA256={manifest_digest(source_manifest)}")
    print(f"TARGET_MANIFEST_SHA256={manifest_digest(target_manifest)}")
    print(f"EXACT={'true' if exact else 'false'}")
    for difference in differences:
        print(difference)
    return 0 if exact else 1


if __name__ == "__main__":
    sys.exit(main())
