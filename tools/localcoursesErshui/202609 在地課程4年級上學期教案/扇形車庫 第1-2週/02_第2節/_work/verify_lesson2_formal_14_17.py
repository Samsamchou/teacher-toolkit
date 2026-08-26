from __future__ import annotations

import hashlib
import json
from pathlib import Path

from PIL import Image
from pypdf import PdfReader
from reportlab.lib.pagesizes import A4, A5, A6, landscape


UNIT_DIR = Path(__file__).resolve().parents[1]
STAGING = UNIT_DIR / "_work" / "staging" / "lesson2_formal_imagegen_20260826"
FORMAL_STAGE = STAGING / "formal_targets"
STUDENT_PDF_NAME = "14_扇形車庫_第2節正式教材_學生版_20260826.pdf"
TEACHER_PDF_NAME = "15_扇形車庫_第2節正式教材_教師答案版_20260826.pdf"
PACKAGE_NAME = "16_扇形車庫_第2節正式教材圖檔_20260826"
QA_NAME = "17_扇形車庫_第2節正式教材_教師確認與製作QA紀錄_20260826.md"
BACKUP_MANIFEST = (
    UNIT_DIR
    / "_history"
    / "backups"
    / "lesson2_formal_before_imagegen_20260826-201024"
    / "00_舊版14-17備份_manifest.json"
)

EXPECTED_PDF = {
    STUDENT_PDF_NAME: {
        "bytes": 75_462_122,
        "sha256": "E59F7B237555D6167858F7B83FFF17096BD1068E20CB05C5411FFB7C436BB36E",
        "text": ["1922", "1933", "Where's the turntable?"],
    },
    TEACHER_PDF_NAME: {
        "bytes": 74_269_074,
        "sha256": "F79BB242679D12D3A9B995A3CD3AFBB1F6AB240BE6C94F8483BD64D3C62D7EC2",
        "text": ["1922", "1933", "It's in the middle."],
    },
}
EXPECTED_SIZES = [A4, A5, A6, landscape(A4), A4, A5, A5]
EXPECTED_PAGE_PNG_SHA = {
    "01_學生版_A4直式_個人解密單.png": "A9A69951D582F0ED0E63BFD60003173E5EC2B9AD4253B75B12A59E536C5CE5E4",
    "01_教師答案版_A4直式_個人解密單.png": "38C65F9A745788B9A778342EA480A00A52CCA2CE184ECF5E677812A2E40B3BDB",
    "02_學生版_A5直式_四色圖例卡.png": "FDC1201DE01367D51007CDDBA368992321495C22582F568BCAB898FB2A27F793",
    "02_教師答案版_A5直式_四色圖例卡.png": "D7A7285632EA5F77F23CF2F87FAEB8D019140090B6EC7C7C6DB70C253D0741E9",
    "03_學生版_A6直式_三格出口票.png": "C5C37CABCB78DF8F92FD3212E71ABA4EEB4FF51791493D1D2DD3F56787B79596",
    "03_教師答案版_A6直式_三格出口票.png": "80A083A05D8E10A6C6000583AEB72A7ED5C27E782CB166F83C378CD4A72FB2A0",
    "04_學生版_A4橫式_何時構件功能三格圖示板.png": "5026AC84B44B34B6E71907BC3D5F63753B10785D1F9E441D1CD1C7E22ED75E3A",
    "04_教師答案版_A4橫式_何時構件功能三格圖示板.png": "7DA8DD8A6E4266B08ACFE052BF3FD161439587E07C88424923BB02314784EE8D",
    "05_學生版_A4直式_8張中文資料句條.png": "3879AE365158F57E4A3AFCE7AFB64132C9013198DF8802B68896EE40FC037699",
    "05_教師答案版_A4直式_8張中文資料句條.png": "7D49E67ED53BBE3A5909C19C0D816931D43CD21F481EEEAE991363318F4BDF94",
    "06_學生版_A5直式_4張英文句型卡.png": "BE0D54C9AF28EC79FA500B32099A8C994C68E21386DBB15E50A72B916B032094",
    "06_教師答案版_A5直式_4張英文句型卡.png": "9B1C8F95708657E34F600055C0717D16FC1C64950EB65DB9A8E1D26AB3FDA2AE",
    "07_學生版_A5直式_30秒導覽順序卡.png": "016B5FCD122CF2CD7521F1E692AC838EDB2405C054396678037645A53B042762",
    "07_教師答案版_A5直式_30秒導覽順序卡.png": "A27052AC014DECE9C47C6C0578D40221649F39BDBE8B4E51D3978D7DE44F651E",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest().upper()


def directory_records(root: Path) -> list[dict]:
    return [
        {
            "relative_path": path.relative_to(root).as_posix(),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        }
        for path in sorted(p for p in root.rglob("*") if p.is_file())
    ]


def verify_pdf(path: Path, expected: dict) -> dict:
    if path.stat().st_size != expected["bytes"] or sha256(path) != expected["sha256"]:
        raise AssertionError(f"PDF bytes or SHA mismatch: {path}")
    reader = PdfReader(str(path))
    if len(reader.pages) != 7:
        raise AssertionError(f"{path.name}: expected 7 pages")
    sizes: list[list[float]] = []
    text: list[str] = []
    for page, expected_size in zip(reader.pages, EXPECTED_SIZES):
        actual = (float(page.mediabox.width), float(page.mediabox.height))
        if abs(actual[0] - expected_size[0]) > 1 or abs(actual[1] - expected_size[1]) > 1:
            raise AssertionError(f"{path.name}: page size mismatch {actual}")
        sizes.append([round(actual[0], 2), round(actual[1], 2)])
        text.append(page.extract_text() or "")
    all_text = "\n".join(text)
    if missing := [value for value in expected["text"] if value not in all_text]:
        raise AssertionError(f"{path.name}: missing searchable text {missing}")
    return {
        "file": path.name,
        "bytes": path.stat().st_size,
        "sha256": sha256(path),
        "pages": 7,
        "page_sizes_pt": sizes,
        "searchable_text_checks": expected["text"],
    }


def main() -> None:
    pdf_checks = {
        name: verify_pdf(UNIT_DIR / name, expected)
        for name, expected in EXPECTED_PDF.items()
    }

    package = UNIT_DIR / PACKAGE_NAME
    staged_package = FORMAL_STAGE / PACKAGE_NAME
    package_records = directory_records(package)
    staged_records = directory_records(staged_package)
    if package_records != staged_records:
        raise AssertionError("Formal 16 directory differs from the fully verified staged directory")
    if len(package_records) != 67:
        raise AssertionError(f"Formal 16 expected 67 files, got {len(package_records)}")
    if sum(item["bytes"] for item in package_records) != 140_869_249:
        raise AssertionError("Formal 16 total bytes mismatch")

    for filename, expected_hash in EXPECTED_PAGE_PNG_SHA.items():
        path = package / filename
        if sha256(path) != expected_hash:
            raise AssertionError(f"Page PNG SHA mismatch: {filename}")
        with Image.open(path) as image:
            dpi = image.info.get("dpi")
            if not dpi or abs(dpi[0] - 300) > 1 or abs(dpi[1] - 300) > 1:
                raise AssertionError(f"Page PNG DPI mismatch: {filename} {dpi}")

    preview_count = len(list((package / "_QA證據" / "列印預覽").glob("*.png")))
    if preview_count != 14:
        raise AssertionError(f"Expected 14 print previews, got {preview_count}")
    master_count = len(list((package / "_ImageGen採用母版").glob("*.png")))
    if master_count != 7:
        raise AssertionError(f"Expected 7 selected masters, got {master_count}")

    qa_path = UNIT_DIR / QA_NAME
    staged_qa = FORMAL_STAGE / QA_NAME
    if sha256(qa_path) != sha256(staged_qa):
        raise AssertionError("Formal 17 differs from staged QA")
    qa_text = qa_path.read_text(encoding="utf-8")
    for required in (
        "正式數位教材",
        "實體試印仍列為教師端待辦",
        "lesson2_formal_before_imagegen_20260826-201024",
        "Google Drive 二次讀回與修復",
    ):
        if required not in qa_text:
            raise AssertionError(f"Formal 17 missing {required!r}")

    if sha256(BACKUP_MANIFEST) != "CFB199ED9F945278EE9959CF2B310DE9BE580E906DF45AEC51C0F8DAE48798A6":
        raise AssertionError("Old baseline backup manifest SHA mismatch")
    temporary_files = sorted(path.name for path in UNIT_DIR.iterdir() if path.name.startswith(".__"))
    if temporary_files:
        raise AssertionError(f"Transaction temporary files remain: {temporary_files}")

    result = {
        "verified_at": "2026-08-26",
        "status": "pass",
        "pdfs": pdf_checks,
        "formal_16": {
            "directory": str(package),
            "file_count": len(package_records),
            "bytes": sum(item["bytes"] for item in package_records),
            "formal_equals_staging": True,
            "page_png_count": len(EXPECTED_PAGE_PNG_SHA),
            "selected_master_count": master_count,
            "print_preview_count": preview_count,
            "files": package_records,
        },
        "formal_17": {
            "file": str(qa_path),
            "bytes": qa_path.stat().st_size,
            "sha256": sha256(qa_path),
            "formal_equals_staging": True,
        },
        "backup": {
            "manifest": str(BACKUP_MANIFEST),
            "sha256": sha256(BACKUP_MANIFEST),
            "baseline_files": 25,
            "baseline_bytes": 15_482_842,
        },
        "transaction_temporary_files": 0,
        "physical_print": "teacher-todo",
    }
    output = STAGING / "10_正式14至17最終讀回_manifest.json"
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({key: value for key, value in result.items() if key != "formal_16"} | {
        "formal_16": {key: value for key, value in result["formal_16"].items() if key != "files"}
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
