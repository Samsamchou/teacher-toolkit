#!/usr/bin/env python3
"""Build the Friends meet page images, audio clips, and story manifest."""

from __future__ import annotations

import json
import subprocess
import sys
import wave
from pathlib import Path


STORY_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = STORY_ROOT.parents[1]
LOCAL_PACKAGES = REPOSITORY_ROOT / ".tools" / "python"
if LOCAL_PACKAGES.exists():
    sys.path.insert(0, str(LOCAL_PACKAGES))

import imageio_ffmpeg  # noqa: E402
import pymupdf as fitz  # noqa: E402
from PIL import Image  # noqa: E402


PAGE_TEXT = [
    ["Hello, Mia!", "How are you?"],
    ["Hi, Leo!", "I’m fine."],
    ["Oops!", "Watch out, Sam!"],
    ["Oh no!", "I’m sorry."],
    ["It is okay, Leo."],
    ["We must go now."],
    ["Goodbye, Sam!", "See you."],
]

# Boundaries sit in the middle of the long silence between page readings.
# The source contains 12 spoken sentences across seven page groups.
CUTS_SECONDS = [0.0, 2.505, 5.210, 7.880, 10.895, 12.875, 14.730, 17.080]


def locate_source(extension: str) -> Path:
    matches = sorted(STORY_ROOT.glob(f"*常用語(1)*{extension}"))
    if len(matches) != 1:
        raise RuntimeError(
            f"Expected exactly one {extension} source in {STORY_ROOT}; found {len(matches)}."
        )
    return matches[0]


def wav_duration(path: Path) -> float:
    with wave.open(str(path), "rb") as audio:
        return audio.getnframes() / audio.getframerate()


def render_pages(pdf_path: Path, output_dir: Path) -> list[dict[str, object]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    document = fitz.open(pdf_path)
    if document.page_count != 7:
        raise RuntimeError(f"Expected 7 PDF pages; found {document.page_count}.")

    result: list[dict[str, object]] = []
    for page_number, page in enumerate(document, start=1):
        output_path = output_dir / f"page-{page_number:02d}.png"
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1, 1), alpha=False)
        pixmap.save(output_path)
        with Image.open(output_path) as image:
            dimensions = [image.width, image.height]
        result.append(
            {
                "page": page_number,
                "file": output_path.name,
                "dimensions": dimensions,
                "bytes": output_path.stat().st_size,
            }
        )
    return result


def split_audio(wav_path: Path, output_dir: Path) -> list[dict[str, object]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    source_duration = wav_duration(wav_path)
    if abs(source_duration - CUTS_SECONDS[-1]) > 0.02:
        raise RuntimeError(
            f"Source WAV duration changed: expected {CUTS_SECONDS[-1]:.3f}s, "
            f"found {source_duration:.3f}s. Recheck split points."
        )

    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    result: list[dict[str, object]] = []
    for page_number, (start, end) in enumerate(
        zip(CUTS_SECONDS, CUTS_SECONDS[1:]), start=1
    ):
        output_path = output_dir / f"page-{page_number:02d}.mp3"
        command = [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(wav_path),
            "-ss",
            f"{start:.3f}",
            "-to",
            f"{end:.3f}",
            "-map_metadata",
            "-1",
            "-ac",
            "1",
            "-ar",
            "24000",
            "-codec:a",
            "libmp3lame",
            "-b:a",
            "128k",
            str(output_path),
        ]
        subprocess.run(command, check=True, capture_output=True)
        result.append(
            {
                "page": page_number,
                "file": output_path.name,
                "start": start,
                "end": end,
                "duration": round(end - start, 3),
                "bytes": output_path.stat().st_size,
            }
        )
    return result


def write_manifest(output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    manifest = {
        "title": "Friends meet",
        "grade": "G4",
        "pageCount": 7,
        "requiredListensPerPage": 2,
        "pages": [
            {
                "number": index,
                "image": f"assets/pages/page-{index:02d}.png",
                "audio": f"assets/audio/page-{index:02d}.mp3",
                "sentences": sentences,
                "audioStart": CUTS_SECONDS[index - 1],
                "audioEnd": CUTS_SECONDS[index],
            }
            for index, sentences in enumerate(PAGE_TEXT, start=1)
        ],
    }
    output_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def main() -> None:
    pdf_path = locate_source(".pdf")
    wav_path = locate_source(".wav")
    public_dir = STORY_ROOT / "public"

    pages = render_pages(pdf_path, public_dir / "assets" / "pages")
    audio = split_audio(wav_path, public_dir / "assets" / "audio")
    manifest_path = public_dir / "story-data.json"
    write_manifest(manifest_path)

    report = {
        "pdf": str(pdf_path),
        "wav": str(wav_path),
        "pageImages": pages,
        "audioClips": audio,
        "manifest": str(manifest_path),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
