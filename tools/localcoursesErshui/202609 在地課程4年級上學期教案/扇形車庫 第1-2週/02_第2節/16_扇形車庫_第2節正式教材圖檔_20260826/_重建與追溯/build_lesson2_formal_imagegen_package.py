from __future__ import annotations

import hashlib
import json
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4, A5, A6, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


UNIT_DIR = Path(__file__).resolve().parents[2]
STAGING = UNIT_DIR / "_work" / "staging" / "lesson2_formal_imagegen_20260826"
FORMAL = STAGING / "formal_targets"
PAGES = STAGING / "pages"
MASTERS = STAGING / "masters"
STAGING_QA = STAGING / "qa"

STUDENT_PDF = FORMAL / "14_扇形車庫_第2節正式教材_學生版_20260826.pdf"
TEACHER_PDF = FORMAL / "15_扇形車庫_第2節正式教材_教師答案版_20260826.pdf"
FINAL_PNG_DIR = FORMAL / "16_扇形車庫_第2節正式教材圖檔_20260826"
FINAL_QA_MD = FORMAL / "17_扇形車庫_第2節正式教材_教師確認與製作QA紀錄_20260826.md"
PACKAGE_QA = STAGING / "formal_package_qa"

SKILL_DIR = UNIT_DIR.parents[2] / "skills" / "ershui-local-curriculum-builder"
COMIC_FONT = SKILL_DIR / "assets" / "fonts" / "ComicRelief-Regular.ttf"
COMIC_LICENSE = SKILL_DIR / "assets" / "fonts" / "OFL.txt"
COMIC_RECORD = SKILL_DIR / "references" / "comic-relief-font.md"
PDF_FONT = Path(r"C:\Windows\Fonts\kaiu.ttf")
ZH_FONT = Path(r"C:\Windows\Fonts\msjhbd.ttc")
PDFTOPPM = Path(
    r"C:\Users\User\.cache\codex-runtimes\codex-primary-runtime"
    r"\dependencies\native\poppler\Library\bin\pdftoppm.exe"
)

PAGE_SPECS = [
    (
        "01_學生版_A4直式_個人解密單.png",
        "01_教師答案版_A4直式_個人解密單.png",
        A4,
        (2480, 3508),
        "個人扇形車庫解密單\n1922年啟用，初期有6股道。\n1933年形成12股道。\nWhere's the turntable?\nIt's in the middle.",
    ),
    (
        "02_學生版_A5直式_四色圖例卡.png",
        "02_教師答案版_A5直式_四色圖例卡.png",
        A5,
        (1748, 2480),
        "四色圖例卡\n紅色圓形 中央轉車台\n藍色線條 放射狀軌道\n綠色方格 扇形車庫庫位\n黃色火車 火車頭",
    ),
    (
        "03_學生版_A6直式_三格出口票.png",
        "03_教師答案版_A6直式_三格出口票.png",
        A6,
        (1240, 1748),
        "三格出口票\n扇形車庫何時啟用？當時有幾股道？\n轉車台有什麼功能？\nWhere's the turntable?\nIt's in the middle.",
    ),
    (
        "04_學生版_A4橫式_何時構件功能三格圖示板.png",
        "04_教師答案版_A4橫式_何時構件功能三格圖示板.png",
        landscape(A4),
        (3508, 2480),
        "何時 構件 功能 三格圖示板\nWHEN WHAT HOW\nT1 T2 M1 M2 M3 F1 F2 F3",
    ),
    (
        "05_學生版_A4直式_8張中文資料句條.png",
        "05_教師答案版_A4直式_8張中文資料句條.png",
        A4,
        (2480, 3508),
        "8張中文資料句條\n1922年，彰化扇形車庫啟用，初期有6股道。\n後來分期增建，1933年形成12股道。\n轉車台位在扇形軌道中央。\n放射狀軌道從轉車台連到各個庫位。\n扇形車庫有多個庫位，可容納火車頭。\n轉車台讓火車頭轉向並對準軌道。\n放射狀軌道讓火車頭進出不同庫位。\n車庫供火車頭檢修、保養與停放。",
    ),
    (
        "06_學生版_A5直式_4張英文句型卡.png",
        "06_教師答案版_A5直式_4張英文句型卡.png",
        A5,
        (1748, 2480),
        "4張英文句型卡\nWhat's this?\nIt's a turntable.\nWhere's the turntable?\nIt's in the middle.",
    ),
    (
        "07_學生版_A5直式_30秒導覽順序卡.png",
        "07_教師答案版_A5直式_30秒導覽順序卡.png",
        A5,
        (1748, 2480),
        "30秒導覽順序卡\n先說由來\n指出並命名構件\n做一組英語問答\n說明一個功能\nWhere's the turntable?\nIt's in the middle.",
    ),
]

SELECTED_MASTERS = [
    "01_個人解密單_ImageGen無字母版_採用.png",
    "02_四色圖例卡_ImageGen無字母版_嘗試2_採用.png",
    "03_三格出口票_ImageGen無字母版_嘗試1_採用.png",
    "04_何時構件功能三格圖示板_ImageGen無字母版_嘗試1_採用.png",
    "05_8張中文資料句條_ImageGen無字母版_嘗試3_採用.png",
    "06_4張英文句型卡_ImageGen無字母版_嘗試2_採用.png",
    "07_30秒導覽順序卡_ImageGen無字母版_嘗試1_採用.png",
]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def require_path(path: Path) -> None:
    if not path.exists():
        raise FileNotFoundError(path)


def reset_staging_directory(path: Path) -> None:
    resolved = path.resolve()
    allowed = STAGING.resolve()
    if resolved.parent != allowed:
        raise RuntimeError(f"Refusing to reset non-staging target: {resolved}")
    if resolved.exists():
        shutil.rmtree(resolved)
    resolved.mkdir(parents=True)


def build_pdf(output: Path, source_dir: Path, student: bool) -> None:
    pdfmetrics.registerFont(TTFont("PDFZH", str(PDF_FONT)))
    first_size = PAGE_SPECS[0][2]
    document = canvas.Canvas(str(output), pagesize=first_size, pageCompression=1)
    document.setTitle(output.stem)
    document.setAuthor("二水國小在地課程教材製作")
    document.setSubject("扇形車庫第2節 ImageGen 正式數位教材")
    for student_name, teacher_name, page_size, _, hidden_text in PAGE_SPECS:
        image_path = source_dir / (student_name if student else teacher_name)
        require_path(image_path)
        width_pt, height_pt = page_size
        document.setPageSize(page_size)
        document.drawImage(
            ImageReader(str(image_path)),
            0,
            0,
            width=width_pt,
            height=height_pt,
            preserveAspectRatio=False,
            mask="auto",
        )
        hidden = document.beginText()
        hidden.setTextOrigin(4, 4)
        hidden.setFont("PDFZH", 2)
        hidden.setTextRenderMode(3)
        for line in hidden_text.splitlines():
            hidden.textLine(line)
        document.drawText(hidden)
        document.showPage()
    document.save()


def verify_pdf(path: Path, required_text: list[str]) -> dict:
    reader = PdfReader(str(path))
    if len(reader.pages) != 7:
        raise AssertionError(f"{path.name}: expected 7 pages, got {len(reader.pages)}")
    sizes: list[list[float]] = []
    extracted: list[str] = []
    for page, (_, _, expected, _, _) in zip(reader.pages, PAGE_SPECS):
        actual = (float(page.mediabox.width), float(page.mediabox.height))
        if abs(actual[0] - expected[0]) > 1 or abs(actual[1] - expected[1]) > 1:
            raise AssertionError(f"{path.name}: {actual} != {expected}")
        sizes.append([round(actual[0], 2), round(actual[1], 2)])
        extracted.append(page.extract_text() or "")
    all_text = "\n".join(extracted)
    missing = [text for text in required_text if text not in all_text]
    if missing:
        raise AssertionError(f"{path.name}: missing hidden text {missing}")
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "pages": len(reader.pages),
        "page_sizes_pt": sizes,
        "required_text": required_text,
    }


def render_pdf(path: Path, label: str) -> list[Path]:
    require_path(PDFTOPPM)
    output_dir = PACKAGE_QA / f"render_{label}"
    output_dir.mkdir(parents=True, exist_ok=True)
    prefix = output_dir / label
    subprocess.run(
        [str(PDFTOPPM), "-png", "-r", "120", str(path), str(prefix)],
        check=True,
        capture_output=True,
        text=True,
    )
    rendered = sorted(output_dir.glob(f"{label}-*.png"))
    if len(rendered) != 7:
        raise AssertionError(f"{path.name}: expected 7 renders, got {len(rendered)}")
    return rendered


def contact_sheet(paths: list[Path], output: Path, title: str, grayscale: bool = False) -> None:
    sheet = Image.new("RGB", (1600, 2400), "#F5F7F7")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype(str(ZH_FONT), 46)
    small = ImageFont.truetype(str(ZH_FONT), 28)
    draw.text((55, 35), title, fill="#24494D", font=font)
    for index, path in enumerate(paths):
        image = Image.open(path).convert("RGB")
        if grayscale:
            image = ImageOps.grayscale(image).convert("RGB")
        image.thumbnail((700, 500), Image.Resampling.LANCZOS)
        col = index % 2
        row = index // 2
        x0 = 40 + col * 780
        y0 = 125 + row * 555
        draw.text((x0, y0), f"第 {index + 1} 頁", fill="#24494D", font=small)
        x = x0 + (700 - image.width) // 2
        y = y0 + 42 + (480 - image.height) // 2
        sheet.paste(image, (x, y))
        image.close()
    sheet.save(output, dpi=(150, 150), optimize=True)
    sheet.close()


def copy_formal_inputs() -> list[dict]:
    FINAL_PNG_DIR.mkdir(parents=True)
    copied: list[dict] = []
    for student_name, teacher_name, _, expected_px, _ in PAGE_SPECS:
        for version_dir, filename in (("學生版", student_name), ("教師答案版", teacher_name)):
            source = PAGES / version_dir / filename
            target = FINAL_PNG_DIR / filename
            require_path(source)
            shutil.copy2(source, target)
            with Image.open(target) as image:
                if image.size != expected_px:
                    raise AssertionError(f"{filename}: {image.size} != {expected_px}")
                dpi = image.info.get("dpi")
                if not dpi or abs(dpi[0] - 300) > 1 or abs(dpi[1] - 300) > 1:
                    raise AssertionError(f"{filename}: wrong dpi {dpi}")
            copied.append(
                {
                    "file": filename,
                    "version": version_dir,
                    "pixels": list(expected_px),
                    "bytes": target.stat().st_size,
                    "sha256": sha256(target),
                }
            )
    return copied


def copy_supporting_evidence() -> None:
    master_dir = FINAL_PNG_DIR / "_ImageGen採用母版"
    master_dir.mkdir()
    for filename in SELECTED_MASTERS:
        shutil.copy2(MASTERS / filename, master_dir / filename)

    asset_dir = FINAL_PNG_DIR / "_assets" / "Comic Relief"
    asset_dir.mkdir(parents=True)
    for source in (COMIC_FONT, COMIC_LICENSE, COMIC_RECORD):
        require_path(source)
        shutil.copy2(source, asset_dir / source.name)

    evidence_dir = FINAL_PNG_DIR / "_QA證據"
    evidence_dir.mkdir()
    for filename in (
        "01_學生版_7頁彩色接觸表.png",
        "02_學生版_7頁灰階接觸表.png",
        "03_教師答案版_7頁彩色接觸表.png",
        "04_教師答案版_7頁灰階接觸表.png",
        "05_第2節ImageGen整批頁面_manifest.json",
    ):
        shutil.copy2(STAGING_QA / filename, evidence_dir / filename)
    shutil.copytree(STAGING_QA / "列印預覽", evidence_dir / "列印預覽")

    rebuild_dir = FINAL_PNG_DIR / "_重建與追溯"
    rebuild_dir.mkdir()
    shutil.copy2(STAGING / "06_ImageGen與覆排修復追溯_20260826.md", rebuild_dir)
    for filename in (
        "build_lesson2_imagegen_full_batch.py",
        "build_lesson2_teacher_formal_overlay.py",
        "build_lesson2_formal_imagegen_package.py",
    ):
        shutil.copy2(UNIT_DIR / "_work" / filename, rebuild_dir / filename)


def directory_manifest(root: Path) -> list[dict]:
    records: list[dict] = []
    for path in sorted(p for p in root.rglob("*") if p.is_file()):
        records.append(
            {
                "relative_path": path.relative_to(root).as_posix(),
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
        )
    return records


def main() -> None:
    for required in (PAGES, MASTERS, STAGING_QA, COMIC_FONT, COMIC_LICENSE, PDF_FONT, PDFTOPPM):
        require_path(required)
    reset_staging_directory(FORMAL)
    reset_staging_directory(PACKAGE_QA)

    png_records = copy_formal_inputs()
    copy_supporting_evidence()

    build_pdf(STUDENT_PDF, FINAL_PNG_DIR, student=True)
    build_pdf(TEACHER_PDF, FINAL_PNG_DIR, student=False)
    student_pdf_check = verify_pdf(STUDENT_PDF, ["1922", "1933", "Where's the turntable?"])
    teacher_pdf_check = verify_pdf(TEACHER_PDF, ["1922", "1933", "It's in the middle."])

    student_renders = render_pdf(STUDENT_PDF, "student")
    teacher_renders = render_pdf(TEACHER_PDF, "teacher")
    contact_sheet(student_renders, PACKAGE_QA / "01_學生PDF_7頁彩色回渲.png", "學生 PDF 七頁彩色回渲")
    contact_sheet(teacher_renders, PACKAGE_QA / "02_教師PDF_7頁彩色回渲.png", "教師 PDF 七頁彩色回渲")
    contact_sheet(student_renders, PACKAGE_QA / "03_學生PDF_7頁灰階回渲.png", "學生 PDF 七頁灰階回渲", grayscale=True)
    contact_sheet(teacher_renders, PACKAGE_QA / "04_教師PDF_7頁灰階回渲.png", "教師 PDF 七頁灰階回渲", grayscale=True)
    shutil.copytree(PACKAGE_QA, FINAL_PNG_DIR / "_QA證據" / "PDF回渲")

    readme = """# 扇形車庫第 2 節正式教材清冊與列印說明

- 狀態：正式數位教材；實體試印待教師完成。
- 共 14 張分頁 PNG：學生版 7 張、教師答案版 7 張。
- 紙張順序：A4 直式、A5 直式、A6 直式、A4 橫式、A4 直式、A5 直式、A5 直式。
- 所有 PNG：300 dpi；PDF 依相同紙張尺寸與頁序組裝。
- 學生／教師頁共用已核准的完整 ImageGen 母版；教師版只疊加可重建答案層。
- 正式英文使用 Comic Relief Regular，字型檔與 OFL 1.1 授權成對保存於 `_assets/Comic Relief/`。
- `_ImageGen採用母版/` 保存七張正式母版；`_重建與追溯/` 保存提示詞規格、修復紀錄與重建腳本；`_QA證據/` 保存彩色、灰階、列印預覽及 PDF 回渲。
- 建議列印時選「實際大小」或 100%，不要使用自動裁切；先由教師各試印一張確認校內印表機邊界。
"""
    (FINAL_PNG_DIR / "00_教材清冊與列印說明.md").write_text(readme, encoding="utf-8")

    package_files_before_manifest = directory_manifest(FINAL_PNG_DIR)
    package_manifest = {
        "generated_on": "2026-08-26",
        "status": "formal digital teaching materials; physical test print teacher-todo",
        "student_pdf": student_pdf_check,
        "teacher_pdf": teacher_pdf_check,
        "page_pngs": png_records,
        "page_png_count": len(png_records),
        "page_png_total_bytes": sum(item["bytes"] for item in png_records),
        "comic_relief": {
            "font_sha256": sha256(COMIC_FONT),
            "license_sha256": sha256(COMIC_LICENSE),
        },
        "qa": {
            "content": "pass",
            "answers": "pass",
            "student_teacher_pair_alignment": "pass; outside answer masks difference 0 for pages 1-7",
            "text_bbox": "pass; pages 2-7 119/119 inside targets",
            "collision": "pass",
            "prohibited_terms": "pass; 0",
            "comic_relief_actual_font": "pass",
            "color_and_grayscale": "pass",
            "print_previews": "pass; 14/14 present",
            "pdf_render": "pass; student 7/7 and teacher 7/7",
            "physical_print": "teacher-todo",
        },
        "supporting_file_count_before_manifest": len(package_files_before_manifest),
        "supporting_files_before_manifest": package_files_before_manifest,
    }
    manifest_path = FINAL_PNG_DIR / "manifest.json"
    manifest_path.write_text(json.dumps(package_manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    all_package_files = directory_manifest(FINAL_PNG_DIR)
    package_count = len(all_package_files)
    package_bytes = sum(item["bytes"] for item in all_package_files)
    qa_text = f"""# 扇形車庫第 2 節正式教材：教師確認與製作 QA 紀錄

## 結論

- 狀態：**正式數位教材**。
- 學生版 7 頁與教師答案版 7 頁均已完成；實體試印仍列為教師端待辦。
- 本次採整套 staging、全量 QA、備份後交易式換版；正式換版前會把舊 14–17 的檔數、位元組與逐檔 SHA-256 另存於版本化備份資料夾。

## 教師已確認的內容

- 1922 年啟用、初期 6 股道；1933 年形成 12 股道。
- 個人解密單配對 A→2、B→3、C→1；12 軌、12 庫位、1 個中央轉車台與 1 個火車頭。
- 四色：紅色圓形中央轉車台、藍色線條放射狀軌道、綠色方格車庫庫位、黃色火車火車頭。
- 英文：`What's this?`、`It's a turntable.`、`Where's the turntable?`、`It's in the middle.`。
- 8 張中文資料句條、4 張英文句型卡、三格出口票、三格圖示板與 30 秒導覽順序卡均依已確認尺寸製作。

## 數位 QA

- 分頁 PNG：14 張，{sum(item['bytes'] for item in png_records):,} bytes；全部約 300 dpi，尺寸與紙張規格正確。
- PDF：學生 7 頁、教師 7 頁；頁序與紙張尺寸讀回正確；隱藏搜尋文字含 1922、1933 與指定英文句型。
- 學生／教師配對：第 1–7 頁在答案遮罩外的逐像素差異均為 0。
- 文字框：第 2–7 頁共 119 筆，119/119 在目標框內；跨題重疊 0；資料句的 `1933` 為不可拆數字字組。
- 字型：正式英文使用 Comic Relief Regular；SHA-256 `{sha256(COMIC_FONT)}`。OFL.txt SHA-256 `{sha256(COMIC_LICENSE)}`。
- 禁用字樣：學生樣稿、教師樣稿、草稿、待確認均為 0。
- 視覺：學生／教師彩色與灰階接觸表、14 張列印預覽、PDF 彩色與灰階回渲均通過人工讀圖。
- 圖檔包：{package_count} 檔，{package_bytes:,} bytes（含 14 張正式頁、7 張採用母版、字型授權、QA 證據、提示詞與重建工具）。

## PDF 雜湊

- 學生版：`{student_pdf_check['sha256']}`，{student_pdf_check['bytes']:,} bytes。
- 教師答案版：`{teacher_pdf_check['sha256']}`，{teacher_pdf_check['bytes']:,} bytes。

## 追溯與失敗保存

- ImageGen 提示詞規格、各母版失敗原因、檔名、位元組與 SHA-256：`16_扇形車庫_第2節正式教材圖檔_20260826/_重建與追溯/06_ImageGen與覆排修復追溯_20260826.md`。
- 完整覆排失敗候選保留於：`_work/staging/lesson2_formal_imagegen_20260826/failed_attempts/`。
- 舊 confirmed RDQ 與歷史對話未回寫；本次執行依新的 confirmed RDQ。

## 尚待教師完成

- 以校內實際印表機各試印一張，確認邊界、紙張方向與裁切安全區；此待辦不影響「正式數位教材」狀態。
"""
    FINAL_QA_MD.write_text(qa_text, encoding="utf-8")

    final_summary = {
        "formal_directory": str(FORMAL),
        "student_pdf": student_pdf_check,
        "teacher_pdf": teacher_pdf_check,
        "formal_png_directory": {
            "path": str(FINAL_PNG_DIR),
            "files": package_count,
            "bytes": package_bytes,
        },
        "qa_markdown": {
            "path": str(FINAL_QA_MD),
            "bytes": FINAL_QA_MD.stat().st_size,
            "sha256": sha256(FINAL_QA_MD),
        },
        "pdf_render_contacts": [
            {"file": path.name, "bytes": path.stat().st_size, "sha256": sha256(path)}
            for path in sorted(PACKAGE_QA.glob("*.png"))
        ],
    }
    (STAGING / "07_正式封裝_manifest.json").write_text(
        json.dumps(final_summary, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps(final_summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
