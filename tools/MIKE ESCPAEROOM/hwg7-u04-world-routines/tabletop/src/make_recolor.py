# Recolour the clothes of a rigged Tripo model by hue range (texture only: same mesh, rig and UVs; no Tripo points).
# python tabletop/src/make_recolor.py <src> <dst> <hue_lo> <hue_hi> <min_sat> <min_val> <r,g,b> [preview.jpg]
#   e.g. kenya_girl_pyjamas -> kenya_girl_home: orange pyjamas (hue 12-40, sat > 0.5, value > 0.55; her dark skin has value < 0.5)
#   become a teal home outfit (the white dots stay). Shading is kept (new colour * old brightness relative to the median).
import io, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image

MODELS = Path(__file__).resolve().parent.parent / "models"
SRC, DST = sys.argv[1], sys.argv[2]
H0, H1, S0, V0 = (float(v) for v in sys.argv[3:7])
NEW = np.array([float(v) for v in sys.argv[7].split(",")])
PREVIEW = sys.argv[8] if len(sys.argv) > 8 else None
MINFRAC = float(sys.argv[9]) if len(sys.argv) > 9 else 0.0      # smallest connected area that counts as cloth (fraction of the texture)

b = (MODELS / f"{SRC}.glb").read_bytes()
jl = struct.unpack("<I", b[12:16])[0]; J = json.loads(b[20:20 + jl])
bin_off = 20 + jl + 8; binl = struct.unpack("<I", b[20 + jl:24 + jl])[0]; BIN = bytes(b[bin_off:bin_off + binl])
tex = J["materials"][0]["pbrMetallicRoughness"]["baseColorTexture"]["index"]; bv_i = J["images"][J["textures"][tex]["source"]]["bufferView"]
bv = J["bufferViews"][bv_i]; o = bv.get("byteOffset", 0)
a = np.asarray(Image.open(io.BytesIO(BIN[o:o + bv["byteLength"]])).convert("RGB")).astype(np.float32) / 255.0
mx = a.max(2); mn = a.min(2); d = mx - mn + 1e-6; r, g, bl = a[..., 0], a[..., 1], a[..., 2]
h = np.where(mx == r, ((g - bl) / d) % 6, np.where(mx == g, (bl - r) / d + 2, (r - g) / d + 4)) * 60
s = d / (mx + 1e-6)
cloth = (h >= H0) & (h <= H1) & (s > S0) & (mx > V0)
# 11/23 (Kenya): warm skin highlights fall in the same hue range -> teal patches on the forehead, cheek and arm. Cloth is a few
# BIG connected areas of the texture; skin highlights are small islands. Keep only the big components (after closing the dots).
from scipy import ndimage as _nd
_closed = _nd.binary_closing(cloth, iterations=3)
_lab, _n = _nd.label(_closed)
_sizes = _nd.sum(_closed, _lab, range(1, _n + 1))
_big = [i + 1 for i, v in enumerate(_sizes) if v >= MINFRAC * cloth.size]
_before = cloth.mean()
cloth = cloth & np.isin(_lab, _big)
print("components %d, kept %d (>= %.2f%% of the texture); dropped %.2f%% of the texture as small islands" % (_n, len(_big), 100 * MINFRAC, 100 * (_before - cloth.mean())))
# 11/23 (Kenya, 2nd fix): the forehead / cheek patches survived the island filter. Protect skin by the RIG: texels of triangles
# that are skinned mostly to head, neck, forearm, hand or foot bones are never recoloured.
PROTECT = (sys.argv[10] if len(sys.argv) > 10 else "").split(",") if len(sys.argv) > 10 and sys.argv[10] else []
if PROTECT:
    from PIL import ImageDraw
    def acc(k):
        A = J["accessors"][k]; V = J["bufferViews"][A["bufferView"]]; n = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[A["type"]]
        dt = {5121: np.uint8, 5123: np.uint16, 5125: np.uint32, 5126: np.float32}[A["componentType"]]
        o_ = V.get("byteOffset", 0) + A.get("byteOffset", 0); st = V.get("byteStride", 0); sz = np.dtype(dt).itemsize * n
        if st and st != sz:
            raw = np.frombuffer(BIN, np.uint8, count=st * A["count"], offset=o_).reshape(A["count"], st)[:, :sz].copy()
            return raw.view(dt).reshape(A["count"], n)
        return np.frombuffer(BIN, dt, count=A["count"] * n, offset=o_).reshape(A["count"], n)
    names = [J["nodes"][k].get("name", "") for k in J["skins"][0]["joints"]]
    prot_j = np.array([any(t in nm for t in PROTECT) for nm in names])
    H_, W_ = cloth.shape; img = Image.new("L", (W_, H_), 0); dr = ImageDraw.Draw(img); ntri = 0
    for pr in J["meshes"][0]["primitives"]:
        at = pr["attributes"]; uv = acc(at["TEXCOORD_0"]).astype(np.float64); jo = acc(at["JOINTS_0"]).astype(np.int64); we = acc(at["WEIGHTS_0"]).astype(np.float64)
        if we.max() > 1.5: we = we / we.max()
        wp = (we * prot_j[jo]).sum(1) / np.maximum(we.sum(1), 1e-9)          # share of each vertex that belongs to protected bones
        idx = acc(pr["indices"]).reshape(-1, 3).astype(np.int64)
        sel = idx[wp[idx].mean(1) > 0.5]
        for t in sel:
            dr.polygon([(float(uv[k, 0] % 1.0) * W_, float(uv[k, 1] % 1.0) * H_) for k in t], fill=255)
        ntri += len(sel)
    skin = np.asarray(img) > 0
    skin = _nd.binary_dilation(skin, iterations=2)
    hit = (cloth & skin).mean(); cloth = cloth & ~skin
    print("protected %d triangles (%s): %.2f%% of the texture taken out of the recolour" % (ntri, "/".join(PROTECT), 100 * hit))
light = np.clip(mx / float(np.median(mx[cloth])), 0.55, 1.15)
out = a.copy(); out[cloth] = np.clip(NEW * light[cloth][:, None], 0, 1)
print("recoloured %.1f%% of the texture" % (100 * cloth.mean()))
buf = io.BytesIO(); Image.fromarray((out * 255).astype(np.uint8)).save(buf, "JPEG", quality=92); new_img = buf.getvalue()
if PREVIEW: Image.fromarray((out * 255).astype(np.uint8)).resize((1024, 1024)).save(PREVIEW, quality=85)
chunks = bytearray()
for i, v in enumerate(J["bufferViews"]):
    data = new_img if i == bv_i else BIN[v.get("byteOffset", 0):v.get("byteOffset", 0) + v["byteLength"]]
    chunks += b"\0" * ((-len(chunks)) % 4); v["byteOffset"] = len(chunks); v["byteLength"] = len(data); chunks += data
chunks += b"\0" * ((-len(chunks)) % 4); J["buffers"][0]["byteLength"] = len(chunks)
js = json.dumps(J, separators=(",", ":")).encode(); js += b" " * ((-len(js)) % 4)
glb = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(chunks)) + struct.pack("<II", len(js), 0x4E4F534A) + js + struct.pack("<II", len(chunks), 0x004E4942) + bytes(chunks)
(MODELS / f"{DST}.glb").write_bytes(glb); print("wrote", DST, len(glb))
