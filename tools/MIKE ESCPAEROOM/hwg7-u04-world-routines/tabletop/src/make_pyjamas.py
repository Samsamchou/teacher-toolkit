# Make a pyjama version of a rigged Tripo model by recolouring its base-colour texture (no new Tripo model, no points).
# python tabletop/src/make_pyjamas.py taiwan_girl taiwan_girl_pyjamas [preview.jpg]
# The school uniform is yellow + green (and a small red/blue badge): those pixels become soft pink pyjama cloth with white dots;
# skin (orange, lower saturation), hair (brown), eyes, mouth and the white shoes/socks are left alone.
# Rebuilds the GLB: same JSON, same mesh/skin/animation data, only the base-colour image is replaced (buffer views re-packed).
import io, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image

MODELS = Path(__file__).resolve().parent.parent / "models"
SRC, DST = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None

b = (MODELS / f"{SRC}.glb").read_bytes()
jl = struct.unpack("<I", b[12:16])[0]
J = json.loads(b[20:20 + jl])
bin_off = 20 + jl + 8
binl = struct.unpack("<I", b[20 + jl:24 + jl])[0]
BIN = bytearray(b[bin_off:bin_off + binl])

tex = J["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
img_i = J["textures"][tex]["source"]
bv_i = J["images"][img_i]["bufferView"]
bv = J["bufferViews"][bv_i]
o = bv.get("byteOffset", 0)
im = Image.open(io.BytesIO(bytes(BIN[o:o + bv["byteLength"]]))).convert("RGB")
a = np.asarray(im).astype(np.float32) / 255.0

# hue / saturation / value
mx = a.max(2); mn = a.min(2); d = mx - mn + 1e-6
r, g, bl = a[..., 0], a[..., 1], a[..., 2]
h = np.where(mx == r, ((g - bl) / d) % 6, np.where(mx == g, (bl - r) / d + 2, (r - g) / d + 4)) * 60
s = d / (mx + 1e-6)
yellow = (h > 36) & (h < 72) & (s > 0.45) & (mx > 0.40)
green = (h >= 72) & (h < 180) & (s > 0.25) & (mx > 0.05)   # check 1: dark / yellow-green seams left olive stains on the sleeves
badge = ((h < 12) | (h > 340) | ((h > 190) & (h < 260))) & (s > 0.55) & (mx > 0.35)
cloth = yellow | green | badge

# keep the cloth shading: new colour * the old brightness (relative to its own average)
light = np.ones_like(mx)
for part in (yellow, green, badge):            # each colour keeps its own shading around 1.0 (yellow is much brighter than green)
    if part.any(): light[part] = np.clip(mx[part] / float(np.median(mx[part])), 0.55, 1.12)
pink = np.array([0.96, 0.70, 0.78]); pink_dark = np.array([0.93, 0.62, 0.72])
out = a.copy()
base = np.where(green[..., None], pink_dark, pink)
out[cloth] = np.clip(base[cloth] * light[cloth][:, None], 0, 1)
out[cloth & ~(yellow | green)] = np.clip(pink * light[cloth & ~(yellow | green)][:, None], 0, 1)
H, W = mx.shape
yy, xx = np.mgrid[0:H, 0:W]
step = max(8, W // 64)
dots = (((xx + (yy // step) % 2 * step // 2) % step - step / 2) ** 2 + ((yy % step) - step / 2) ** 2) < (step * 0.16) ** 2
out[cloth & dots] = np.clip(np.array([1.0, 0.97, 0.98]) * light[cloth & dots][:, None], 0, 1)
print("cloth pixels %.1f%% (yellow %.1f, green %.1f, badge %.2f)" % (100 * cloth.mean(), 100 * yellow.mean(), 100 * green.mean(), 100 * badge.mean()))

buf = io.BytesIO(); Image.fromarray((out * 255).astype(np.uint8)).save(buf, "JPEG", quality=92)
new_img = buf.getvalue()
if PREVIEW: Image.fromarray((out * 255).astype(np.uint8)).resize((1024, 1024)).save(PREVIEW, quality=85)

# re-pack every buffer view (4-byte aligned) with the new image in place of the old one
chunks, pos = bytearray(), 0
for i, v in enumerate(J["bufferViews"]):
    data = new_img if i == bv_i else bytes(BIN[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]])
    pad = (-len(chunks)) % 4; chunks += b"\0" * pad
    v["byteOffset"] = len(chunks); v["byteLength"] = len(data); chunks += data
chunks += b"\0" * ((-len(chunks)) % 4)
J["buffers"][0]["byteLength"] = len(chunks)
js = json.dumps(J, separators=(",", ":")).encode(); js += b" " * ((-len(js)) % 4)
glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(chunks))
glb += struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(chunks), 0x004E4942) + bytes(chunks)
(MODELS / f"{DST}.glb").write_bytes(glb)
print("wrote", MODELS / f"{DST}.glb", len(glb))
