"""把 GLB 裡內嵌的貼圖縮小成 JPEG（Colab Hunyuan3D-2 匯出的建築：2048 PNG → 512 JPEG，順便把顏色調亮一點）。

用法：python -I tools/shrink_glb_texture.py <in.glb> <out.glb> [邊長=512] [亮度=1.15]
只動 images 的內容與 bufferView 的位移，網格不變。
"""
import io
import json
import struct
import sys

from PIL import Image, ImageEnhance


def main() -> None:
    src, dst = sys.argv[1], sys.argv[2]
    size = int(sys.argv[3]) if len(sys.argv) > 3 else 512
    bright = float(sys.argv[4]) if len(sys.argv) > 4 else 1.15
    raw = open(src, "rb").read()
    magic, ver, _ = struct.unpack_from("<4sII", raw, 0)
    assert magic == b"glTF" and ver == 2
    off = 12
    js = bin_ = None
    while off < len(raw):
        ln, typ = struct.unpack_from("<I4s", raw, off)
        data = raw[off + 8: off + 8 + ln]
        if typ == b"JSON":
            js = json.loads(data.decode("utf-8"))
        elif typ == b"BIN\x00":
            bin_ = data
        off += 8 + ln
    views = js["bufferViews"]
    chunks = [bin_[v.get("byteOffset", 0): v.get("byteOffset", 0) + v["byteLength"]] for v in views]
    for img in js.get("images", []):
        if "bufferView" not in img:
            continue
        i = img["bufferView"]
        im = Image.open(io.BytesIO(chunks[i])).convert("RGB")
        im.thumbnail((size, size), Image.LANCZOS)
        im = ImageEnhance.Brightness(im).enhance(bright)
        im = ImageEnhance.Color(im).enhance(1.1)
        out = io.BytesIO()
        im.save(out, "JPEG", quality=86)
        chunks[i] = out.getvalue()
        img["mimeType"] = "image/jpeg"
    blob = bytearray()
    for v, c in zip(views, chunks):
        while len(blob) % 4:
            blob.append(0)
        v["byteOffset"] = len(blob)
        v["byteLength"] = len(c)
        v["buffer"] = 0
        blob += c
    while len(blob) % 4:
        blob.append(0)
    js["buffers"] = [{"byteLength": len(blob)}]
    jb = json.dumps(js, separators=(",", ":")).encode("utf-8")
    while len(jb) % 4:
        jb += b" "
    total = 12 + 8 + len(jb) + 8 + len(blob)
    with open(dst, "wb") as f:
        f.write(struct.pack("<4sII", b"glTF", 2, total))
        f.write(struct.pack("<I4s", len(jb), b"JSON") + jb)
        f.write(struct.pack("<I4s", len(blob), b"BIN\x00") + bytes(blob))
    print(dst, len(raw), "->", total)


if __name__ == "__main__":
    main()
