"""把二水 3D 闖關的地點建築（Tripo 模型 bld_*.glb）做成 Jump Island 用的「輕量地標」放到網站上，進關卡時才下載。

為什麼要轉：原檔每個 2–3.6 MB，內含 2048 px 的底色、法線、粗糙度三張貼圖；在 iPad 上直接載入會吃掉
約 40–50 MB 顯示記憶體（11/06 才因記憶體不夠當機過）。地標只是背景，所以：
  - 底色貼圖縮成最長邊 512 px、JPEG 品質 80
  - 法線、粗糙度貼圖拿掉（材質不再引用，圖片換成 4×4 小圖）
結果每棟約 0.3–0.6 MB。

用法：python -I -X utf8 tools/make_landmarks.py [地點代號 ...]   （不給就全部）
輸出：site/public/jump3d/landmarks/<地點代號>.glb
"""
import io
import json
import struct
import sys
from pathlib import Path

from PIL import Image

SRC = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 3D games\godot-ershui-quest\assets\models")
OUT = Path(r"G:\我的雲端硬碟\teacher-toolkit\tools\escape room HWG5-U01-U02\site\public\jump3d\landmarks")
# 關卡代號 → 二水 3D 闖關的建築檔（farm 沒有小行星版建築，之後另外處理）
FILES = {
    "station": "bld_station", "inn": "bld_inn", "seven": "bld_seven", "school": "bld_school",
    "teatop": "bld_teatop", "market": "bld_market", "post": "bld_post", "bookstore": "bld_bookstore",
    "pxmart": "bld_pxmart", "library": "bld_library", "park": "bld_waterpark", "lawn": "bld_lawn",
}
# 2026-11-11 iPad 進關卡頓：768 → 512 px（背景建築看不出差別，顯示記憶體約剩 45%）
MAX_PX, QUALITY = 512, 80


def tiny_jpeg() -> bytes:
    b = io.BytesIO()
    Image.new("RGB", (4, 4), (128, 128, 255)).save(b, "JPEG", quality=60)
    return b.getvalue()


def convert(src: Path, dst: Path) -> None:
    d = src.read_bytes()
    assert d[:4] == b"glTF"
    jlen = struct.unpack("<I", d[12:16])[0]
    j = json.loads(d[20:20 + jlen])
    bin_start = 20 + jlen + 8
    binchunk = d[bin_start:]
    views = j["bufferViews"]
    data = [binchunk[v.get("byteOffset", 0): v.get("byteOffset", 0) + v["byteLength"]] for v in views]
    keep = set()
    for m in j.get("materials", []):
        pbr = m.get("pbrMetallicRoughness", {})
        if "baseColorTexture" in pbr:
            keep.add(j["textures"][pbr["baseColorTexture"]["index"]]["source"])
        pbr.pop("metallicRoughnessTexture", None)
        pbr["metallicFactor"] = 0.0
        pbr["roughnessFactor"] = 0.9
        m.pop("normalTexture", None)
        m.pop("occlusionTexture", None)
    for i, img in enumerate(j.get("images", [])):
        vi = img["bufferView"]
        if i in keep:
            im = Image.open(io.BytesIO(data[vi])).convert("RGB")
            im.thumbnail((MAX_PX, MAX_PX))
            b = io.BytesIO()
            im.save(b, "JPEG", quality=QUALITY)
            data[vi] = b.getvalue()
        else:
            data[vi] = tiny_jpeg()
        img["mimeType"] = "image/jpeg"
    out = bytearray()
    for v, chunk in zip(views, data):
        while len(out) % 4:
            out += b"\0"
        v["byteOffset"] = len(out)
        v["byteLength"] = len(chunk)
        out += chunk
    while len(out) % 4:
        out += b"\0"
    j["buffers"][0]["byteLength"] = len(out)
    js = json.dumps(j, separators=(",", ":")).encode()
    while len(js) % 4:
        js += b" "
    total = 12 + 8 + len(js) + 8 + len(out)
    glb = b"glTF" + struct.pack("<II", 2, total) + struct.pack("<I", len(js)) + b"JSON" + js
    glb += struct.pack("<I", len(out)) + b"BIN\0" + bytes(out)
    dst.parent.mkdir(parents=True, exist_ok=True)
    dst.write_bytes(glb)
    print(f"{dst.name}: {src.stat().st_size / 1e6:.2f} MB -> {len(glb) / 1e6:.2f} MB")


def main() -> None:
    ids = sys.argv[1:] or list(FILES)
    for i in ids:
        convert(SRC / f"{FILES[i]}.glb", OUT / f"{i}.glb")


if __name__ == "__main__":
    main()
