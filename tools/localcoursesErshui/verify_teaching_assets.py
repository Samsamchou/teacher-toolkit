from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parent / "在地課程4年級上學期教案"
EXPECTED = {
    "03_第11-14週_閱覽鐵道風華 教材": 6,
    "04_第15-20週_介紹五分車與認識小火車鐵道 教材": 16,
}


def main():
    failures = []
    for folder_name, expected_count in EXPECTED.items():
        folder = ROOT / folder_name
        files = sorted(folder.glob("*.png"))
        print(f"{folder_name}: deliverables={len(files)}")
        if len(files) != expected_count:
            failures.append(
                f"{folder_name}: expected {expected_count}, found {len(files)}"
            )
        for path in files:
            try:
                with Image.open(path) as image:
                    image.verify()
                with Image.open(path) as image:
                    width, height = image.size
                if width < 1000 or height < 700:
                    failures.append(f"{path.name}: unexpectedly small {width}x{height}")
                print(f"  {path.name}: {width}x{height}, {path.stat().st_size} bytes")
            except Exception as error:
                failures.append(f"{path.name}: {error}")
    if failures:
        print("FAILURES")
        for failure in failures:
            print(f"  {failure}")
        raise SystemExit(1)
    print("ALL TEACHING ASSETS PASSED")


if __name__ == "__main__":
    main()
