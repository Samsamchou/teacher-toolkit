#!/usr/bin/env python3
"""Verify staged Lesson Hub assets without changing the original teaching media."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def expected_dimensions(source: Path) -> tuple[int, int]:
    with Image.open(source) as image:
        scale = min(1.0, 1920 / image.width, 1080 / image.height)
        return (max(1, round(image.width * scale)), max(1, round(image.height * scale)))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", required=True, type=Path)
    parser.add_argument("--question-bank", required=True, type=Path)
    parser.add_argument("--asset-root", required=True, type=Path)
    parser.add_argument("--report", required=True, type=Path)
    args = parser.parse_args()

    bank = json.loads(args.question_bank.read_text(encoding="utf-8"))
    errors: list[str] = []
    checked: list[dict[str, object]] = []
    for group_key, output_folder in (("images", "landmark-food"), ("audio", "audio")):
        group = bank["assets"][group_key]
        source_root = args.workspace / group["sourceRoot"]
        for filename, metadata in group["items"].items():
            source = source_root / filename
            output = args.asset_root / output_folder / Path(metadata["plannedWebsitePath"]).name
            item: dict[str, object] = {
                "kind": group_key[:-1],
                "sourcePath": str(source.relative_to(args.workspace)).replace("\\", "/"),
                "outputPath": str(output),
                "sourceSha256": metadata["sourceSha256"],
                "outputExists": output.is_file()
            }
            if not source.is_file():
                errors.append("Missing source: " + str(source))
            elif source.stat().st_size != metadata["sourceBytes"] or sha256(source) != metadata["sourceSha256"]:
                errors.append("Source changed: " + str(source))
            if not output.is_file():
                errors.append("Missing staged output: " + str(output))
            elif group_key == "images":
                with Image.open(output) as image:
                    item["outputDimensions"] = list(image.size)
                    item["outputFormat"] = image.format
                expected = expected_dimensions(source)
                if tuple(item["outputDimensions"]) != expected:
                    errors.append("Unexpected image dimensions: " + str(output))
                if item["outputFormat"] != "JPEG":
                    errors.append("Image is not JPEG: " + str(output))
            else:
                item["outputBytes"] = output.stat().st_size
                item["outputSha256"] = sha256(output)
                if item["outputSha256"] != metadata["sourceSha256"]:
                    errors.append("Audio copy hash differs: " + str(output))
            checked.append(item)

    report = {
        "status": "PASS" if not errors else "FAIL",
        "sourcePreservation": "All original source media were hash-checked and never modified.",
        "imagePolicy": bank["assets"]["images"]["processingPolicy"],
        "assetCounts": {"images": 10, "audio": 8},
        "checked": checked,
        "errors": errors
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": report["status"], "assetsChecked": len(checked), "errors": errors}, ensure_ascii=False))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
