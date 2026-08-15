#!/usr/bin/env python3
"""Build the School day page images, audio clips, and story manifest."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


BOOK_ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = BOOK_ROOT.parent
REPOSITORY_ROOT = SOURCE_ROOT.parents[1]
LOCAL_PACKAGES = REPOSITORY_ROOT / ".tools" / "python"
if LOCAL_PACKAGES.exists():
    sys.path.insert(0, str(LOCAL_PACKAGES))

import imageio_ffmpeg  # noqa: E402
import pymupdf as fitz  # noqa: E402
from PIL import Image  # noqa: E402


PAGE_TEXT = [
    ["The bell rings."],
    ["Are you ready?"],
    ["Take out your book."],
    ["Raise your hand."],
    ["Put down your hand."],
    ["Come here."],
    ["Read this, please."],
    ["Put away your book."],
    ["It is break time."],
    ["Let’s play."],
    ["They run outside."],
    ["The red ball rolls away."],
]

# The supplied file is named .wav but contains 48 kHz mono MP3 audio.
# Each range contains one page reading with roughly 280 ms padding.
AUDIO_RANGES_SECONDS = [
    (0.300, 2.050),
    (3.820, 5.150),
    (6.900, 8.630),
    (10.400, 12.120),
    (13.960, 15.760),
    (17.550, 18.810),
    (20.570, 22.840),
    (24.660, 26.420),
    (28.180, 30.140),
    (31.850, 33.310),
    (35.050, 36.960),
    (38.730, 41.210),
]


def locate_source(extension: str) -> Path:
    matches = sorted(SOURCE_ROOT.glob(f"*常用語(2)*{extension}"))
    if len(matches) != 1:
        raise RuntimeError(
            f"Expected exactly one School day {extension} source in "
            f"{SOURCE_ROOT}; found {len(matches)}."
        )
    return matches[0]


def render_pages(pdf_path: Path, output_dir: Path) -> list[dict[str, object]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    document = fitz.open(pdf_path)
    if document.page_count != 12:
        raise RuntimeError(f"Expected 12 PDF pages; found {document.page_count}.")

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


def split_audio(source_path: Path, output_dir: Path) -> list[dict[str, object]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    result: list[dict[str, object]] = []

    for page_number, (start, end) in enumerate(AUDIO_RANGES_SECONDS, start=1):
        output_path = output_dir / f"page-{page_number:02d}.mp3"
        command = [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source_path),
            "-ss",
            f"{start:.3f}",
            "-to",
            f"{end:.3f}",
            "-map_metadata",
            "-1",
            "-ac",
            "1",
            "-ar",
            "48000",
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
        "title": "School day",
        "grade": "G4",
        "pageCount": 12,
        "requiredListensPerPage": 2,
        "sourceAudioActualFormat": "MP3",
        "pages": [
            {
                "number": index,
                "image": f"assets/pages/page-{index:02d}.png",
                "audio": f"assets/audio/page-{index:02d}.mp3",
                "sentences": sentences,
                "audioStart": AUDIO_RANGES_SECONDS[index - 1][0],
                "audioEnd": AUDIO_RANGES_SECONDS[index - 1][1],
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
    audio_path = locate_source(".wav")
    public_dir = BOOK_ROOT / "public"

    pages = render_pages(pdf_path, public_dir / "assets" / "pages")
    audio = split_audio(audio_path, public_dir / "assets" / "audio")
    manifest_path = public_dir / "story-data.json"
    write_manifest(manifest_path)

    report = {
        "pdf": str(pdf_path),
        "sourceAudio": str(audio_path),
        "sourceAudioActualFormat": "MP3",
        "pageImages": pages,
        "audioClips": audio,
        "manifest": str(manifest_path),
    }
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
