#!/usr/bin/env python3
"""Validate Homeworkclass semester sources without mutating the source file.

The parser intentionally supports only the documented homeworkclass-input-v1
contract. It uses the Python standard library so the skill does not depend on a
project's npm or Python environment.
"""

from __future__ import annotations

import argparse
import colorsys
import csv
import hashlib
import json
import re
import sys
import unicodedata
import uuid
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo


CONTRACT_VERSION = "homeworkclass-input-v1"
PARSER_VERSION = "1.0.0"
REQUIRED_SHEETS = {
    "01_學期設定": [
        "contract_version", "semester_id", "semester_label", "site_title",
        "start_date", "end_date", "timezone", "source_note",
    ],
    "02_科目": ["subject_id", "subject_label", "short_label", "display_order"],
    "03_班級": ["class_id", "class_label", "short_label", "display_order", "color_override"],
    "04_有效座號": ["class_id", "seat_number"],
    "05_節次": ["period_id", "period_label", "display_order", "start_time", "end_time"],
    "06_固定課表": ["weekday", "period_id", "class_id", "subject_id", "note"],
}
ALLOWED_SHEETS = {"00_說明", *REQUIRED_SHEETS}
PII_HEADERS = {
    "name", "student_name", "full_name", "姓名", "學生姓名", "正式學號",
    "student_number", "email", "e_mail", "電子郵件", "phone", "電話",
    "parent", "guardian", "家長", "address", "地址",
}
MAXIMUMS = {"classes": 32, "subjects": 16, "periods": 16, "seats_per_class": 60, "schedule": 512}
MAX_SOURCE_BYTES = 10 * 1024 * 1024
MAX_XLSX_UNCOMPRESSED_BYTES = 50 * 1024 * 1024
EMAIL_RE = re.compile(r"(?i)\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b")
PHONE_RE = re.compile(r"(?<!\d)(?:09\d{8}|0\d{1,2}[- ]?\d{6,8})(?!\d)")
TAIWAN_ID_RE = re.compile(r"(?i)\b[A-Z][12]\d{8}\b")
XML_NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
REL_NS = {"r": "http://schemas.openxmlformats.org/package/2006/relationships"}
OFFICE_REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return unicodedata.normalize("NFKC", str(value)).strip()


def safe_value(value: Any, pii: bool = False) -> str:
    if pii:
        return "<redacted>"
    text = clean_text(value).replace("\r", " ").replace("\n", " ")
    return text[:80] + ("…" if len(text) > 80 else "")


def col_index(cell_ref: str) -> int:
    letters = re.match(r"[A-Z]+", cell_ref.upper())
    if not letters:
        return 0
    result = 0
    for char in letters.group(0):
        result = result * 26 + ord(char) - 64
    return result - 1


def excel_date(value: Any, date_1904: bool = False) -> str:
    if isinstance(value, (int, float)):
        epoch = datetime(1904, 1, 1) if date_1904 else datetime(1899, 12, 30)
        return (epoch + timedelta(days=float(value))).date().isoformat()
    text = clean_text(value)
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        raise ValueError("日期必須是 Excel 日期或 yyyy-mm-dd")
    try:
        return datetime.strptime(text, "%Y-%m-%d").date().isoformat()
    except ValueError as exc:
        raise ValueError("日期必須是 Excel 日期或 yyyy-mm-dd") from exc


def excel_time(value: Any) -> str:
    if isinstance(value, (int, float)):
        total_minutes = int(round((float(value) % 1) * 24 * 60)) % (24 * 60)
        return f"{total_minutes // 60:02d}:{total_minutes % 60:02d}"
    text = clean_text(value)
    if not re.fullmatch(r"\d{2}:\d{2}", text):
        raise ValueError("時間必須是 Excel 時間或 HH:mm")
    try:
        return datetime.strptime(text, "%H:%M").strftime("%H:%M")
    except ValueError as exc:
        raise ValueError("時間必須是 Excel 時間或 HH:mm") from exc


def is_valid_id(value: str) -> bool:
    return (
        1 <= len(value) <= 32
        and value[0].isalnum()
        and all(char.isalnum() or char in "_-" for char in value)
        and "/" not in value
        and "\\" not in value
        and not any(char.isspace() for char in value)
    )


def strict_integer(value: Any) -> int:
    if isinstance(value, bool):
        raise ValueError
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not value.is_integer():
            raise ValueError
        return int(value)
    text = clean_text(value)
    if not re.fullmatch(r"[+-]?\d+", text):
        raise ValueError
    return int(text)


def obvious_pii_kind(value: Any) -> str:
    text = clean_text(value)
    if EMAIL_RE.search(text):
        return "email"
    if PHONE_RE.search(text):
        return "phone"
    if TAIWAN_ID_RE.search(text):
        return "national-id"
    return ""


def mix_with_white(hex_color: str, ratio: float = 0.84) -> str:
    rgb = [int(hex_color[index:index + 2], 16) for index in (1, 3, 5)]
    mixed = [round(channel * (1 - ratio) + 255 * ratio) for channel in rgb]
    return "#" + "".join(f"{channel:02X}" for channel in mixed)


def luminance(hex_color: str) -> float:
    values = [int(hex_color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
    linear = [value / 12.92 if value <= 0.03928 else ((value + 0.055) / 1.055) ** 2.4 for value in values]
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]


def contrast(a: str, b: str) -> float:
    high, low = sorted([luminance(a), luminance(b)], reverse=True)
    return (high + 0.05) / (low + 0.05)


def palette_color(index: int, total: int) -> str:
    # Stable dopamine palette with a second saturation/lightness ring above 16.
    hue = ((index * 137.508) % 360) / 360
    saturation = 0.78 if index < 16 else 0.68
    lightness = 0.48 if index < 16 else 0.40
    red, green, blue = colorsys.hls_to_rgb(hue, lightness, saturation)
    return f"#{round(red * 255):02X}{round(green * 255):02X}{round(blue * 255):02X}"


class IssueCollector:
    def __init__(self) -> None:
        self.issues: list[dict[str, Any]] = []

    def add(self, severity: str, code: str, message: str, *, sheet: str = "", row: int | None = None,
            column: str = "", key: str = "", value: Any = "", expected: str = "", action: str = "",
            pii: bool = False) -> None:
        self.issues.append({
            "severity": severity,
            "code": code,
            "sheet": sheet,
            "row": row,
            "column": column,
            "record_key": key,
            "value_redacted": safe_value(value, pii),
            "message_zh": message,
            "expected": expected,
            "suggested_action": action,
            "blocking": severity == "ERROR",
        })

    @property
    def errors(self) -> int:
        return sum(issue["severity"] == "ERROR" for issue in self.issues)


def read_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    values: list[str] = []
    for item in root.findall("m:si", XML_NS):
        values.append("".join(node.text or "" for node in item.findall(".//m:t", XML_NS)))
    return values


def workbook_sheet_paths(archive: zipfile.ZipFile) -> tuple[dict[str, str], bool, set[str]]:
    workbook_root = ET.fromstring(archive.read("xl/workbook.xml"))
    props = workbook_root.find("m:workbookPr", XML_NS)
    date_1904 = bool(props is not None and props.attrib.get("date1904") in {"1", "true", "TRUE"})
    rel_root = ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    rels = {item.attrib["Id"]: item.attrib["Target"] for item in rel_root.findall("r:Relationship", REL_NS)}
    paths: dict[str, str] = {}
    hidden: set[str] = set()
    for sheet in workbook_root.findall("m:sheets/m:sheet", XML_NS):
        name = sheet.attrib["name"]
        rel_id = sheet.attrib[f"{{{OFFICE_REL_NS}}}id"]
        target = rels[rel_id].replace("\\", "/")
        if target.startswith("/"):
            path = target.lstrip("/")
        elif target.startswith("xl/"):
            path = target
        else:
            path = "xl/" + target.lstrip("./")
        paths[name] = path
        if sheet.attrib.get("state", "visible") != "visible":
            hidden.add(name)
    return paths, date_1904, hidden


def read_sheet(archive: zipfile.ZipFile, path: str, shared: list[str], collector: IssueCollector, name: str) -> list[list[Any]]:
    root = ET.fromstring(archive.read(path))
    if root.findall(".//m:f", XML_NS):
        collector.add("ERROR", "E-FORMULA", "資料工作表不可包含公式。", sheet=name, action="請改成固定值。")
    if any(row.attrib.get("hidden") in {"1", "true"} for row in root.findall(".//m:row", XML_NS)):
        collector.add("ERROR", "E-HIDDEN-DATA", "資料工作表不可隱藏資料列。", sheet=name, action="取消隱藏並確認內容。")
    if any(col.attrib.get("hidden") in {"1", "true"} for col in root.findall(".//m:col", XML_NS)):
        collector.add("ERROR", "E-HIDDEN-DATA", "資料工作表不可隱藏欄。", sheet=name, action="取消隱藏並確認內容。")
    rows: list[list[Any]] = []
    for row in root.findall(".//m:sheetData/m:row", XML_NS):
        values: dict[int, Any] = {}
        for cell in row.findall("m:c", XML_NS):
            index = col_index(cell.attrib.get("r", "A1"))
            cell_type = cell.attrib.get("t", "n")
            value_node = cell.find("m:v", XML_NS)
            if cell_type == "inlineStr":
                value: Any = "".join(node.text or "" for node in cell.findall(".//m:t", XML_NS))
            elif value_node is None:
                value = ""
            elif cell_type == "s":
                value = shared[int(value_node.text or "0")]
            elif cell_type in {"str", "e", "d"}:
                value = value_node.text or ""
            elif cell_type == "b":
                value = (value_node.text or "0") == "1"
            else:
                raw = value_node.text or ""
                try:
                    number = float(raw)
                    value = int(number) if number.is_integer() else number
                except ValueError:
                    value = raw
            values[index] = value
        if values:
            width = max(values) + 1
            rows.append([values.get(index, "") for index in range(width)])
    return rows


def load_xlsx(path: Path, collector: IssueCollector) -> tuple[dict[str, list[dict[str, Any]]], bool]:
    tables: dict[str, list[dict[str, Any]]] = {}
    try:
        with zipfile.ZipFile(path) as archive:
            if any(info.flag_bits & 0x1 for info in archive.infolist()):
                collector.add("ERROR", "E-XLSX-ENCRYPTED", "不接受加密的工作簿。", action="請另存為未加密的 .xlsx。")
            if sum(info.file_size for info in archive.infolist()) > MAX_XLSX_UNCOMPRESSED_BYTES:
                collector.add("ERROR", "E-XLSX-SIZE", "工作簿解壓後超過 50 MB 上限。", action="請移除不必要的內嵌資產。")
            names = set(archive.namelist())
            if "xl/vbaProject.bin" in names or any(name.lower().endswith("vbaproject.bin") for name in names):
                collector.add("ERROR", "E-MACRO", "不接受含巨集的工作簿。", action="另存為不含巨集的 .xlsx。")
            if any(name.startswith("xl/externalLinks/") for name in names):
                collector.add("ERROR", "E-EXTERNAL-LINK", "不接受含外部連結的工作簿。", action="移除外部連結。")
            paths, date_1904, hidden = workbook_sheet_paths(archive)
            for sheet in sorted(hidden):
                collector.add("ERROR", "E-HIDDEN-DATA", "工作表不可隱藏。", sheet=sheet, action="取消隱藏並確認內容。")
            for required in REQUIRED_SHEETS:
                if required not in paths:
                    collector.add("ERROR", "E-SHEET-MISSING", "缺少必要工作表。", sheet=required, expected=required)
            if "00_說明" not in paths:
                collector.add("ERROR", "E-SHEET-MISSING", "缺少必要工作表。", sheet="00_說明", expected="00_說明")
            shared = read_shared_strings(archive)
            for index, value in enumerate(shared):
                pii_kind = obvious_pii_kind(value)
                if pii_kind:
                    collector.add(
                        "ERROR", "E-PII-VALUE", "工作簿文字含未核准的個資格式。",
                        sheet="workbook", key=f"shared-string:{index}", value=value, pii=True,
                        expected="不得含 email、電話或身分證字號", action="移除個資後重新另存 .xlsx。",
                    )
            if "00_說明" in paths:
                read_sheet(archive, paths["00_說明"], shared, collector, "00_說明")
            for extra in sorted(set(paths) - ALLOWED_SHEETS):
                extra_rows = read_sheet(archive, paths[extra], shared, collector, extra)
                has_data = any(clean_text(value) for row in extra_rows for value in row)
                collector.add(
                    "ERROR" if has_data else "WARNING",
                    "E-SHEET-UNKNOWN" if has_data else "W-SHEET-UNKNOWN",
                    "未知工作表含資料，為避免漏匯入或夾帶個資而阻擋。" if has_data else "發現全空白的未知工作表；不會納入正式資料。",
                    sheet=extra,
                    action="刪除未知工作表或把資料移到標準工作表。" if has_data else "可刪除空白工作表。",
                )
            for name, expected_headers in REQUIRED_SHEETS.items():
                if name not in paths:
                    continue
                raw_rows = read_sheet(archive, paths[name], shared, collector, name)
                if not raw_rows:
                    collector.add("ERROR", "E-COLUMN-MISSING", "工作表沒有標題列。", sheet=name)
                    continue
                headers = [clean_text(value) for value in raw_rows[0]]
                for header in expected_headers:
                    if header not in headers:
                        collector.add("ERROR", "E-COLUMN-MISSING", "缺少必要欄位。", sheet=name, column=header, expected=header)
                for header in headers:
                    if header and header not in expected_headers:
                        is_pii = header.lower() in PII_HEADERS or header in PII_HEADERS
                        collector.add("ERROR", "E-PII-UNAPPROVED" if is_pii else "E-COLUMN-UNKNOWN",
                                      "發現未核准個資欄位。" if is_pii else "發現未知欄位。",
                                      sheet=name, column=header, value=header, pii=is_pii,
                                      action="刪除欄位或改用標準範本。")
                records: list[dict[str, Any]] = []
                for row_number, raw in enumerate(raw_rows[1:], start=2):
                    padded = raw + [""] * max(0, len(headers) - len(raw))
                    record = {header: padded[index] for index, header in enumerate(headers) if header}
                    if any(clean_text(value) for value in record.values()):
                        record["__row__"] = row_number
                        records.append(record)
                tables[name] = records
            return tables, date_1904
    except (zipfile.BadZipFile, KeyError, ET.ParseError, ValueError) as exc:
        collector.add("ERROR", "E-XLSX-INVALID", "無法解析標準 .xlsx 工作簿。", value=type(exc).__name__, action="請重新以 Excel 另存為 .xlsx。")
        return tables, False


def load_json_source(path: Path, collector: IssueCollector) -> dict[str, Any] | None:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        collector.add("ERROR", "E-JSON-INVALID", "JSON fixture 無法解析。", value=type(exc).__name__)
        return None
    if not isinstance(value, dict):
        collector.add("ERROR", "E-JSON-INVALID", "JSON fixture 最外層必須是物件。")
        return None
    return value


def normalize_from_tables(tables: dict[str, list[dict[str, Any]]], date_1904: bool, collector: IssueCollector) -> dict[str, Any] | None:
    semester_rows = tables.get("01_學期設定", [])
    if len(semester_rows) != 1:
        collector.add("ERROR", "E-SEMESTER-ROW", "學期設定必須且只能有一列。", sheet="01_學期設定", expected="1 row")
        semester_row: dict[str, Any] = semester_rows[0] if semester_rows else {}
    else:
        semester_row = semester_rows[0]

    def parse_order(record: dict[str, Any], sheet: str) -> int:
        value = record.get("display_order")
        try:
            result = strict_integer(value)
            if result < 1:
                raise ValueError
            return result
        except (TypeError, ValueError):
            collector.add("ERROR", "E-DISPLAY-ORDER", "display_order 必須是正整數。", sheet=sheet,
                          row=record.get("__row__"), column="display_order", value=value)
            return 0

    def validate_identifier(value: Any, field: str, sheet: str, row: int | None) -> str:
        text = clean_text(value)
        raw_text = "" if value is None else str(value)
        if raw_text != text:
            collector.add("WARNING", "W-ID-TRIMMED", "ID 已套用 Unicode NFKC 並移除頭尾空白。",
                          sheet=sheet, row=row, column=field, key=text)
        if not is_valid_id(text):
            collector.add("ERROR", "E-ID-FORMAT", "ID 只允許 1–32 個 Unicode 字母、數字、底線或連字號，不可含空白或斜線。",
                          sheet=sheet, row=row, column=field, value=text)
        return text

    subjects: list[dict[str, Any]] = []
    for row in tables.get("02_科目", []):
        subjects.append({
            "id": validate_identifier(row.get("subject_id"), "subject_id", "02_科目", row.get("__row__")),
            "label": clean_text(row.get("subject_label")),
            "shortLabel": clean_text(row.get("short_label")),
            "displayOrder": parse_order(row, "02_科目"),
        })

    classes: list[dict[str, Any]] = []
    for index, row in enumerate(tables.get("03_班級", [])):
        override = clean_text(row.get("color_override"))
        if override and not re.fullmatch(r"#[0-9A-Fa-f]{6}", override):
            collector.add("ERROR", "E-COLOR", "color_override 必須是 #RRGGBB。", sheet="03_班級", row=row.get("__row__"),
                          column="color_override", value=override)
            override = ""
        accent = override.upper() if override else palette_color(index, len(tables.get("03_班級", [])))
        ink = "#111111" if contrast(accent, "#111111") >= contrast(accent, "#FFFFFF") else "#FFFFFF"
        if contrast(accent, ink) < 4.5:
            collector.add("ERROR", "E-COLOR-CONTRAST", "班級主色與文字對比不足 4.5:1。", sheet="03_班級",
                          row=row.get("__row__"), column="color_override", value=accent)
        classes.append({
            "id": validate_identifier(row.get("class_id"), "class_id", "03_班級", row.get("__row__")),
            "label": clean_text(row.get("class_label")),
            "shortLabel": clean_text(row.get("short_label")),
            "displayOrder": parse_order(row, "03_班級"),
            "accent": accent,
            "accentSoft": mix_with_white(accent),
            "ink": ink,
            "seats": [],
        })

    periods: list[dict[str, Any]] = []
    for row in tables.get("05_節次", []):
        try:
            start_time = excel_time(row.get("start_time"))
            end_time = excel_time(row.get("end_time"))
        except ValueError as exc:
            collector.add("ERROR", "E-TIME-RANGE", str(exc), sheet="05_節次", row=row.get("__row__"))
            start_time, end_time = "", ""
        period_id = clean_text(row.get("period_id"))
        if start_time and end_time and start_time >= end_time:
            collector.add("ERROR", "E-TIME-RANGE", "節次開始時間必須早於結束時間。", sheet="05_節次",
                          row=row.get("__row__"), key=f"period:{period_id}", value=f"{start_time}-{end_time}")
        periods.append({
            "id": validate_identifier(period_id, "period_id", "05_節次", row.get("__row__")),
            "label": clean_text(row.get("period_label")),
            "displayOrder": parse_order(row, "05_節次"),
            "startTime": start_time,
            "endTime": end_time,
        })

    for collection, sheet, name in [
        (subjects, "02_科目", "subject_id"), (classes, "03_班級", "class_id"), (periods, "05_節次", "period_id")
    ]:
        duplicate_ids = {value for value, count in Counter(item["id"] for item in collection).items() if value and count > 1}
        duplicate_orders = {value for value, count in Counter(item["displayOrder"] for item in collection).items() if value and count > 1}
        for value in sorted(duplicate_ids):
            collector.add("ERROR", "E-ID-DUPLICATE", "同一資料表的 ID 不可重複。", sheet=sheet, column=name, key=value)
        for value in sorted(duplicate_orders):
            collector.add("ERROR", "E-DISPLAY-ORDER-DUPLICATE", "同一資料表的 display_order 不可重複。", sheet=sheet,
                          column="display_order", value=value)

    for collection, sheet in [(subjects, "02_科目"), (classes, "03_班級")]:
        duplicate_short_labels = {
            value for value, count in Counter(item["shortLabel"] for item in collection).items()
            if value and count > 1
        }
        for value in sorted(duplicate_short_labels):
            collector.add("ERROR", "E-SHORT-LABEL-DUPLICATE", "同一資料表的 short_label 不可重複。",
                          sheet=sheet, column="short_label", value=value)

    class_map = {item["id"]: item for item in classes if item["id"]}
    subject_ids = {item["id"] for item in subjects if item["id"]}
    period_map = {item["id"]: item for item in periods if item["id"]}
    seen_seats: set[tuple[str, int]] = set()
    seats_per_class: dict[str, list[int]] = defaultdict(list)
    for row in tables.get("04_有效座號", []):
        class_id = clean_text(row.get("class_id"))
        try:
            seat = strict_integer(row.get("seat_number"))
        except (TypeError, ValueError):
            collector.add("ERROR", "E-SEAT-RANGE", "座號必須是 1–999 的整數。", sheet="04_有效座號",
                          row=row.get("__row__"), column="seat_number", value=row.get("seat_number"))
            continue
        if class_id not in class_map:
            collector.add("ERROR", "E-FOREIGN-KEY", "座號所屬班級不存在。", sheet="04_有效座號", row=row.get("__row__"),
                          column="class_id", key=class_id)
            continue
        if not 1 <= seat <= 999:
            collector.add("ERROR", "E-SEAT-RANGE", "座號必須介於 1–999。", sheet="04_有效座號", row=row.get("__row__"), value=seat)
        if (class_id, seat) in seen_seats:
            collector.add("ERROR", "E-SEAT-DUPLICATE", "同一班級的有效座號不可重複。", sheet="04_有效座號",
                          row=row.get("__row__"), key=f"class:{class_id}|seat:{seat}")
        seen_seats.add((class_id, seat))
        seats_per_class[class_id].append(seat)

    for class_id, item in class_map.items():
        item["seats"] = sorted(set(seats_per_class.get(class_id, [])))
        if not item["seats"]:
            collector.add("ERROR", "E-CLASS-NO-SEAT", "每個班級至少需要一個有效座號。", sheet="04_有效座號", key=class_id)
        if len(item["seats"]) > MAXIMUMS["seats_per_class"]:
            collector.add("ERROR", "E-LIMIT", "單一班級有效座號超過上限。", sheet="04_有效座號", key=class_id,
                          value=len(item["seats"]), expected=str(MAXIMUMS["seats_per_class"]))

    schedule: list[dict[str, Any]] = []
    seen_slots: set[tuple[int, str]] = set()
    for row in tables.get("06_固定課表", []):
        try:
            weekday = strict_integer(row.get("weekday"))
        except (TypeError, ValueError):
            weekday = 0
        period_id = clean_text(row.get("period_id"))
        class_id = clean_text(row.get("class_id"))
        subject_id = clean_text(row.get("subject_id"))
        schedule_key = f"weekday:{weekday}|period:{period_id}|class:{class_id}|subject:{subject_id}"
        if not 1 <= weekday <= 7:
            collector.add("ERROR", "E-WEEKDAY", "weekday 必須介於 1–7。", sheet="06_固定課表", row=row.get("__row__"), value=weekday)
        for field, value, valid in [
            ("period_id", period_id, period_id in period_map),
            ("class_id", class_id, class_id in class_map),
            ("subject_id", subject_id, subject_id in subject_ids),
        ]:
            if not valid:
                collector.add("ERROR", "E-FOREIGN-KEY", "固定課表引用不存在的資料。", sheet="06_固定課表",
                              row=row.get("__row__"), column=field, key=schedule_key)
        slot_key = (weekday, period_id)
        if slot_key in seen_slots:
            collector.add("ERROR", "E-SLOT-COLLISION", "單一教師同一天同一節只能有一筆固定課程。", sheet="06_固定課表",
                          row=row.get("__row__"), key=f"weekday:{weekday}|period:{period_id}")
        seen_slots.add(slot_key)
        schedule.append({
            "id": f"w{weekday}-{period_id}-{subject_id}-{class_id}",
            "weekday": weekday,
            "periodId": period_id,
            "classId": class_id,
            "subjectId": subject_id,
            **({"note": clean_text(row.get("note"))} if clean_text(row.get("note")) else {}),
        })

    valid_intervals = sorted((item["startTime"], item["endTime"], item["id"]) for item in periods if item["startTime"] and item["endTime"])
    for index, current in enumerate(valid_intervals):
        for following in valid_intervals[index + 1:]:
            if following[0] < current[1] and current[0] < following[1]:
                collector.add("ERROR", "E-TIME-OVERLAP", "不同節次的時間不可重疊。", sheet="05_節次",
                              key=f"{current[2]}:{following[2]}", value=f"{current[0]}-{current[1]} / {following[0]}-{following[1]}")

    for items, key in [(classes, "classes"), (subjects, "subjects"), (periods, "periods"), (schedule, "schedule")]:
        if len(items) > MAXIMUMS[key]:
            collector.add("ERROR", "E-LIMIT", f"{key} 超過 v1 明示上限。", value=len(items), expected=str(MAXIMUMS[key]))

    for item, sheet in (
        [(subject, "02_科目") for subject in subjects]
        + [(klass, "03_班級") for klass in classes]
        + [(period, "05_節次") for period in periods]
    ):
        if not 1 <= len(item["label"]) <= 60:
            collector.add("ERROR", "E-LABEL", "標籤長度必須是 1–60 字。", sheet=sheet, key=item["id"], value=item["label"])
        if "shortLabel" in item and not 1 <= len(item["shortLabel"]) <= 4:
            collector.add("ERROR", "E-SHORT-LABEL", "short_label 長度必須是 1–4 字。", sheet=sheet, key=item["id"], value=item["shortLabel"])

    for collection, used, code, sheet in [
        (classes, {item["classId"] for item in schedule}, "W-UNUSED-CLASS", "03_班級"),
        (subjects, {item["subjectId"] for item in schedule}, "W-UNUSED-SUBJECT", "02_科目"),
        (periods, {item["periodId"] for item in schedule}, "W-UNUSED-PERIOD", "05_節次"),
    ]:
        for item in collection:
            if item["id"] not in used:
                collector.add("WARNING", code, "此項目目前沒有固定課程。", sheet=sheet, key=item["id"])

    try:
        start_date = excel_date(semester_row.get("start_date"), date_1904)
        end_date = excel_date(semester_row.get("end_date"), date_1904)
        if start_date > end_date:
            raise ValueError("學期起日不得晚於迄日")
    except ValueError as exc:
        collector.add("ERROR", "E-DATE-RANGE", str(exc), sheet="01_學期設定")
        start_date, end_date = "", ""

    contract = clean_text(semester_row.get("contract_version"))
    if contract != CONTRACT_VERSION:
        collector.add("ERROR", "E-CONTRACT", "contract_version 不相符。", sheet="01_學期設定",
                      value=contract, expected=CONTRACT_VERSION)
    semester_id = validate_identifier(semester_row.get("semester_id"), "semester_id", "01_學期設定", semester_row.get("__row__"))
    timezone_name = clean_text(semester_row.get("timezone"))
    if timezone_name != "Asia/Taipei":
        collector.add("ERROR", "E-TIMEZONE", "v1 時區固定為 Asia/Taipei。", sheet="01_學期設定",
                      column="timezone", value=timezone_name, expected="Asia/Taipei")
    site_title = clean_text(semester_row.get("site_title"))
    if not 1 <= len(site_title) <= 80:
        collector.add("ERROR", "E-SITE-TITLE", "site_title 長度必須是 1–80 字。", sheet="01_學期設定", value=site_title)
    semester_label = clean_text(semester_row.get("semester_label"))
    if not 1 <= len(semester_label) <= 60:
        collector.add("ERROR", "E-LABEL", "semester_label 長度必須是 1–60 字。", sheet="01_學期設定", value=semester_label)
    source_note = clean_text(semester_row.get("source_note"))
    if len(source_note) > 200:
        collector.add("ERROR", "E-NOTE-LENGTH", "source_note 不可超過 200 字。", sheet="01_學期設定")
    for item in schedule:
        if len(item.get("note", "")) > 200:
            collector.add("ERROR", "E-NOTE-LENGTH", "固定課表 note 不可超過 200 字。", sheet="06_固定課表", key=item["id"])

    normalized = {
        "contractVersion": contract,
        "semester": {
            "id": semester_id,
            "label": semester_label,
            "siteTitle": site_title,
            "startDate": start_date,
            "endDate": end_date,
            "timezone": timezone_name,
            "sourceNote": source_note,
        },
        "subjects": sorted(subjects, key=lambda item: (item["displayOrder"], item["id"])),
        "classes": sorted(classes, key=lambda item: (item["displayOrder"], item["id"])),
        "periods": sorted(periods, key=lambda item: (item["displayOrder"], item["id"])),
        "schedule": sorted(schedule, key=lambda item: (item["weekday"], period_map.get(item["periodId"], {}).get("displayOrder", 0), item["id"])),
    }
    text_fields: list[tuple[str, str, Any]] = [
        ("01_學期設定", "semester_label", semester_label),
        ("01_學期設定", "site_title", site_title),
        ("01_學期設定", "source_note", source_note),
    ]
    text_fields.extend(("02_科目", f"subject:{item['id']}", item["label"]) for item in subjects)
    text_fields.extend(("03_班級", f"class:{item['id']}", item["label"]) for item in classes)
    text_fields.extend(("05_節次", f"period:{item['id']}", item["label"]) for item in periods)
    text_fields.extend(("06_固定課表", item["id"], item.get("note", "")) for item in schedule)
    for sheet, key, value in text_fields:
        if obvious_pii_kind(value):
            collector.add(
                "ERROR", "E-PII-VALUE", "文字欄位含未核准的個資格式。",
                sheet=sheet, key=key, value=value, pii=True,
                expected="不得含 email、電話或身分證字號", action="移除個資後重新驗證。",
            )
    return normalized


def tables_from_normalized(value: dict[str, Any]) -> tuple[dict[str, list[dict[str, Any]]], bool]:
    if isinstance(value.get("input"), dict):
        source = value["input"]
        semester = source.get("semester", {})
        tables = {
            "01_學期設定": [{
                "contract_version": source.get("contract_version", ""),
                "semester_id": semester.get("semester_id", ""),
                "semester_label": semester.get("semester_label", ""),
                "site_title": semester.get("site_title", ""),
                "start_date": semester.get("start_date", ""),
                "end_date": semester.get("end_date", ""),
                "timezone": semester.get("timezone", ""),
                "source_note": semester.get("source_note", ""),
                "__row__": 2,
            }],
            "02_科目": [{
                "subject_id": item.get("subject_id"), "subject_label": item.get("subject_label"),
                "short_label": item.get("short_label"), "display_order": item.get("display_order"), "__row__": index + 2,
            } for index, item in enumerate(source.get("subjects", []))],
            "03_班級": [{
                "class_id": item.get("class_id"), "class_label": item.get("class_label"),
                "short_label": item.get("short_label"), "display_order": item.get("display_order"),
                "color_override": item.get("color_override", ""), "__row__": index + 2,
            } for index, item in enumerate(source.get("classes", []))],
            "04_有效座號": [
                {"class_id": item.get("class_id"), "seat_number": item.get("seat_number"), "__row__": index + 2}
                for index, item in enumerate(source.get("roster", []))
            ],
            "05_節次": [{
                "period_id": item.get("period_id"), "period_label": item.get("period_label"),
                "display_order": item.get("display_order"), "start_time": item.get("start_time"),
                "end_time": item.get("end_time"), "__row__": index + 2,
            } for index, item in enumerate(source.get("periods", []))],
            "06_固定課表": [{
                "weekday": item.get("weekday"), "period_id": item.get("period_id"),
                "class_id": item.get("class_id"), "subject_id": item.get("subject_id"),
                "note": item.get("note", ""), "__row__": index + 2,
            } for index, item in enumerate(source.get("schedule", []))],
        }
        return tables, False

    semester = value.get("semester", {})
    tables = {
        "01_學期設定": [{
            "contract_version": value.get("contractVersion", ""),
            "semester_id": semester.get("id", ""),
            "semester_label": semester.get("label", ""),
            "site_title": semester.get("siteTitle", ""),
            "start_date": semester.get("startDate", ""),
            "end_date": semester.get("endDate", ""),
            "timezone": semester.get("timezone", ""),
            "source_note": semester.get("sourceNote", ""),
            "__row__": 2,
        }],
        "02_科目": [{
            "subject_id": item.get("id"), "subject_label": item.get("label"),
            "short_label": item.get("shortLabel"), "display_order": item.get("displayOrder"), "__row__": index + 2,
        } for index, item in enumerate(value.get("subjects", []))],
        "03_班級": [{
            "class_id": item.get("id"), "class_label": item.get("label"),
            "short_label": item.get("shortLabel"), "display_order": item.get("displayOrder"),
            "color_override": item.get("accent", ""), "__row__": index + 2,
        } for index, item in enumerate(value.get("classes", []))],
        "04_有效座號": [
            {"class_id": item.get("id"), "seat_number": seat, "__row__": 2 + offset}
            for offset, (item, seat) in enumerate((item, seat) for item in value.get("classes", []) for seat in item.get("seats", []))
        ],
        "05_節次": [{
            "period_id": item.get("id"), "period_label": item.get("label"),
            "display_order": item.get("displayOrder"), "start_time": item.get("startTime"),
            "end_time": item.get("endTime"), "__row__": index + 2,
        } for index, item in enumerate(value.get("periods", []))],
        "06_固定課表": [{
            "weekday": item.get("weekday"), "period_id": item.get("periodId"),
            "class_id": item.get("classId"), "subject_id": item.get("subjectId"),
            "note": item.get("note", ""), "__row__": index + 2,
        } for index, item in enumerate(value.get("schedule", []))],
    }
    return tables, False


def write_reports(source: Path, output: Path, normalized: dict[str, Any] | None, collector: IssueCollector) -> dict[str, Any]:
    output.mkdir(parents=True, exist_ok=False)
    raw = source.read_bytes()
    source_hash = sha256_bytes(raw)
    normalized_hash = sha256_bytes(canonical_bytes(normalized)) if normalized is not None else ""
    counts = {
        "classes": len(normalized.get("classes", [])) if normalized else 0,
        "seats": sum(len(item.get("seats", [])) for item in normalized.get("classes", [])) if normalized else 0,
        "subjects": len(normalized.get("subjects", [])) if normalized else 0,
        "periods": len(normalized.get("periods", [])) if normalized else 0,
        "schedule_slots": len(normalized.get("schedule", [])) if normalized else 0,
    }
    manifest = {
        "contractVersion": CONTRACT_VERSION,
        "parserVersion": PARSER_VERSION,
        "sourceFiles": [{"fileName": source.name, "bytes": len(raw), "sha256": source_hash, "sourceType": source.suffix.lower().lstrip(".")}],
    }
    review_payload = {
        "contractVersion": CONTRACT_VERSION,
        "parserVersion": PARSER_VERSION,
        "sourceFiles": manifest["sourceFiles"],
        "normalizedSha256": normalized_hash,
    }
    review_hash_full = sha256_bytes(canonical_bytes(review_payload)) if normalized is not None and collector.errors == 0 else ""
    review_hash = f"HC1-{review_hash_full[:12].upper()}" if review_hash_full else ""
    manifest["reviewHashFull"] = review_hash_full
    report = {
        "contract_version": CONTRACT_VERSION,
        "parser_version": PARSER_VERSION,
        "run_id": str(uuid.uuid4()),
        "status": "BLOCKED" if collector.errors else "NEEDS_CONFIRMATION",
        "source_files": manifest["sourceFiles"],
        "normalized_sha256": normalized_hash,
        "review_hash": review_hash,
        "review_hash_full": review_hash_full,
        "counts": counts,
        "issues": collector.issues,
        "pii_columns_dropped": [],
        "reconciliation": {},
        "deployment_authorized": False,
    }
    (output / "source-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if normalized is not None:
        (output / "normalized-semester.json").write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "validation-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (output / "validation-issues.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        fields = ["severity", "code", "sheet", "row", "column", "record_key", "value_redacted", "message_zh", "expected", "suggested_action", "blocking"]
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(collector.issues)
    lines = [
        "# Homeworkclass 來源驗證報告", "",
        f"- 狀態：**{report['status']}**",
        f"- 來源檔：`{source.name}`",
        f"- 來源 SHA-256：`{source_hash}`",
        f"- 正規化 SHA-256：`{normalized_hash or '未產生'}`",
        f"- review_hash：`{review_hash or '未產生'}`", "",
        "## 計數", "",
        f"- 班級：{counts['classes']}", f"- 有效座號：{counts['seats']}", f"- 科目：{counts['subjects']}",
        f"- 節次：{counts['periods']}", f"- 固定課程：{counts['schedule_slots']}", "",
        "## 問題", "",
    ]
    if collector.issues:
        lines.extend(f"- `{item['severity']}` `{item['code']}` {item['sheet']} {item['message_zh']}" for item in collector.issues)
    else:
        lines.append("- 沒有驗證問題；仍須由教師確認來源。")
    lines.extend(["", "## 下一個紅燈", "", "教師核對所有計數與內容後，回覆：", "", f"`確認來源：{review_hash}`" if review_hash else "目前有阻擋錯誤，不可確認來源。", "", "這個確認不包含 Firebase 正式部署授權。", ""])
    (output / "validation-report.md").write_text("\n".join(lines), encoding="utf-8")
    return report


def validate_command(args: argparse.Namespace) -> int:
    source = Path(args.input).resolve()
    output = Path(args.output).resolve()
    if not source.is_file():
        print(f"SOURCE_NOT_FOUND: {source}", file=sys.stderr)
        return 2
    if source.stat().st_size > MAX_SOURCE_BYTES:
        print("SOURCE_TOO_LARGE: maximum 10 MB", file=sys.stderr)
        return 2
    if output.exists():
        print(f"OUTPUT_MUST_NOT_EXIST: {output}", file=sys.stderr)
        return 2
    collector = IssueCollector()
    if source.suffix.lower() == ".xlsx":
        tables, date_1904 = load_xlsx(source, collector)
        normalized = normalize_from_tables(tables, date_1904, collector) if tables else None
    elif source.suffix.lower() == ".json":
        raw = load_json_source(source, collector)
        tables, date_1904 = tables_from_normalized(raw) if raw is not None else ({}, False)
        normalized = normalize_from_tables(tables, date_1904, collector) if raw is not None else None
    else:
        collector.add("ERROR", "E-SOURCE-TYPE", "只接受標準 .xlsx 或測試用 .json。", value=source.suffix)
        normalized = None
    report = write_reports(source, output, normalized, collector)
    print(json.dumps({"status": report["status"], "counts": report["counts"], "reviewHash": report["review_hash"], "output": str(output)}, ensure_ascii=False))
    return 2 if collector.errors else 0


def approve_command(args: argparse.Namespace) -> int:
    report_path = Path(args.report).resolve()
    normalized_path = report_path.parent / "normalized-semester.json"
    manifest_path = report_path.parent / "source-manifest.json"
    output_path = Path(args.output).resolve()
    if output_path.exists():
        print(f"OUTPUT_MUST_NOT_EXIST: {output_path}", file=sys.stderr)
        return 2
    try:
        report = json.loads(report_path.read_text(encoding="utf-8"))
        normalized = json.loads(normalized_path.read_text(encoding="utf-8"))
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"APPROVAL_INPUT_INVALID: {type(exc).__name__}", file=sys.stderr)
        return 2
    if report.get("status") != "NEEDS_CONFIRMATION" or not report.get("review_hash"):
        print("SOURCE_IS_NOT_APPROVABLE", file=sys.stderr)
        return 2
    if args.review_hash != report["review_hash"]:
        print("REVIEW_HASH_MISMATCH", file=sys.stderr)
        return 2
    actual_normalized = sha256_bytes(canonical_bytes(normalized))
    if actual_normalized != report.get("normalized_sha256"):
        print("NORMALIZED_HASH_MISMATCH", file=sys.stderr)
        return 2
    review_payload = {
        "contractVersion": manifest.get("contractVersion"),
        "parserVersion": manifest.get("parserVersion"),
        "sourceFiles": manifest.get("sourceFiles"),
        "normalizedSha256": actual_normalized,
    }
    review_hash_full = sha256_bytes(canonical_bytes(review_payload))
    expected_short = f"HC1-{review_hash_full[:12].upper()}"
    if (
        manifest.get("contractVersion") != CONTRACT_VERSION
        or manifest.get("parserVersion") != PARSER_VERSION
        or manifest.get("sourceFiles") != report.get("source_files")
        or manifest.get("reviewHashFull") != review_hash_full
        or report.get("review_hash_full") != review_hash_full
        or report.get("review_hash") != expected_short
    ):
        print("SOURCE_GATE_HASH_MISMATCH", file=sys.stderr)
        return 2
    approval = {
        "status": "READY",
        "contractVersion": CONTRACT_VERSION,
        "parserVersion": PARSER_VERSION,
        "reportRunId": report.get("run_id"),
        "reviewHash": report["review_hash"],
        "reviewHashFull": review_hash_full,
        "normalizedSha256": report["normalized_sha256"],
        "sourceFiles": report["source_files"],
        "approvedAt": datetime.now(ZoneInfo("Asia/Taipei")).isoformat(),
        "confirmedByRole": "teacher",
        "confirmationRef": "interactive-teacher-confirmation",
        "approvalScope": "source-only",
        "deploymentAuthorized": False,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(approval, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "READY", "reviewHash": approval["reviewHash"], "deploymentAuthorized": False}, ensure_ascii=False))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Homeworkclass source validator")
    subparsers = parser.add_subparsers(dest="command", required=True)
    validate_parser = subparsers.add_parser("validate", help="Validate .xlsx or normalized fixture JSON")
    validate_parser.add_argument("--input", required=True)
    validate_parser.add_argument("--output", required=True)
    validate_parser.set_defaults(func=validate_command)
    approve_parser = subparsers.add_parser("approve", help="Record the teacher-confirmed review hash")
    approve_parser.add_argument("--report", required=True)
    approve_parser.add_argument("--review-hash", required=True)
    approve_parser.add_argument("--output", required=True)
    approve_parser.set_defaults(func=approve_command)
    args = parser.parse_args()
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())
