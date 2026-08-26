#!/usr/bin/env python3
"""Tests for the read-only workspace validator using immutable fixtures."""

from __future__ import annotations

import unittest
import hashlib
from pathlib import Path

from validate_workspace import inspect_workspace


FIXTURES = Path(__file__).resolve().parent / "fixtures"


def fixture_digest(root: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        digest.update(path.relative_to(root).as_posix().encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()


class WorkspaceValidationTests(unittest.TestCase):
    def test_good_sample_has_no_errors_and_is_not_modified(self) -> None:
        root = FIXTURES / "good"
        rdq = root / "rdq" / "spec.md"
        before = fixture_digest(root)
        findings = inspect_workspace(root, [rdq])
        after = fixture_digest(root)
        self.assertFalse([item for item in findings if item.severity == "error"])
        self.assertEqual(before, after)

    def test_bad_sample_reports_folder_scatter_index_and_rdq(self) -> None:
        root = FIXTURES / "bad"
        rdq = root / "rdq" / "spec.md"
        findings = inspect_workspace(root, [rdq])
        codes = {item.code for item in findings if item.severity == "error"}
        self.assertTrue({"LOOSE_FILE", "UNIT_NAME", "RDQ_NOT_CONFIRMED"}.issubset(codes))

    def test_lesson_count_and_loose_lesson_item_are_enforced(self) -> None:
        root = FIXTURES / "bad_lesson"
        before = fixture_digest(root)
        findings = inspect_workspace(root)
        after = fixture_digest(root)
        codes = {item.code for item in findings if item.severity == "error"}
        self.assertTrue({"LESSON_FOLDER_COUNT", "LOOSE_LESSON_ITEM"}.issubset(codes))
        self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
