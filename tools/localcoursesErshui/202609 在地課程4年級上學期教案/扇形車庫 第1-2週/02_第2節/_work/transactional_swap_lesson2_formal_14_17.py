from __future__ import annotations

import hashlib
import json
import shutil
import time
from datetime import datetime
from pathlib import Path


UNIT_DIR = Path(__file__).resolve().parents[1]
STAGING = UNIT_DIR / "_work" / "staging" / "lesson2_formal_imagegen_20260826"
FORMAL = STAGING / "formal_targets"
BACKUP_ROOT = UNIT_DIR / "_history" / "backups"

TARGET_NAMES = [
    "14_扇形車庫_第2節正式教材_學生版_20260826.pdf",
    "15_扇形車庫_第2節正式教材_教師答案版_20260826.pdf",
    "16_扇形車庫_第2節正式教材圖檔_20260826",
    "17_扇形車庫_第2節正式教材_教師確認與製作QA紀錄_20260826.md",
]

EXPECTED_BASELINE = {
    TARGET_NAMES[0]: {"bytes": 3_538_976, "sha256": "8C755B7C29E5E6111C528119D5BE8498CBFD47A22CAB2D78FA9BC15E49424516"},
    TARGET_NAMES[1]: {"bytes": 3_664_255, "sha256": "88B6301ABCD0D59F481E0CA21CEBE34235126F551F51710604F6BCD1DC124D33"},
    TARGET_NAMES[2]: {"file_count": 22, "bytes": 8_273_905},
    TARGET_NAMES[3]: {"bytes": 5_706, "sha256": "60257B29603D866DC97E9A82332C835559ED12BE38523583B608AB4C4CD29D55"},
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def file_records(root: Path) -> list[dict]:
    return [
        {
            "relative_path": path.relative_to(root).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
        for path in sorted(p for p in root.rglob("*") if p.is_file())
    ]


def describe(path: Path) -> dict:
    if path.is_file():
        return {
            "kind": "file",
            "name": path.name,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
    if path.is_dir():
        files = file_records(path)
        return {
            "kind": "directory",
            "name": path.name,
            "file_count": len(files),
            "bytes": sum(item["bytes"] for item in files),
            "files": files,
        }
    raise FileNotFoundError(path)


def same_description(left: dict, right: dict) -> bool:
    # Temporary siblings and backup copies intentionally have different names;
    # compare exact content and structure, not the container name.
    if left["kind"] != right["kind"]:
        return False
    if left["kind"] == "file":
        return left["bytes"] == right["bytes"] and left["sha256"] == right["sha256"]
    return (
        left["file_count"] == right["file_count"]
        and left["bytes"] == right["bytes"]
        and left["files"] == right["files"]
    )


def retry(label: str, operation, attempts: int = 5):
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        try:
            return operation()
        except (OSError, PermissionError) as error:
            last_error = error
            if attempt == attempts:
                break
            time.sleep(attempt)
    raise RuntimeError(f"{label} failed after {attempts} attempts") from last_error


def copy_exact(source: Path, destination: Path) -> None:
    if destination.exists():
        raise FileExistsError(destination)
    if source.is_dir():
        retry(f"copy directory {source.name}", lambda: shutil.copytree(source, destination))
    else:
        retry(f"copy file {source.name}", lambda: shutil.copy2(source, destination))


def remove_exact(path: Path) -> None:
    if not path.exists():
        return
    if path.is_dir():
        retry(f"remove directory {path.name}", lambda: shutil.rmtree(path))
    else:
        retry(f"remove file {path.name}", path.unlink)


def main() -> None:
    unit = UNIT_DIR.resolve()
    formal = FORMAL.resolve()
    if formal.parent != STAGING.resolve():
        raise RuntimeError("Staged formal targets escaped the expected staging directory")
    for name in TARGET_NAMES:
        if not (FORMAL / name).exists():
            raise FileNotFoundError(FORMAL / name)
        if not (UNIT_DIR / name).exists():
            raise FileNotFoundError(UNIT_DIR / name)

    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    backup_dir = BACKUP_ROOT / f"lesson2_formal_before_imagegen_{timestamp}"
    if backup_dir.resolve().parent != BACKUP_ROOT.resolve():
        raise RuntimeError("Backup path escaped the exact backup root")
    backup_dir.mkdir(parents=True, exist_ok=False)

    baseline: dict[str, dict] = {}
    for name in TARGET_NAMES:
        source = UNIT_DIR / name
        target = backup_dir / name
        baseline[name] = describe(source)
        expected = EXPECTED_BASELINE[name]
        for field, value in expected.items():
            if baseline[name].get(field) != value:
                raise AssertionError(
                    f"Current baseline drifted before backup: {name} {field}="
                    f"{baseline[name].get(field)!r}, expected {value!r}"
                )
        copy_exact(source, target)
        copied = describe(target)
        if not same_description(baseline[name], copied):
            raise AssertionError(f"Backup read-back mismatch: {name}")

    baseline_manifest = {
        "created_at": datetime.now().isoformat(timespec="seconds"),
        "purpose": "baseline before full ImageGen replacement of formal lesson 2 targets 14-17",
        "unit_directory": str(unit),
        "targets": baseline,
        "target_count": len(TARGET_NAMES),
        "total_files": sum(1 if item["kind"] == "file" else item["file_count"] for item in baseline.values()),
        "total_bytes": sum(item["bytes"] for item in baseline.values()),
    }
    baseline_path = backup_dir / "00_舊版14-17備份_manifest.json"
    baseline_path.write_text(json.dumps(baseline_manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    baseline_manifest_sha = sha256(baseline_path)

    staged_qa = FORMAL / TARGET_NAMES[3]
    backup_note = f"""

## 本次換版前舊版備份

- 備份資料夾：`{backup_dir}`
- 舊版基線：{baseline_manifest['total_files']} 檔，{baseline_manifest['total_bytes']:,} bytes。
- 基線 manifest：`{baseline_path.name}`；SHA-256 `{baseline_manifest_sha}`。
- 14–17 正式成果採交易式整套替換；換版後逐項讀回，任何失敗均以同層舊版暫存復原。
"""
    with staged_qa.open("a", encoding="utf-8", newline="\n") as handle:
        handle.write(backup_note)

    # First copy every staged target to a same-volume temporary sibling and verify it.
    temporary_new: dict[str, Path] = {}
    staged_descriptions: dict[str, dict] = {}
    for name in TARGET_NAMES:
        source = FORMAL / name
        temp = UNIT_DIR / f".__new__{timestamp}__{name}"
        if temp.resolve().parent != unit:
            raise RuntimeError(f"Temporary new path escaped unit directory: {temp}")
        staged_descriptions[name] = describe(source)
        copy_exact(source, temp)
        if not same_description(staged_descriptions[name], describe(temp)):
            raise AssertionError(f"Staged temporary read-back mismatch: {name}")
        temporary_new[name] = temp

    old_holders: dict[str, Path] = {}
    switched: list[str] = []
    try:
        for name in TARGET_NAMES:
            current = UNIT_DIR / name
            holder = UNIT_DIR / f".__old__{timestamp}__{name}"
            if holder.resolve().parent != unit or holder.exists():
                raise RuntimeError(f"Unsafe or occupied old holder: {holder}")
            retry(f"rename old {name}", lambda current=current, holder=holder: current.rename(holder))
            old_holders[name] = holder
            try:
                retry(
                    f"activate new {name}",
                    lambda temp=temporary_new[name], current=current: temp.rename(current),
                )
            except Exception:
                retry(f"restore unswitched {name}", lambda holder=holder, current=current: holder.rename(current))
                old_holders.pop(name, None)
                raise
            switched.append(name)

        for name in TARGET_NAMES:
            final_path = UNIT_DIR / name
            if not same_description(staged_descriptions[name], describe(final_path)):
                raise AssertionError(f"Formal read-back mismatch after swap: {name}")
    except Exception:
        rollback_errors: list[str] = []
        for name in reversed(switched):
            final_path = UNIT_DIR / name
            holder = old_holders[name]
            failed_new = UNIT_DIR / f".__failed_new__{timestamp}__{name}"
            try:
                if final_path.exists():
                    retry(
                        f"quarantine failed new {name}",
                        lambda final_path=final_path, failed_new=failed_new: final_path.rename(failed_new),
                    )
                if holder.exists():
                    retry(
                        f"rollback old {name}",
                        lambda holder=holder, final_path=final_path: holder.rename(final_path),
                    )
            except Exception as error:
                rollback_errors.append(f"{name}: {error}")
        if rollback_errors:
            raise RuntimeError("Swap failed and rollback had errors: " + " | ".join(rollback_errors))
        raise

    post: dict[str, dict] = {name: describe(UNIT_DIR / name) for name in TARGET_NAMES}
    for name in TARGET_NAMES:
        if not same_description(staged_descriptions[name], post[name]):
            raise AssertionError(f"Post-swap mismatch: {name}")

    # Old holders are now redundant because the fully verified backup is preserved.
    for holder in old_holders.values():
        remove_exact(holder)

    swap_manifest = {
        "completed_at": datetime.now().isoformat(timespec="seconds"),
        "status": "complete",
        "backup_directory": str(backup_dir),
        "backup_manifest": {
            "path": str(baseline_path),
            "sha256": baseline_manifest_sha,
            "total_files": baseline_manifest["total_files"],
            "total_bytes": baseline_manifest["total_bytes"],
        },
        "formal_targets": post,
        "rollback": "not needed; old version remains recoverable from the verified backup directory",
    }
    swap_path = STAGING / "08_14至17正式交易式換版_manifest.json"
    swap_path.write_text(json.dumps(swap_manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(swap_manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
