from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


PAGE_SIZE = (2480, 3508)
MASTER_SIZE = (1055, 1491)

UNIT_DIR = Path(__file__).resolve().parents[1]
PILOT_DIR = UNIT_DIR / "18_扇形車庫_第2節ImageGen個人解密單樣稿_20260826"
QA_DIR = PILOT_DIR / "_qa"

LOCKED_STUDENT_SOURCE = PILOT_DIR / "04_學生版_正式文字覆排樣稿.png"
LOCKED_STUDENT_FORMAL = PILOT_DIR / "11_學生版_A4直式_個人解密單_正式版_20260826.png"
STUDENT_MASTER = PILOT_DIR / "08_學生版_ImageGen活潑版無字母版_嘗試2_採用.png"
ATTEMPT_1 = PILOT_DIR / "12_教師答案版_ImageGen活潑版無字母版_嘗試1_未採用_主標題碰撞.png"
ATTEMPT_2 = PILOT_DIR / "13_教師答案版_ImageGen活潑版無字母版_嘗試2_未採用_圖例遮擋.png"
STUDENT_QA_MANIFEST = QA_DIR / "15_學生版跨大題防重疊_manifest.json"

CONTACT_OUTPUT = QA_DIR / "16_教師母版_ImageGen兩次未採用_彩色對照.png"
DETAIL_OUTPUT = QA_DIR / "17_教師母版_ImageGen兩次未採用_碰撞局部放大.png"
MANIFEST_OUTPUT = QA_DIR / "18_教師母版_ImageGen兩次停止_manifest.json"

EXPECTED_STUDENT_SHA256 = "A9A69951D582F0ED0E63BFD60003173E5EC2B9AD4253B75B12A59E536C5CE5E4"
EXPECTED_STUDENT_BYTES = 5_938_301
EXPECTED_STUDENT_MASTER_SHA256 = "07F3A1D8859A0EFC340610E1F498AD5F52607D5735E1D7166E0E6AB0EA70CBD2"
EXPECTED_ATTEMPT_1_SHA256 = "CC2BB34EA4CD8EC69D26D811BB75378C6DD054A73ACC4BD3FCAB3D0AE5F2504D"
EXPECTED_ATTEMPT_2_SHA256 = "958A38ABA001D7A62E32CE5AD5FA5556571769E85308AF5A839FE0581E6A7801"

ZH_REGULAR = Path(r"C:\Windows\Fonts\msjh.ttc")
ZH_BOLD = Path(r"C:\Windows\Fonts\msjhbd.ttc")

ATTEMPT_1_PROMPT = """Use case: precise-object-edit
Asset type: A4 portrait elementary-school worksheet, no-text teacher answer visual master
Input images: Image 1 is the exact edit target and the complete approved student no-text master.
Primary request: Add only one small functional teacher-answer cue: a coral-red circular badge with one simple white check mark, placed inside the unused upper-right area of the large white title cloud, above the future title line. Keep the badge about 45 x 45 pixels relative to the 1055 x 1491 source, centered near source coordinate x=705, y=70.
Style/medium: preserve the exact existing warm 3D chibi family-animation worksheet style.
Composition/framing: preserve the exact A4 portrait framing, all section boundaries, paper shapes, writing spaces, cards, decorative train characters, railway signal, bunting, track border, and negative space.
Critical invariants: change only the tiny check badge area; keep every other pixel-level object and geometry unchanged as closely as possible. Preserve exactly one central turntable, exactly 12 radial tracks, exactly 12 roundhouse bays, and exactly one small locomotive in the section-3 diagram. Preserve all four colored section bands, every ticket/card, the existing icons and characters, and every blank writing/answer area. Do not move, resize, crop, cover, replace, restyle, or add any other object.
Text constraint: absolutely no readable text, no letters, no numbers, no fake text, no pseudo-writing, no watermark, no logo.
Avoid: layout drift, added labels, extra badges, extra trains, changed track or bay count, altered card geometry, changed page proportions, objects touching future text or answer areas."""

ATTEMPT_2_PROMPT = """Use case: precise-object-edit
Asset type: A4 portrait elementary-school worksheet, no-text teacher answer visual master
Input images: Image 1 is the exact edit target from attempt 1.
Primary request: Fix only the teacher-answer cue placement. Completely remove the coral circular check badge from the large white title cloud and restore that cloud to clean blank white paper. Add one small coral-red check mark, without a surrounding circle, centered on the existing yellow puzzle piece held by the train character at the far right of the blue matching section. The check mark should be small enough to stay fully inside the yellow puzzle piece.
Critical invariants: make only these two localized changes. Keep every other object, pixel-level geometry, color band, paper/card shape, writing space, character, prop, border, and decoration unchanged as closely as possible. Keep the title cloud fully blank. Preserve exactly one central turntable, exactly 12 radial tracks, exactly 12 roundhouse bays, and exactly one small locomotive in the section-3 diagram. Preserve all four colored section bands and all answer/write spaces.
Text constraint: absolutely no readable text, no letters, no numbers, no fake text, no pseudo-writing, no watermark, no logo.
Avoid: any cue near the title or future text, layout drift, extra badges, extra trains, changed track or bay count, altered card geometry, changed page proportions, objects touching future text or answer areas."""


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def image_info(path: Path) -> dict:
    with Image.open(path) as image:
        return {
            "path": str(path),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "pixels": list(image.size),
            "mode": image.mode,
        }


def zh_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ZH_BOLD if bold else ZH_REGULAR), size)


def project_to_page(box: tuple[int, int, int, int]) -> list[float]:
    scale_x = PAGE_SIZE[0] / MASTER_SIZE[0]
    scale_y = PAGE_SIZE[1] / MASTER_SIZE[1]
    return [
        round(box[0] * scale_x, 2),
        round(box[1] * scale_y, 2),
        round(box[2] * scale_x, 2),
        round(box[3] * scale_y, 2),
    ]


def overlap_box(first: list[float], second: list[float]) -> list[float] | None:
    left = max(first[0], second[0])
    top = max(first[1], second[1])
    right = min(first[2], second[2])
    bottom = min(first[3], second[3])
    if left >= right or top >= bottom:
        return None
    return [round(left, 2), round(top, 2), round(right, 2), round(bottom, 2)]


def make_contact_sheet() -> None:
    canvas = Image.new("RGB", (2140, 1580), "#F4F0E8")
    draw = ImageDraw.Draw(canvas)
    title_font = zh_font(42, bold=True)
    note_font = zh_font(25)
    entries = (
        (ATTEMPT_1, "第1次：主標題碰撞（未採用）"),
        (ATTEMPT_2, "第2次：圖例遮擋（未採用）"),
    )
    for index, (path, label) in enumerate(entries):
        with Image.open(path) as source:
            page = source.convert("RGB")
            page.thumbnail((980, 1390), Image.Resampling.LANCZOS)
        x = 55 + index * 1045 + (980 - page.width) // 2
        y = 125 + (1390 - page.height) // 2
        canvas.paste(page, (x, y))
        label_box = draw.textbbox((0, 0), label, font=title_font)
        label_width = label_box[2] - label_box[0]
        draw.text((x + (page.width - label_width) / 2, 35), label, font=title_font, fill="#0B5558")
        draw.rectangle(
            (x - 2, y - 2, x + page.width + 2, y + page.height + 2),
            outline="#B9B3A8",
            width=3,
        )
    draw.text(
        (60, 1528),
        "只供 QA；兩張均保留、均不得作正式教師母版。",
        font=note_font,
        fill="#5B686C",
    )
    canvas.save(CONTACT_OUTPUT, format="PNG", optimize=True)


def make_detail_sheet(
    title_glyph_page: list[float],
    attempt_1_badge_source: tuple[int, int, int, int],
    attempt_2_check_source: tuple[int, int, int, int],
    yellow_train_icon_source: tuple[int, int, int, int],
) -> None:
    canvas = Image.new("RGB", (1900, 1020), "#F4F0E8")
    draw = ImageDraw.Draw(canvas)
    heading_font = zh_font(40, bold=True)
    note_font = zh_font(28)

    title_glyph_source = (
        round(title_glyph_page[0] * MASTER_SIZE[0] / PAGE_SIZE[0]),
        round(title_glyph_page[1] * MASTER_SIZE[1] / PAGE_SIZE[1]),
        round(title_glyph_page[2] * MASTER_SIZE[0] / PAGE_SIZE[0]),
        round(title_glyph_page[3] * MASTER_SIZE[1] / PAGE_SIZE[1]),
    )

    with Image.open(ATTEMPT_1) as source:
        image = source.convert("RGB")
        local = image.crop((190, 20, 790, 175))
    local_draw = ImageDraw.Draw(local)
    for box, color in ((attempt_1_badge_source, "#D32F2F"), (title_glyph_source, "#1565C0")):
        shifted = (box[0] - 190, box[1] - 20, box[2] - 190, box[3] - 20)
        local_draw.rectangle(shifted, outline=color, width=4)
    local = local.resize((1700, 439), Image.Resampling.LANCZOS)
    draw.text((100, 30), "第1次：紅框徽章壓入藍框主標題實際字形區", font=heading_font, fill="#0B5558")
    canvas.paste(local, (100, 95))

    with Image.open(ATTEMPT_2) as source:
        image = source.convert("RGB")
        local = image.crop((590, 1095, 760, 1190))
    local_draw = ImageDraw.Draw(local)
    for box, color in ((attempt_2_check_source, "#D32F2F"), (yellow_train_icon_source, "#1565C0")):
        shifted = (box[0] - 590, box[1] - 1095, box[2] - 590, box[3] - 1095)
        local_draw.rectangle(shifted, outline=color, width=3)
    local = local.resize((850, 475), Image.Resampling.NEAREST)
    draw.text((100, 580), "第2次：紅框勾號誤蓋藍框第四色圖例火車圖示", font=heading_font, fill="#0B5558")
    canvas.paste(local, (100, 640))
    draw.text((1010, 720), "ImageGen 兩次上限已用完。", font=heading_font, fill="#B23A32")
    draw.text((1010, 790), "停止覆排教師答案與後續12頁，等待教師決定。", font=note_font, fill="#5B686C")
    canvas.save(DETAIL_OUTPUT, format="PNG", optimize=True)


def main() -> None:
    required = (
        LOCKED_STUDENT_SOURCE,
        LOCKED_STUDENT_FORMAL,
        STUDENT_MASTER,
        ATTEMPT_1,
        ATTEMPT_2,
        STUDENT_QA_MANIFEST,
    )
    missing = [str(path) for path in required if not path.exists()]
    if missing:
        raise FileNotFoundError("Missing required files: " + ", ".join(missing))

    checks = {
        "student_source_hash": sha256(LOCKED_STUDENT_SOURCE),
        "student_formal_hash": sha256(LOCKED_STUDENT_FORMAL),
        "student_source_bytes": LOCKED_STUDENT_SOURCE.stat().st_size,
        "student_formal_bytes": LOCKED_STUDENT_FORMAL.stat().st_size,
        "student_master_hash": sha256(STUDENT_MASTER),
        "attempt_1_hash": sha256(ATTEMPT_1),
        "attempt_2_hash": sha256(ATTEMPT_2),
    }
    expected = {
        "student_source_hash": EXPECTED_STUDENT_SHA256,
        "student_formal_hash": EXPECTED_STUDENT_SHA256,
        "student_source_bytes": EXPECTED_STUDENT_BYTES,
        "student_formal_bytes": EXPECTED_STUDENT_BYTES,
        "student_master_hash": EXPECTED_STUDENT_MASTER_SHA256,
        "attempt_1_hash": EXPECTED_ATTEMPT_1_SHA256,
        "attempt_2_hash": EXPECTED_ATTEMPT_2_SHA256,
    }
    if checks != expected:
        raise AssertionError(f"Locked inputs changed: {checks}")

    with STUDENT_QA_MANIFEST.open("r", encoding="utf-8") as handle:
        student_manifest = json.load(handle)
    title_record = next(
        record
        for record in student_manifest["candidate"]["text_records"]
        if record["text"] == "個人《扇形車庫解密單》"
    )
    title_glyph_page = [float(value) for value in title_record["rendered_bbox"]]

    attempt_1_badge_source = (636, 55, 686, 106)
    attempt_2_check_source = (649, 1133, 687, 1166)
    yellow_train_icon_source = (649, 1132, 692, 1165)
    attempt_1_badge_page = project_to_page(attempt_1_badge_source)
    attempt_1_title_overlap = overlap_box(attempt_1_badge_page, title_glyph_page)

    QA_DIR.mkdir(parents=True, exist_ok=True)
    make_contact_sheet()
    make_detail_sheet(
        title_glyph_page,
        attempt_1_badge_source,
        attempt_2_check_source,
        yellow_train_icon_source,
    )

    manifest = {
        "generated_on": "2026-08-26",
        "status": "stopped_waiting_teacher_after_two_imagegen_attempts",
        "scope": "已另存11號學生正式數位頁；教師答案無字母版兩次ImageGen均未通過，因此未覆排教師答案、未生成其餘12頁、未更新14至17號正式成果。",
        "rdq": {
            "path": str(
                UNIT_DIR.parents[2]
                / "rdq"
                / "RDQ-spec-fan-roundhouse-lesson2-formal-imagegen-batch-20260826.md"
            ),
            "status": "confirmed",
            "maximum_imagegen_attempts_per_page": 2,
        },
        "locked_student": {
            "source": image_info(LOCKED_STUDENT_SOURCE),
            "formal_copy": image_info(LOCKED_STUDENT_FORMAL),
            "bytes_equal": LOCKED_STUDENT_SOURCE.read_bytes() == LOCKED_STUDENT_FORMAL.read_bytes(),
            "hash_equal": sha256(LOCKED_STUDENT_SOURCE) == sha256(LOCKED_STUDENT_FORMAL),
            "digital_status": "正式數位教材；實體試印待教師完成",
        },
        "teacher_master_attempts": [
            {
                "attempt": 1,
                "tool": "built-in imagegen reference edit",
                "reference": image_info(STUDENT_MASTER),
                "prompt": ATTEMPT_1_PROMPT,
                "output": image_info(ATTEMPT_1),
                "manual_no_readable_text": True,
                "manual_structure_count": {
                    "turntable": 1,
                    "radial_tracks": 12,
                    "roundhouse_bays": 12,
                    "small_locomotive": 1,
                },
                "passed": False,
                "failure": "新增勾選徽章進入主標題實際字形區，違反裝飾避讓與不可遮字規則。",
                "badge_bbox_source": list(attempt_1_badge_source),
                "badge_bbox_page": attempt_1_badge_page,
                "locked_title_glyph_bbox_page": title_glyph_page,
                "overlap_bbox_page": attempt_1_title_overlap,
            },
            {
                "attempt": 2,
                "tool": "built-in imagegen reference edit",
                "reference": image_info(ATTEMPT_1),
                "prompt": ATTEMPT_2_PROMPT,
                "output": image_info(ATTEMPT_2),
                "manual_no_readable_text": True,
                "manual_structure_count": {
                    "turntable": 1,
                    "radial_tracks": 12,
                    "roundhouse_bays": 12,
                    "small_locomotive": 1,
                },
                "passed": False,
                "failure": "勾號誤放並覆蓋第四色圖例的黃色火車圖示，違反圖例不得被裝飾接觸或遮住。",
                "misplaced_check_bbox_source": list(attempt_2_check_source),
                "locked_yellow_train_icon_bbox_source": list(yellow_train_icon_source),
                "overlap_bbox_source": overlap_box(
                    [float(value) for value in attempt_2_check_source],
                    [float(value) for value in yellow_train_icon_source],
                ),
            },
        ],
        "qa_outputs": [
            image_info(CONTACT_OUTPUT),
            image_info(DETAIL_OUTPUT),
        ],
        "formal_14_to_17_readback_unchanged": {
            "14_student_pdf": {
                "bytes": 3_538_976,
                "sha256": "8C755B7C29E5E6111C528119D5BE8498CBFD47A22CAB2D78FA9BC15E49424516",
            },
            "15_teacher_pdf": {
                "bytes": 3_664_255,
                "sha256": "88B6301ABCD0D59F481E0CA21CEBE34235126F551F51710604F6BCD1DC124D33",
            },
            "16_image_folder": {
                "file_count": 22,
                "total_bytes": 8_273_905,
                "note": "本階段只讀回檔數與位元組；整套完成前不建立覆寫備份，也不更新內容。",
            },
            "17_qa_record": {
                "bytes": 5_706,
                "sha256": "60257B29603D866DC97E9A82332C835559ED12BE38523583B608AB4C4CD29D55",
            },
        },
        "stopped_actions": [
            "不建立教師答案正式覆排頁",
            "不生成其餘12頁",
            "不更新14至17號正式成果",
            "不宣稱已完成實體試印",
        ],
        "next_gate": "等待教師決定是否改採可重建答案層搭配鎖定學生無字母版，或另行明確授權新的ImageGen策略。",
    }
    MANIFEST_OUTPUT.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
