# Paint the Formosan black bear's white V (moon) onto the chest IN THE TEXTURE (11/25: a decal box on a bone was not visible).
# python tabletop/src/paint_chest_v.py <src> <dst> [preview.jpg]
# Works in the model's own (glTF, Y-up) rest coordinates: forward = the direction the legs push from (the walk clip measured -x),
# so the chest is the front-most part of the body below the head. For each triangle there, the UV triangle is rasterised and every
# texel whose 3D point falls inside a V band (two arms rising from the breastbone out to the shoulders) is painted cream white.
# Mesh, rig, UVs and animation are untouched. ASCII only.
import io, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image

MODELS = Path(__file__).resolve().parent.parent / "models"
SRC, DST = sys.argv[1], sys.argv[2]
PREVIEW = sys.argv[3] if len(sys.argv) > 3 else None
FWD = np.array([-1.0, 0.0, 0.0])          # model forward in glTF coords (measured from the walk clip: forward_local (-1, 0))
UP = np.array([0.0, 1.0, 0.0])            # glTF is Y-up
COL = np.array([0.93, 0.90, 0.82])

b = (MODELS / f"{SRC}.glb").read_bytes()
jl = struct.unpack("<I", b[12:16])[0]; J = json.loads(b[20:20 + jl])
bin_off = 20 + jl + 8; binl = struct.unpack("<I", b[20 + jl:24 + jl])[0]; BIN = bytes(b[bin_off:bin_off + binl])


def acc(k):
    A = J["accessors"][k]; V = J["bufferViews"][A["bufferView"]]; n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[A["type"]]
    dt = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[A["componentType"]]
    o = V.get("byteOffset", 0) + A.get("byteOffset", 0); st = V.get("byteStride", 0); sz = np.dtype(dt).itemsize * n
    if st and st != sz:
        raw = np.frombuffer(BIN, np.uint8, count=st * A["count"], offset=o).reshape(A["count"], st)[:, :sz].copy()
        return raw.view(dt).reshape(A["count"], n)
    return np.frombuffer(BIN, dt, count=A["count"] * n, offset=o).reshape(A["count"], n)


tex = J["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]
bv_i = J["images"][J["textures"][tex]["source"]]["bufferView"]; bv = J["bufferViews"][bv_i]; o = bv.get("byteOffset", 0)
img = np.asarray(Image.open(io.BytesIO(BIN[o:o + bv["byteLength"]])).convert("RGB")).astype(np.float32) / 255.0
H, W = img.shape[:2]
pr = J["meshes"][0]["primitives"][0]
P = acc(pr["attributes"]["POSITION"]).astype(np.float64); UV = acc(pr["attributes"]["TEXCOORD_0"]).astype(np.float64)
I = acc(pr["indices"]).reshape(-1, 3).astype(np.int64)
side_ax = np.cross(FWD, UP)
f = P @ FWD; u = P @ UP; s = P @ side_ax
hmin, hmax = u.min(), u.max(); Hh = hmax - hmin
fmax = f.max(); L = fmax - f.min()
# chest window: the front 30 % of the body length, 40-75 % of the height, near the middle line
# GUESS numbers (check the preview): the head sticks out further forward, so take the body front just behind the head
chest_f = np.percentile(f[(u > hmin + 0.40 * Hh) & (u < hmin + 0.62 * Hh) & (np.abs(s) < 0.18 * L)], 97)
c_u = hmin + 0.52 * Hh                     # the point of the V (breastbone)
ARM = 0.16 * Hh; WID = 0.040 * Hh          # arm length and band width
sel = []
for t in I:
    q = P[t]; cf = q @ FWD; cu = q @ UP; cs = q @ side_ax
    if cf.mean() > chest_f - 0.10 * L and np.abs(cu.mean() - (c_u + ARM * 0.5)) < 0.6 * ARM + WID and np.abs(cs).mean() < 0.9 * ARM:
        sel.append(t)
painted = 0
for t in sel:
    q = P[t]; uv = UV[t] * [W, H]
    x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, W - 1), min(y1, H - 1)
    if x1 < x0 or y1 < y0: continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    A_, B_, C_ = uv
    d = (B_[1] - C_[1]) * (A_[0] - C_[0]) + (C_[0] - B_[0]) * (A_[1] - C_[1])
    if abs(d) < 1e-12: continue
    w0 = ((B_[1] - C_[1]) * (xs - C_[0]) + (C_[0] - B_[0]) * (ys - C_[1])) / d
    w1 = ((C_[1] - A_[1]) * (xs - C_[0]) + (A_[0] - C_[0]) * (ys - C_[1])) / d
    w2 = 1 - w0 - w1
    inside = (w0 >= -0.01) & (w1 >= -0.01) & (w2 >= -0.01)
    pts = w0[..., None] * q[0] + w1[..., None] * q[1] + w2[..., None] * q[2]
    hu = pts @ UP - c_u; hs = np.abs(pts @ side_ax)
    # V: from the breastbone (hs 0, hu 0) up and out to (hs ARM*0.8, hu ARM)
    dist = np.abs(hu - hs * 1.25) / np.sqrt(1 + 1.25 ** 2)
    band = inside & (dist < WID / 2) & (hu > -WID * 0.3) & (hu < ARM) & ((pts @ FWD) > chest_f - 0.12 * L)
    ys_i = (ys[band] - 0.5).astype(int); xs_i = (xs[band] - 0.5).astype(int)
    shade = img[ys_i, xs_i].mean(1, keepdims=True)
    img[ys_i, xs_i] = np.clip(COL * (0.75 + 2.5 * shade), 0, 1)     # keep a little of the fur shading
    painted += int(band.sum())
print("chest_f %.4f c_u %.4f height %.4f length %.4f triangles %d painted texels %d" % (chest_f, c_u, Hh, L, len(sel), painted))
buf = io.BytesIO(); Image.fromarray((img * 255).astype(np.uint8)).save(buf, "JPEG", quality=92); new_img = buf.getvalue()
if PREVIEW: Image.fromarray((img * 255).astype(np.uint8)).resize((1024, 1024)).save(PREVIEW, quality=85)
chunks = bytearray()
for i, v in enumerate(J["bufferViews"]):
    data = new_img if i == bv_i else BIN[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]]
    chunks += b"\0" * ((-len(chunks)) % 4); v["byteOffset"] = len(chunks); v["byteLength"] = len(data); chunks += data
chunks += b"\0" * ((-len(chunks)) % 4); J["buffers"][0]["byteLength"] = len(chunks)
js = json.dumps(J, separators=(",", ":")).encode(); js += b" " * ((-len(js)) % 4)
glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(chunks)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(chunks), 0x004E4942) + bytes(chunks)
(MODELS / f"{DST}.glb").write_bytes(glb); print("wrote", DST, len(glb))
