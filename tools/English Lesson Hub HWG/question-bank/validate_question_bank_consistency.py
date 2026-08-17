#!/usr/bin/env python3
"""Current runnable consistency check for the HWG7 U01 Lesson 1 question bank."""

from __future__ import annotations

import sys

import validate_question_bank as draft


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
        if len(cells) != 9 or not cells[1].startswith("hwg7-u01-l1-"):
            continue
        if current_set is None:
            raise ValueError(f"Markdown line {line_number}: question row is outside a question set")
        rows.append(
            {
                "setId": current_set,
                "number": cells[0],
                "id": cells[1],
                "sourceFilename": cells[2],
                "options": cells[4:8],
                "correctAnswer": cells[8],
            }
        )
    return rows


draft.parse_markdown_rows = parse_markdown_rows

if __name__ == "__main__":
    sys.exit(draft.main())
