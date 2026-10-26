extends Node3D
## 二水小行星的世界：路網、建築輪廓、地標位置都來自 OpenStreetMap（© OpenStreetMap contributors, ODbL），
## 由 tools/build_osm_map.py 轉成 data/map.json（平面公尺，x 往東、z 往南，已乘縮小比例 K）。
## 所有東西先在平面上組好，再用方位等距投影把每個頂點彎到半徑 R 的球面上（bend）；
## 找路、走路都在平面上算，只有畫面是彎的——做法參考基隆小行星（three.js 球面街景），改用 Godot 實作。
## 街屋外觀依 3D planet/資料/research-ershui-streetscape-20261025.md：
## A 日治紅磚洋樓、B 洗石子公館、C 磁磚透天、D 戰後低矮老店屋、E 日式木造宿舍、T 鐵皮屋。

const R := 280.0                # 星球半徑（遊戲公尺）；市區在北極附近，東南街區在赤道附近
const WALK_W := 1.0
const OUTLINE := 0.05           # 描邊粗細
const INK := Color(0.16, 0.13, 0.15)
const FLIP := true              # 三角形繞向
const FH := 1.8                 # 一層樓高（真實約 3.2 m × K）
const TILE_COLS := ["#e8d9b5", "#e9c9c1", "#b9c4b0", "#b5654a", "#edede6", "#d9cfb8", "#c9d3d6", "#f0e6cf"]
const TIN_COLS := ["#5c8dae", "#c9c9c9", "#b8564a", "#d98aa0"]
const BRICK := "#a84a32"
const STONE := "#e6dcc8"

var nodes := {}                 # id -> Vector2
var edges: Array = []           # [[a, b, 寬, 路名], ...]
var places := {}                # id -> Dictionary
var place_list: Array = []
var font: Font
var font_bold: Font
var rng := RandomNumberGenerator.new()
var mat_toon: StandardMaterial3D
var mat_ink: StandardMaterial3D
var outline_shader: Shader
var outline_cache := {}
var model_cache := {}
var train: Node3D
var train_t := 0.0
var clouds: Node3D
var rail_o := Vector2.ZERO
var rail_d := Vector2(1, 0)
var map: Dictionary

# ---------- 投影 ----------
func bend(x: float, h: float, z: float) -> Vector3:
	var r := sqrt(x * x + z * z)
	if r < 0.0001:
		return Vector3(0, R + h, 0)
	var th := r / R
	var s := sin(th)
	return Vector3(s * x / r, cos(th), s * z / r) * (R + h)

func bend2(p: Vector2, h := 0.0) -> Vector3:
	return bend(p.x, h, p.y)

## 平面上一點＋平面朝向 → 球面上的座標系（模型正面 +Z 朝 fwd）
func frame_at(p: Vector2, fwd: Vector2, h := 0.0) -> Transform3D:
	var o := bend2(p, h)
	var up := o.normalized()
	if fwd.length() < 0.0001:
		fwd = Vector2(0, 1)
	var f := bend2(p + fwd.normalized() * 0.4, h) - o
	f = (f - up * f.dot(up)).normalized()
	var right := up.cross(f)
	return Transform3D(Basis(right, up, f), o)

func v2(a) -> Vector2:
	return Vector2(float(a[0]), float(a[1]))

# ---------- 建構 ----------
func build(data: Dictionary, f_reg: Font, f_bold: Font) -> void:
	map = data
	font = f_reg
	font_bold = f_bold
	rng.seed = 20261025
	for k in data["nodes"]:
		nodes[k] = v2(data["nodes"][k])
	edges = data["edges"]
	for P in data["places"]:
		var d: Dictionary = P.duplicate(true)
		d["pos2"] = v2(P["pos"])
		d["door2"] = v2(P["door"])
		places[d["id"]] = d
		place_list.append(d)
	if data.get("rail_line") != null:
		rail_o = v2(data["rail_line"]["o"])
		rail_d = v2(data["rail_line"]["d"]).normalized()
	_materials()
	_build_sky()
	_build_ground()
	_build_green_and_water()
	_build_roads()
	_build_rail()
	_build_places()
	_build_buildings()
	_build_street_props()
	_build_countryside()
	_build_clouds()
	_build_road_groups()

func _materials() -> void:
	mat_toon = StandardMaterial3D.new()
	mat_toon.vertex_color_use_as_albedo = true
	mat_toon.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	mat_toon.specular_mode = BaseMaterial3D.SPECULAR_DISABLED
	mat_toon.roughness = 1.0
	mat_ink = StandardMaterial3D.new()
	mat_ink.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat_ink.albedo_color = INK
	mat_ink.cull_mode = BaseMaterial3D.CULL_FRONT
	mat_fade = mat_toon.duplicate()
	mat_fade.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat_fade.albedo_color = Color(1, 1, 1, 0.18)
	outline_shader = Shader.new()
	outline_shader.code = """
shader_type spatial;
render_mode unshaded, cull_front;
uniform float width = 0.03;
uniform vec4 ink : source_color = vec4(0.16, 0.13, 0.15, 1.0);
void vertex() { VERTEX += NORMAL * width; }
void fragment() { ALBEDO = ink.rgb; }
"""

var sky_mat: ShaderMaterial
var space_now := -1.0
func set_space(v: float) -> void:
	if absf(v - space_now) < 0.002:
		return
	space_now = v
	sky_mat.set_shader_parameter("space", v)

const SKY_SHADER := """
shader_type sky;
uniform float space = 0.0;
void sky() {
	vec3 d = normalize(EYEDIR);
	vec3 top = vec3(0.4, 0.66, 0.92);
	vec3 hor = vec3(0.84, 0.92, 0.98);
	vec3 bot = vec3(0.6, 0.75, 0.9);
	vec3 day = d.y >= 0.0 ? mix(hor, top, pow(clamp(d.y, 0.0, 1.0), 0.6)) : mix(hor, bot, pow(clamp(-d.y, 0.0, 1.0), 0.6));
	vec3 g = floor(d * 260.0);
	float h = fract(sin(dot(g, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
	float star = step(0.9972, h) * (0.6 + 0.4 * fract(h * 97.0));
	vec3 sp = mix(vec3(0.02, 0.03, 0.1), vec3(0.08, 0.05, 0.2), d.x * 0.5 + 0.5) + vec3(star);
	COLOR = mix(day, sp, space);
}
"""

func _build_sky() -> void:
	var we := WorldEnvironment.new()
	var e := Environment.new()
	var sky := Sky.new()
	# 天空：白天藍天，首頁太空段換成星空（space 0→1）
	var sh := Shader.new()
	sh.code = SKY_SHADER
	sky_mat = ShaderMaterial.new()
	sky_mat.shader = sh
	sky.sky_material = sky_mat
	e.background_mode = Environment.BG_SKY
	e.sky = sky
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color(0.75, 0.78, 0.85)
	e.ambient_light_energy = 0.55
	e.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	e.adjustment_enabled = true
	e.adjustment_saturation = 1.1
	we.environment = e
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.light_color = Color(1.0, 0.96, 0.88)
	sun.light_energy = 1.0
	add_child(sun)
	sun.look_at_from_position(Vector3(40, 90, 70), Vector3.ZERO, Vector3.UP)

# ---------- 網格小工具：平面座標組好，再逐點彎到球面 ----------
class Builder:
	var st := SurfaceTool.new()
	var ink := SurfaceTool.new()
	var w: Node3D
	var n := 0
	func _init(world: Node3D) -> void:
		w = world
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		ink.begin(Mesh.PRIMITIVE_TRIANGLES)
	func tri(t: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, col: Color) -> void:
		t.set_color(col)
		if w.FLIP:
			t.add_vertex(a); t.add_vertex(c); t.add_vertex(b)
		else:
			t.add_vertex(a); t.add_vertex(b); t.add_vertex(c)
		n += 1
	## 四邊形（a→b→c→d 從外面看是逆時針）
	func quad(t: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, col: Color) -> void:
		tri(t, a, c, b, col)
		tri(t, a, d, c, col)
	## 平面上一個長方體：中心 c、yaw（朝 +Z 為 0）、大小 (寬, 高, 深)、底高 base
	func box(c: Vector2, yaw: float, size: Vector3, base: float, col: Color, outline := true) -> void:
		_box_into(st, c, yaw, size, base, col)
		if outline:
			var o: float = w.OUTLINE
			_box_into(ink, c, yaw, size + Vector3(o * 2, o * 2, o * 2), base - o, w.INK)
	func _box_into(t: SurfaceTool, c: Vector2, yaw: float, size: Vector3, base: float, col: Color) -> void:
		var hx := size.x / 2.0
		var hz := size.z / 2.0
		var cs := cos(yaw)
		var sn := sin(yaw)
		var p := []
		for k in 8:
			var lx := hx if (k & 1) else -hx
			var lz := hz if (k & 2) else -hz
			var ly := base + (size.y if (k & 4) else 0.0)
			p.append(w.bend(c.x + lx * cs + lz * sn, ly, c.y - lx * sn + lz * cs))
		var side := col.darkened(0.04)
		quad(t, p[4], p[5], p[7], p[6], col.lightened(0.08))
		quad(t, p[0], p[2], p[3], p[1], col.darkened(0.3))
		quad(t, p[2], p[6], p[7], p[3], col)
		quad(t, p[0], p[1], p[5], p[4], side)
		quad(t, p[1], p[3], p[7], p[5], side)
		quad(t, p[0], p[4], p[6], p[2], side)
	## 八角柱：底面中心 c、半徑 r、高 h、底高 base
	func cyl(c: Vector2, r: float, h: float, base: float, col: Color, outline := true) -> void:
		_cyl_into(st, c, r, h, base, col)
		if outline:
			var o: float = w.OUTLINE
			_cyl_into(ink, c, r + o, h + o * 2, base - o, w.INK)
	func _cyl_into(t: SurfaceTool, c: Vector2, r: float, h: float, base: float, col: Color) -> void:
		for i in 8:
			var a0 := TAU * i / 8.0
			var a1 := TAU * (i + 1) / 8.0
			var p0 := c + Vector2(cos(a0), sin(a0)) * r
			var p1 := c + Vector2(cos(a1), sin(a1)) * r
			quad(t, w.bend2(p0, base), w.bend2(p0, base + h), w.bend2(p1, base + h), w.bend2(p1, base), col.darkened(0.06 * (i % 2)))
			tri(t, w.bend2(c, base + h), w.bend2(p0, base + h), w.bend2(p1, base + h), col.lightened(0.08))
	## 兩坡屋頂（三角柱）：屋脊沿寬度方向，深 d、屋頂高 rh、簷口高 base
	func prism(c: Vector2, yaw: float, wd: float, rh: float, d: float, base: float, col: Color) -> void:
		_prism_into(st, c, yaw, wd, rh, d, base, col)
		var o: float = w.OUTLINE
		_prism_into(ink, c, yaw, wd + o * 2, rh + o, d + o * 2, base - o, w.INK)
	func _prism_into(t: SurfaceTool, c: Vector2, yaw: float, wd: float, rh: float, d: float, base: float, col: Color) -> void:
		var cs := cos(yaw)
		var sn := sin(yaw)
		var P := func(lx: float, ly: float, lz: float) -> Vector3:
			return w.bend(c.x + lx * cs + lz * sn, ly, c.y - lx * sn + lz * cs)
		var hx := wd / 2.0
		var hz := d / 2.0
		var top := base + rh
		quad(t, P.call(-hx, base, hz), P.call(-hx, top, 0.0), P.call(hx, top, 0.0), P.call(hx, base, hz), col)
		quad(t, P.call(-hx, base, -hz), P.call(hx, base, -hz), P.call(hx, top, 0.0), P.call(-hx, top, 0.0), col.darkened(0.1))
		quad(t, P.call(hx, base, -hz), P.call(hx, base, hz), P.call(hx, top, 0.0), P.call(hx, top, 0.0), col.darkened(0.2))
		quad(t, P.call(-hx, base, -hz), P.call(-hx, top, 0.0), P.call(-hx, top, 0.0), P.call(-hx, base, hz), col.darkened(0.2))
	## 多邊形量體（OSM 建築輪廓）：poly 已是「外側在右手邊」的繞向；高 h、底高 base
	func extrude(poly: PackedVector2Array, h: float, base: float, col: Color, roof: Color, outline := true) -> void:
		_extrude_into(st, poly, h, base, col, roof)
		if outline:
			_extrude_into(ink, _offset(poly, w.OUTLINE), h + w.OUTLINE * 2, base - w.OUTLINE, w.INK, w.INK)
	func _extrude_into(t: SurfaceTool, poly: PackedVector2Array, h: float, base: float, col: Color, roof: Color) -> void:
		var m := poly.size()
		for i in m:
			var a := poly[i]
			var b := poly[(i + 1) % m]
			var shade := col.darkened(0.1 * absf((b - a).normalized().x))
			quad(t, w.bend2(a, base), w.bend2(a, base + h), w.bend2(b, base + h), w.bend2(b, base), shade)
		var idx := Geometry2D.triangulate_polygon(poly)
		for k in range(0, idx.size(), 3):
			tri(t, w.bend2(poly[idx[k]], base + h), w.bend2(poly[idx[k + 2]], base + h), w.bend2(poly[idx[k + 1]], base + h), roof)
	func _offset(poly: PackedVector2Array, o: float) -> PackedVector2Array:
		var res := Geometry2D.offset_polygon(poly, o, Geometry2D.JOIN_MITER)
		if res.is_empty():
			return poly
		var q: PackedVector2Array = res[0]
		if w.signed_area(q) * w.signed_area(poly) < 0.0:
			q.reverse()
		return q
	## 貼地的帶狀面（道路、人行道）
	func strip(a: Vector2, b: Vector2, wd: float, h: float, col: Color) -> void:
		var d := b - a
		var L := d.length()
		if L < 0.01:
			return
		var dir := d / L
		var side := Vector2(-dir.y, dir.x) * (wd / 2.0)
		var segs := maxi(1, int(ceil(L / 1.5)))
		for i in segs:
			var p0 := a + dir * (L * i / segs)
			var p1 := a + dir * (L * (i + 1) / segs)
			quad(st, w.bend2(p0 - side, h), w.bend2(p1 - side, h), w.bend2(p1 + side, h), w.bend2(p0 + side, h), col)
	func disc(c: Vector2, r: float, h: float, col: Color, segs := 14) -> void:
		var o: Vector3 = w.bend2(c, h)
		for i in segs:
			var a0 := TAU * i / segs
			var a1 := TAU * (i + 1) / segs
			tri(st, o, w.bend2(c + Vector2(cos(a1), sin(a1)) * r, h), w.bend2(c + Vector2(cos(a0), sin(a0)) * r, h), col)
	## 平面多邊形貼地（綠地）
	func patch(poly: PackedVector2Array, h: float, col: Color) -> void:
		var idx := Geometry2D.triangulate_polygon(poly)
		for k in range(0, idx.size(), 3):
			tri(st, w.bend2(poly[idx[k]], h), w.bend2(poly[idx[k + 2]], h), w.bend2(poly[idx[k + 1]], h), col)
	## 低面數球（樹冠、雲）
	func blob(c: Vector2, h: float, r: float, col: Color, squash := 1.0, outline := true) -> void:
		_blob_into(st, c, h, r, col, squash)
		if outline:
			_blob_into(ink, c, h, r + w.OUTLINE * 1.4, w.INK, squash)
	func _blob_into(t: SurfaceTool, c: Vector2, h: float, r: float, col: Color, squash: float) -> void:
		var rings := 5
		var segs := 8
		var pts := []
		for i in rings + 1:
			var phi := PI * i / rings
			var row := []
			for j in segs:
				var th := TAU * j / segs
				row.append(w.bend(c.x + sin(phi) * cos(th) * r, h + cos(phi) * r * squash, c.y + sin(phi) * sin(th) * r))
			pts.append(row)
		for i in rings:
			var shade := col.darkened(0.12 * float(i) / rings)
			for j in segs:
				var j2 := (j + 1) % segs
				quad(t, pts[i + 1][j], pts[i + 1][j2], pts[i][j2], pts[i][j], shade)
	func commit(parent: Node3D, mname := "Mesh") -> void:
		if n == 0:
			return
		st.generate_normals()
		var mi := MeshInstance3D.new()
		mi.name = mname
		mi.mesh = st.commit()
		mi.material_override = w.mat_toon
		parent.add_child(mi)
		ink.generate_normals()
		var m2 := ink.commit()
		if m2.get_surface_count() > 0:
			var mo := MeshInstance3D.new()
			mo.name = mname + "Ink"
			mo.mesh = m2
			mo.material_override = w.mat_ink
			parent.add_child(mo)

func signed_area(p: PackedVector2Array) -> float:
	var s := 0.0
	for i in p.size():
		var a := p[i]
		var b := p[(i + 1) % p.size()]
		s += a.x * b.y - b.x * a.y
	return s * 0.5

## OSM 輪廓 → 外側在右手邊的繞向（和 Builder.extrude 的牆面方向一致）
func norm_poly(arr: Array) -> PackedVector2Array:
	var p := PackedVector2Array()
	for q in arr:
		p.append(v2(q))
	if signed_area(p) > 0.0:
		p.reverse()
	return p

# ---------- 地面、綠地、水圳 ----------
func _build_ground() -> void:
	var mi := MeshInstance3D.new()
	var sp := SphereMesh.new()
	sp.radius = R
	sp.height = R * 2.0
	sp.radial_segments = 160
	sp.rings = 80
	mi.mesh = sp
	var sh := Shader.new()
	sh.code = """
shader_type spatial;
render_mode diffuse_toon, specular_disabled;
varying vec3 wp;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
float n2(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void vertex(){ wp = VERTEX; }
void fragment(){
  vec3 d = normalize(wp);
  float lat = d.y;
  vec3 town = vec3(0.80, 0.84, 0.66);
  vec3 grass = vec3(0.55, 0.74, 0.42);
  vec3 paddy = vec3(0.47, 0.70, 0.36);
  float k = n2(d.xz * 40.0 + d.y * 9.0);
  vec3 c = mix(grass, town, smoothstep(0.25, 0.45, lat));
  c = mix(c, paddy * (0.92 + 0.16 * k), smoothstep(0.0, -0.2, lat));
  c *= 0.95 + 0.08 * n2(d.xz * 140.0);
  ALBEDO = c;
}
"""
	var m := ShaderMaterial.new()
	m.shader = sh
	mi.material_override = m
	mi.name = "Ground"
	add_child(mi)

func _build_green_and_water() -> void:
	var b := Builder.new(self)
	for g in map.get("green", []):
		var poly := norm_poly(g["poly"])
		if poly.size() >= 3:
			b.patch(poly, 0.03, Color(0.5, 0.74, 0.4) if g["kind"] != "farmland" else Color(0.58, 0.76, 0.4))
	for wv in map.get("water", []):
		var pts: Array = wv["pts"]
		for i in range(pts.size() - 1):
			b.strip(v2(pts[i]), v2(pts[i + 1]), float(wv["w"]) + 0.8, 0.035, Color(0.62, 0.62, 0.6))   # 水泥渠岸
			b.strip(v2(pts[i]), v2(pts[i + 1]), float(wv["w"]), 0.05, Color(0.45, 0.68, 0.84))         # 圳水
	b.commit(self, "GreenWater")

# ---------- 道路 ----------
func _build_roads() -> void:
	var b := Builder.new(self)
	var asphalt := Color(0.42, 0.43, 0.47)
	var walk := Color(0.86, 0.8, 0.72)
	var deg := {}
	for e in edges:
		deg[e[0]] = deg.get(e[0], 0) + 1
		deg[e[1]] = deg.get(e[1], 0) + 1
	var nw := {}    # 每個路口最寬的路
	for e in edges:
		var wd: float = e[2]
		nw[e[0]] = maxf(nw.get(e[0], 0.0), wd)
		nw[e[1]] = maxf(nw.get(e[1], 0.0), wd)
	for e in edges:
		var a: Vector2 = nodes[e[0]]
		var c: Vector2 = nodes[e[1]]
		var wd: float = e[2]
		var L := a.distance_to(c)
		if L < 0.05:
			continue
		var dir := (c - a) / L
		var side := Vector2(-dir.y, dir.x)
		b.strip(a, c, wd + WALK_W * 2.0, 0.05, walk)
		b.strip(a, c, wd, 0.1, asphalt)
		if wd >= 4.2:
			var t := 2.5
			while t < L - 2.5:
				b.strip(a + dir * t, a + dir * minf(t + 1.2, L - 2.5), 0.14, 0.12, Color(0.97, 0.95, 0.86))
				t += 2.8
			for sg in [-1.0, 1.0]:
				b.strip(a + side * sg * (wd / 2.0 - 0.12), c + side * sg * (wd / 2.0 - 0.12), 0.1, 0.115, Color(0.82, 0.25, 0.22))
	for k in nodes:
		var p: Vector2 = nodes[k]
		var wmax: float = nw.get(k, 3.0)
		b.disc(p, wmax / 2.0 + WALK_W, 0.06, walk)
		b.disc(p, wmax / 2.0 + 0.1, 0.105, asphalt)
		if deg.get(k, 0) >= 3 and wmax >= 4.2:
			for e in edges:
				var other := ""
				if e[0] == k: other = e[1]
				elif e[1] == k: other = e[0]
				if other == "" or float(e[2]) < 4.0:
					continue
				var dir: Vector2 = (nodes[other] - p).normalized()
				if p.distance_to(nodes[other]) < 6.0:
					continue
				var side := Vector2(-dir.y, dir.x)
				var c0 := p + dir * (wmax / 2.0 + 1.0)
				for i in range(-2, 3):
					var q := c0 + side * (i * 0.7)
					b.strip(q - dir * 0.5, q + dir * 0.5, 0.38, 0.125, Color(0.97, 0.97, 0.95))
	b.commit(self, "Roads")

# ---------- 鐵路（OSM 軌道＋沿著大致方向繞星球一圈，讓集集線小火車跑） ----------
func _build_rail() -> void:
	var b := Builder.new(self)
	var a := rail_o - rail_d * 850.0
	var c := rail_o + rail_d * 850.0
	b.strip(a, c, 3.2, 0.07, Color(0.62, 0.58, 0.53))
	var L := a.distance_to(c)
	var x := 0.0
	var yaw := atan2(rail_d.x, rail_d.y)
	while x < L:
		b.box(a + rail_d * x, yaw + PI / 2.0, Vector3(2.4, 0.14, 0.45), 0.07, Color(0.45, 0.32, 0.24), false)
		x += 1.2
	var side := Vector2(-rail_d.y, rail_d.x)
	for off in [-0.6, 0.6]:
		b.strip(a + side * off, c + side * off, 0.12, 0.26, Color(0.7, 0.7, 0.74))
	# 站內其他股道（OSM）
	for r in map.get("rails", []):
		for i in range(r.size() - 1):
			b.strip(v2(r[i]), v2(r[i + 1]), 2.6, 0.06, Color(0.6, 0.57, 0.52))
			for off in [-0.55, 0.55]:
				var d := (v2(r[i + 1]) - v2(r[i])).normalized()
				var s2 := Vector2(-d.y, d.x)
				b.strip(v2(r[i]) + s2 * off, v2(r[i + 1]) + s2 * off, 0.1, 0.22, Color(0.7, 0.7, 0.74))
	b.commit(self, "Rail")
	train = Node3D.new()
	train.name = "Train"
	add_child(train)

# ---------- 地點（Tripo 模型、OSM 輪廓特別外觀、外圈） ----------
func _has_model(mname: String) -> bool:
	return mname != "" and ResourceLoader.exists("res://assets/models/%s.glb" % mname)

func _collect_aabb(node: Node, acc: Array, xf: Transform3D) -> void:
	var t := xf
	if node is Node3D:
		t = xf * (node as Node3D).transform
	if node is MeshInstance3D:
		acc.append(t * (node as MeshInstance3D).get_aabb())
	for c in node.get_children():
		_collect_aabb(c, acc, t)

func _apply_outline(node: Node, scale_f: float, thin := 1.0) -> void:
	if node is MeshInstance3D:
		var key := "%.2f_%.2f" % [scale_f, thin]
		if not outline_cache.has(key):
			var m := ShaderMaterial.new()
			m.shader = outline_shader
			m.set_shader_parameter("width", OUTLINE * 0.8 * thin / maxf(scale_f, 0.001))
			outline_cache[key] = m
		(node as MeshInstance3D).material_overlay = outline_cache[key]
	for c in node.get_children():
		_apply_outline(c, scale_f, thin)

## 載入 GLB：置中、貼地、等比縮放到最大邊長 max_dim
func fit_model(mname: String, max_dim: float, outline := true, thin := 1.0) -> Node3D:
	var holder := Node3D.new()
	var scene: PackedScene = load("res://assets/models/%s.glb" % mname)
	var inst: Node3D = scene.instantiate()
	if not model_cache.has(mname):
		var boxes := []
		_collect_aabb(inst, boxes, Transform3D.IDENTITY)
		var bb: AABB = boxes[0]
		for i in range(1, boxes.size()):
			bb = bb.merge(boxes[i])
		model_cache[mname] = bb
	var bx: AABB = model_cache[mname]
	var s := max_dim / maxf(bx.size.x, maxf(bx.size.y, bx.size.z))
	inst.position = Vector3(-(bx.position.x + bx.size.x / 2.0), -bx.position.y, -(bx.position.z + bx.size.z / 2.0))
	var pivot := Node3D.new()
	pivot.scale = Vector3.ONE * s
	pivot.add_child(inst)
	holder.add_child(pivot)
	if outline:
		_apply_outline(inst, s, thin)
	holder.set_meta("height", bx.size.y * s)
	holder.set_meta("width", bx.size.x * s)
	holder.set_meta("depth", bx.size.z * s)
	return holder

func label3d(text: String, size := 64, col := Color.WHITE) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = font_bold
	l.font_size = size
	l.pixel_size = 0.013
	l.outline_size = 18
	l.modulate = col
	l.outline_modulate = Color(0.1, 0.1, 0.16)
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = false
	l.visibility_range_begin = 7.0   # 鏡頭太近時不顯示，避免大字擋住畫面
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l

## 牆面上的字（招牌、匾額）：放在平面點 p、朝 n、離地 h
func sign_label(text: String, p: Vector2, n: Vector2, h: float, size := 80, col := Color("#7a3424"), outline := 0) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = font_bold
	l.font_size = size
	l.pixel_size = 0.006
	l.modulate = col
	l.outline_size = outline
	l.outline_modulate = Color.WHITE
	l.double_sided = false
	add_child(l)
	l.transform = frame_at(p + n * 0.08, n, h)
	return l

func _build_places() -> void:
	var b := Builder.new(self)
	for P in place_list:
		if P["kind"] == "osm" and not P.has("poly"):
			# OSM 沒有這棟的輪廓（例如新開的店）：在門口後面做一個 5×8 m 的店面
			var pp: Vector2 = P["pos2"]
			var fw: Vector2 = ((P["door2"] as Vector2) - pp).normalized()
			var rt := Vector2(fw.y, -fw.x)
			P["poly"] = [pp + rt * 1.6 + fw * 2.4, pp - rt * 1.6 + fw * 2.4, pp - rt * 1.6 - fw * 2.4, pp + rt * 1.6 - fw * 2.4].map(func(v): return [v.x, v.y])
		var root := Node3D.new()
		root.name = P["id"]
		add_child(root)
		var pos: Vector2 = P["pos2"]
		var door: Vector2 = P["door2"]
		root.transform = frame_at(pos, door - pos)
		var h := 5.0
		var ext := 18.0
		var kind: String = P["kind"]
		var style: String = P.get("style", "")
		# 2026-10-25 v2：依網路最新照片＋老師提供的 Google 地圖照片復刻的 Tripo 模型（有就優先用）
		var bld := "bld_" + String(P["id"])
		if _has_model(bld):
			var sz: float = BLD_SIZE.get(P["id"], P.get("size", 10.0))
			var m := fit_model(bld, sz)
			root.add_child(m)
			h = m.get_meta("height")
			ext = maxf(m.get_meta("width"), m.get_meta("depth"))
			_place_sign(root, P, m.get_meta("width"), h, m.get_meta("depth"))
		elif kind == "model" or (kind == "outer" and style == "model"):
			var m := fit_model(P["model"], P["size"])
			root.add_child(m)
			h = m.get_meta("height")
			ext = maxf(m.get_meta("width"), m.get_meta("depth"))
			if P.has("cover"):
				_sign_cover(root, P["cover"], m.get_meta("width"), h, m.get_meta("depth"))
		elif kind == "osm":
			# 每個地點的建築自己一個網格：別的地點抵達時擋到它也可以變半透明
			var poly := norm_poly(P["poly"])
			var pb := Builder.new(self)
			h = building(pb, poly, _front_edge(poly, door), style, 0, P)
			var holder := Node3D.new()
			holder.name = "PlaceMesh_" + P["id"]
			add_child(holder)
			pb.commit(holder, "B")
			var pr := Rect2(poly[0], Vector2.ZERO)
			for q in poly:
				pr = pr.expand(q)
			tiles.append({"center": pr.get_center(), "r": maxf(4.0, pr.size.length() * 0.5), "rect": pr, "id": P["id"], "mesh": holder.get_node_or_null("B"), "ink": holder.get_node_or_null("BInk")})
			var r := Rect2(poly[0], Vector2.ZERO)
			for q in poly:
				r = r.expand(q)
			ext = maxf(r.size.x, r.size.y)
		elif kind == "waterpark":
			h = _waterpark(b, root, P)
		elif kind == "outer":
			h = _outer(b, root, P)
		P["height"] = h
		P["extent"] = ext
		if kind == "osm" and P.has("poly") and not _has_model(bld):
			_add_blocker(norm_poly(P["poly"]), h, P["id"])
		elif _has_model(bld) or kind == "model" or (kind == "outer" and style == "model"):
			var hx := ext * 0.5
			_add_blocker(PackedVector2Array([pos + Vector2(-hx, -hx), pos + Vector2(hx, -hx), pos + Vector2(hx, hx), pos + Vector2(-hx, hx)]), h, P["id"])
		P["root"] = root
		var word: String = P.get("word", "")
		var lab := label3d("%s\n%s" % [word if word != "" else P.get("en", ""), P["zh"]], 56)
		lab.position = Vector3(0, h + 1.6, 0)
		lab.modulate = Color(1, 0.97, 0.78) if word != "" else Color(0.85, 0.92, 1.0)
		root.add_child(lab)
		P["label"] = lab
		# 門口小廣場（從建築到路邊）
		b.strip(pos.lerp(door, 0.5), door, 2.2, 0.07, Color(0.9, 0.86, 0.78))
	b.commit(self, "Places")

func _front_edge(poly: PackedVector2Array, door: Vector2) -> int:
	var best := 1e9
	var bi := 0
	for i in poly.size():
		var a := poly[i]
		var c := poly[(i + 1) % poly.size()]
		if a.distance_to(c) < 1.0:
			continue
		var d := door.distance_to((a + c) / 2.0)
		if d < best:
			best = d
			bi = i
	return bi

func _sign_cover(root: Node3D, c: Dictionary, wd: float, h: float, dp: float) -> void:
	var plate := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(wd * 0.98, h * float(c["h"]), 0.2)
	plate.mesh = bm
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(c["color"])
	plate.material_override = m
	plate.position = Vector3(0, h * float(c["y"]), dp / 2.0 + 0.1)
	root.add_child(plate)
	var l := Label3D.new()
	l.text = c["text"]
	l.font = font_bold
	l.font_size = 72
	l.pixel_size = 0.009
	l.outline_size = 10
	l.position = plate.position + Vector3(0, 0, 0.12)
	root.add_child(l)

func _waterpark(b: Builder, root: Node3D, P: Dictionary) -> float:
	var pos: Vector2 = P["pos2"]
	var fwd: Vector2 = ((P["door2"] as Vector2) - pos).normalized()
	var yaw := atan2(fwd.x, fwd.y)
	b.box(pos, yaw, Vector3(18, 0.1, 14), 0.0, Color(0.45, 0.72, 0.38), false)
	var loco := fit_model("steam_locomotive", 7.0)
	loco.position = Vector3(-3.5, 0.1, -2.5)
	loco.rotation.y = deg_to_rad(90)
	root.add_child(loco)
	var jet := fit_model("fighter_jet", 6.0)
	jet.position = Vector3(3.5, 0.1, 2.5)
	jet.rotation.y = deg_to_rad(-60)
	root.add_child(jet)
	var pg := fit_model("playground", 5.0)
	pg.position = Vector3(-4.0, 0.1, 3.5)
	root.add_child(pg)
	for k in 5:
		var a := TAU * k / 5.0
		_tree(b, pos + Vector2(cos(a) * 8.0, sin(a) * 6.0), 1.0)
	return 5.0

## 市區外的地點：學校、公園、小廟、草原（程式建築，放在外圈的聯外道路盡頭）
func _outer(b: Builder, root: Node3D, P: Dictionary) -> float:
	var pos: Vector2 = P["pos2"]
	var fwd: Vector2 = ((P["door2"] as Vector2) - pos).normalized()
	var right := Vector2(fwd.y, -fwd.x)
	var yaw := atan2(fwd.x, fwd.y)
	var F := func(u: float, v: float) -> Vector2: return pos + right * u + fwd * v
	match P.get("style", ""):
		"school":
			var col := Color(P.get("color", "#f0e2b8"))
			b.box(F.call(0.0, -3.0), yaw, Vector3(18, 5.6, 5), 0.0, col)
			b.box(F.call(0.0, -3.0), yaw, Vector3(18.4, 0.3, 5.4), 5.6, col.darkened(0.25))
			for fl in 3:
				for i in 7:
					b.box(F.call(-7.2 + i * 2.4, -0.48), yaw, Vector3(1.3, 0.9, 0.08), 0.5 + fl * 1.8, Color("#3f5566"), false)
			b.box(F.call(0.0, 4.0), yaw, Vector3(16, 0.06, 7), 0.0, Color(0.78, 0.36, 0.3), false)
			b.box(F.call(0.0, 4.0), yaw, Vector3(11, 0.08, 3.6), 0.0, Color(0.45, 0.72, 0.38), false)
			b.box(F.call(8.0, 2.0), yaw, Vector3(0.12, 5.0, 0.12), 0.0, Color(0.85, 0.85, 0.85))
			b.box(F.call(8.55, 2.0), yaw, Vector3(1.0, 0.7, 0.05), 4.0, Color(0.85, 0.25, 0.25), false)
			return 6.0
		"park":
			b.box(pos, yaw, Vector3(18, 0.1, 14), 0.0, Color(0.45, 0.72, 0.38), false)
			b.box(pos, yaw, Vector3(2.0, 0.12, 14), 0.0, Color(0.85, 0.78, 0.62), false)
			for k in 7:
				var a := TAU * k / 7.0
				_tree(b, pos + Vector2(cos(a) * 7.0, sin(a) * 5.5), rng.randf_range(0.9, 1.3))
			b.box(F.call(3.0, -2.0), yaw, Vector3(2.0, 0.45, 0.5), 0.0, Color(0.55, 0.38, 0.25))
			return 4.0
		"lawn":
			b.box(pos, yaw, Vector3(20, 0.1, 14), 0.0, Color(0.42, 0.7, 0.34), false)
			b.box(pos, yaw, Vector3(12, 0.7, 2.0), 0.0, Color(0.95, 0.95, 0.95))
			var tm := TextMesh.new()
			tm.text = "水心之初"
			tm.font = font_bold
			tm.font_size = 96
			tm.pixel_size = 0.012
			tm.depth = 0.4
			var mi := MeshInstance3D.new()
			mi.mesh = tm
			var m := StandardMaterial3D.new()
			m.albedo_color = Color(0.98, 0.98, 0.98)
			mi.material_override = m
			mi.position = Vector3(0, 1.7, 0.6)
			root.add_child(mi)
			return 3.5
		"temple_small":
			b.box(pos, yaw, Vector3(6, 2.6, 5), 0.0, Color("#d24b3a"))
			b.prism(pos, yaw, 7.0, 1.6, 6.0, 2.6, Color("#e8a23b"))
			b.box(F.call(0.0, 2.55), yaw, Vector3(2.0, 0.5, 0.06), 1.9, Color("#f2c14e"), false)
			return 4.4
	return 4.0

# ---------- OSM 建築：照真實輪廓長高，臨街面依樣式加細節 ----------
## 街屋依 24 m 方格分塊（每塊一個網格）：抵達時擋住鏡頭的那幾塊可以暫時變半透明
const TILE := 24.0
var tiles: Array = []      # [{center:Vector2, r:float, mesh:MeshInstance3D, ink:MeshInstance3D}]
var mat_fade: StandardMaterial3D

func _build_buildings() -> void:
	var groups := {}
	var tile_rect := {}
	var n := 0
	for B in map["buildings"]:
		var poly := norm_poly(B["poly"])
		if poly.size() < 3:
			continue
		# norm_poly 反轉了順序 → 臨街邊的編號要跟著換
		var f: int = int(B["front"])
		var m := poly.size()
		var fi := (m - 2 - f) % m
		if fi < 0:
			fi += m
		var c := Vector2.ZERO
		for q in poly:
			c += q
		c /= m
		var key := Vector2i(floori(c.x / TILE), floori(c.y / TILE))
		if not groups.has(key):
			groups[key] = Builder.new(self)
			tile_rect[key] = Rect2(poly[0], Vector2.ZERO)
		for q in poly:
			tile_rect[key] = (tile_rect[key] as Rect2).expand(q)
		var bh := building(groups[key], poly, fi, B["style"], int(B.get("levels", 0)), {"street": B.get("street", true)})
		_add_blocker(poly, bh, "")
		n += 1
	for key in groups:
		var b: Builder = groups[key]
		var holder := Node3D.new()
		holder.name = "Tile_%d_%d" % [key.x, key.y]
		add_child(holder)
		b.commit(holder, "B")
		var tr: Rect2 = tile_rect[key]
		tiles.append({"center": tr.get_center(), "r": tr.size.length() * 0.5 + 1.0, "rect": tr, "mesh": holder.get_node_or_null("B"), "ink": holder.get_node_or_null("BInk")})
	print("BUILDINGS ", n, " tiles ", tiles.size())

## 把鏡頭到目標之間的街屋方塊變半透明（目標建築本身是地點，不在方塊裡）
func fade_between(cam2: Vector2, target2: Vector2, target_id := "", near := 16.0) -> void:
	for T in tiles:
		var c: Vector2 = T["center"]
		var d := _seg_dist(c, cam2, target2)
		# 鏡頭站在方塊範圍內（街屋或別的地點建築）也要變半透明，不然畫面一片黑
		var inside: bool = T.has("rect") and (T["rect"] as Rect2).grow(1.5).has_point(cam2)
		var fade: bool = (d < float(T["r"]) or c.distance_to(cam2) < near or inside) and T.get("id", "") != target_id
		if T["mesh"]:
			(T["mesh"] as MeshInstance3D).material_override = mat_fade if fade else mat_toon
		if T["ink"]:
			(T["ink"] as MeshInstance3D).visible = not fade

func clear_fade() -> void:
	for T in tiles:
		if T["mesh"]:
			(T["mesh"] as MeshInstance3D).material_override = mat_toon
		if T["ink"]:
			(T["ink"] as MeshInstance3D).visible = true

func _seg_dist(p: Vector2, a: Vector2, b: Vector2) -> float:
	var ab := b - a
	var t := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 0.0001), 0.0, 1.0)
	return p.distance_to(a + ab * t)
## 一棟建築：poly 外側在右手邊，fi 是臨街邊；回傳高度
func building(b: Builder, poly: PackedVector2Array, fi: int, style: String, levels: int, P: Dictionary) -> float:
	var m := poly.size()
	var a := poly[fi]
	var c := poly[(fi + 1) % m]
	var L := maxf(a.distance_to(c), 0.5)
	var u := (c - a) / L
	var nrm := Vector2(-u.y, u.x)    # 外側
	var yaw := atan2(nrm.x, nrm.y)
	var F := func(s: float, v: float) -> Vector2: return a + u * s + nrm * v
	# 建築往內的深度（給坡屋頂用）
	var depth := 0.5
	var ctr := Vector2.ZERO
	for q in poly:
		depth = maxf(depth, -(q - a).dot(nrm))
		ctr += q
	ctr /= m
	var street: bool = P.get("street", true)
	var floors := levels
	var col := Color(TILE_COLS[rng.randi() % TILE_COLS.size()])
	var roof_col := col.darkened(0.15)
	match style:
		"A":
			floors = 2
			col = Color(BRICK)
		"B":
			floors = 2
			col = Color("#c9a66b")
		"D":
			floors = 1 if rng.randf() < 0.5 else 2
			col = Color("#b7b2a6") if rng.randf() < 0.5 else Color("#e3dccb")
		"E":
			floors = 1
			col = Color("#8a6a4a")
		"T":
			floors = 1
			col = Color(TIN_COLS[rng.randi() % TIN_COLS.size()])
		"temple", "temple_small":
			floors = 1
			col = Color("#d24b3a")
		"school_b":
			floors = maxi(floors, 3)
			col = Color("#efc9c3")
		"police":
			floors = maxi(floors, 3)
			col = Color("#f4f4f0")
		"fire":
			floors = maxi(floors, 3)
			col = Color("#f1ede4")
		"office":
			floors = maxi(floors, 3)
			col = Color("#e9e4d8")
		"store", "shop", "clinic":
			floors = 1 if style == "store" else 2
			col = Color(P.get("color", "#efefea")) if style != "store" else Color("#f5f5f2")
		_:
			if floors <= 0:
				floors = rng.randi_range(2, 4)
	if floors <= 0:
		floors = 2
	var h := FH * floors + 0.2
	if style == "T":
		h = FH * 1.4
	b.extrude(poly, h, 0.0, col, col.darkened(0.2) if style != "T" else col.darkened(0.08))
	if not street and style in ["C", "D", "T"]:
		if style == "C" and rng.randf() < 0.6:
			b.cyl(ctr, 0.3, 0.8, h, Color("#c8ccd0"))
		elif style == "D":
			b.prism(ctr, yaw, L + 0.2, 0.8, depth + 0.2, h, Color("#b4533a") if rng.randf() < 0.6 else Color("#3e3e40"))
		return h
	var bays := maxi(1, int(round(L / 2.5)))
	var bw := L / bays
	match style:
		"A":
			var stone := Color(STONE)
			b.box(F.call(L / 2.0, 0.04), yaw, Vector3(L, 0.14, 0.08), FH + 0.2, stone, false)            # 白色石帶
			b.box(F.call(L / 2.0, 0.04), yaw, Vector3(L, 0.12, 0.08), h - 0.2, stone, false)
			for i in bays:
				var s := bw * (i + 0.5)
				b.box(F.call(s, 0.03), yaw, Vector3(bw * 0.62, 1.4, 0.06), 0.0, Color(0.25, 0.2, 0.2), false)   # 騎樓拱口
				b.box(F.call(s, 0.03), yaw, Vector3(bw * 0.4, 0.25, 0.06), 1.4, Color(0.25, 0.2, 0.2), false)
				b.box(F.call(s, 0.04), yaw, Vector3(0.55, 0.85, 0.06), FH + 0.55, Color("#4e6b5a"), false)       # 拱窗
				b.box(F.call(s, 0.04), yaw, Vector3(0.36, 0.18, 0.06), FH + 1.4, Color("#4e6b5a"), false)
				b.box(F.call(s, 0.06), yaw, Vector3(0.7, 0.1, 0.08), FH + 1.5, stone, false)
			for i in bays + 1:
				b.cyl(F.call(clampf(bw * i, 0.2, L - 0.2), 0.5), 0.13, FH, 0.0, Color("#cfc4ae"))                  # 騎樓圓柱
			b.box(F.call(L / 2.0, 0.6), yaw, Vector3(L, 0.25, 1.2), FH - 0.05, col)                               # 騎樓頂
			# 女兒牆＋中央山頭
			b.box(F.call(L / 2.0, -0.08), yaw, Vector3(L, 0.6, 0.16), h, col)
			b.box(F.call(L / 2.0, -0.08), yaw, Vector3(L * 0.4, 1.0, 0.16), h, col)
			b.box(F.call(L / 2.0, -0.08), yaw, Vector3(L * 0.2, 1.25, 0.16), h, col)
			b.box(F.call(L / 2.0, 0.02), yaw, Vector3(L * 0.28, 0.45, 0.05), h + 0.28, Color("#d9c7a8"), false)
			if P.get("plaque", "") != "":
				sign_label(P["plaque"], F.call(L / 2.0, 0.06), nrm, h + 0.32, 56)
		"B":
			if P.get("ruin", false):
				# 中山堂：屋頂坍塌，牆內長草、外圍鐵圍籬
				b.blob(ctr, h - 0.2, minf(L, depth) * 0.3, Color("#6a9a48"), 0.5)
				b.box(F.call(L / 2.0, 0.04), yaw, Vector3(1.2, 1.7, 0.06), 0.0, Color(0.2, 0.2, 0.2), false)
				b.box(F.call(L / 2.0, 1.0), yaw, Vector3(L + 1.0, 0.9, 0.04), 0.0, Color("#7d8a80"), false)
			else:
				for i in bays:
					for fl in 2:
						b.box(F.call(bw * (i + 0.5), 0.04), yaw, Vector3(0.5, 1.0, 0.06), 0.4 + fl * FH, Color("#3f5566"), false)
				b.box(F.call(L / 2.0, 0.4), yaw, Vector3(minf(L, 2.4), 0.1, 0.8), 1.6, Color("#b08e57"))   # 雨庇
			b.box(F.call(L / 2.0, -0.08), yaw, Vector3(L * 0.45, 0.9, 0.16), h, col)
			if P.get("plaque", "") != "":
				sign_label(P["plaque"], F.call(L / 2.0, 0.06), nrm, h + 0.2, 52, Color("#5a3a20"))
		"D":
			for i in bays:
				var s := bw * (i + 0.5)
				b.box(F.call(s, 0.03), yaw, Vector3(bw * 0.8, 1.45, 0.05), 0.0, Color("#7a5a3a"), false)        # 木板門
				if floors == 2:
					b.box(F.call(s, 0.03), yaw, Vector3(bw * 0.45, 0.7, 0.05), FH + 0.5, Color("#7a5a3a"), false)
			b.box(F.call(L / 2.0, 0.55), yaw, Vector3(L, 0.12, 1.1), FH - 0.15, col.darkened(0.1))               # 亭仔腳
			for i in bays + 1:
				b.box(F.call(clampf(bw * i, 0.15, L - 0.15), 1.0), yaw, Vector3(0.22, FH - 0.15, 0.22), 0.0, Color("#a9a49a"))
			if rng.randf() < 0.5:
				b.box(F.call(L / 2.0, 1.12), yaw, Vector3(minf(L * 0.7, 3.0), 0.35, 0.05), FH - 0.6, Color("#f4f1ea"))  # 手繪招牌
			b.prism(ctr, yaw, L + 0.2, 0.9, depth + 0.2, h, Color("#b4533a") if rng.randf() < 0.6 else Color("#3e3e40"))
		"E":
			for k in 4:
				b.box(F.call(L / 2.0, 0.03), yaw, Vector3(L, 0.04, 0.04), 0.4 + k * 0.32, col.darkened(0.3), false)
			for s in [L * 0.28, L * 0.72]:
				b.box(F.call(s, 0.05), yaw, Vector3(0.9, 0.7, 0.05), 0.7, Color("#e8e4da"), false)
			b.prism(ctr, yaw, L + 0.5, 1.3, depth + 0.5, h, Color("#4a4d52"))
		"T":
			b.prism(ctr, yaw, L + 0.2, 0.5, depth + 0.2, h, col.darkened(0.1))
		"temple":
			b.prism(ctr, yaw, L + 0.8, 1.6, depth + 0.8, h, Color("#e8a23b"))
			for s in [-0.3, L + 0.3]:
				b.box(F.call(s, -depth / 2.0), yaw, Vector3(0.3, 0.9, 0.3), h + 1.2, Color("#2e8b57"))   # 燕尾
			b.box(F.call(L / 2.0, 0.05), yaw, Vector3(minf(L * 0.5, 2.4), 1.6, 0.06), 0.0, Color("#5a1e14"), false)
			b.box(F.call(L / 2.0, 0.06), yaw, Vector3(1.4, 0.4, 0.06), h - 0.5, Color("#f2c14e"), false)
			if P.get("zh", "") != "":
				sign_label(P["zh"], F.call(L / 2.0, 0.1), nrm, h - 0.48, 44, Color("#7a3424"))
		"police", "fire", "office", "school_b", "clinic":
			var band: Color = {"police": Color("#2f5fa8"), "fire": Color("#d22f27"), "office": Color("#8a7a5a"), "school_b": Color("#d97b6b"), "clinic": Color("#2b9a8a")}[style]
			for fl in range(1, floors):
				b.box(F.call(L / 2.0, 0.04), yaw, Vector3(L, 0.16, 0.06), fl * FH, band, false)
				for i in bays:
					b.box(F.call(bw * (i + 0.5), 0.04), yaw, Vector3(bw * 0.55, 0.8, 0.05), fl * FH + 0.45, Color("#3f5566"), false)
			if style == "fire":
				for i in mini(bays, 3):
					b.box(F.call(bw * (i + 0.5), 0.04), yaw, Vector3(bw * 0.8, 1.5, 0.06), 0.0, Color("#e0412f"), false)   # 消防車庫門
			else:
				b.box(F.call(L / 2.0, 0.04), yaw, Vector3(minf(L * 0.4, 2.0), 1.4, 0.06), 0.0, Color("#3f5566"), false)
				b.box(F.call(L / 2.0, 0.4), yaw, Vector3(minf(L * 0.6, 3.0), 0.1, 0.8), 1.5, band)
			if P.get("sign", "") != "":
				b.box(F.call(L / 2.0, 0.06), yaw, Vector3(minf(L * 0.7, 4.0), 0.5, 0.05), FH - 0.2, Color.WHITE, false)
				sign_label(P["sign"], F.call(L / 2.0, 0.1), nrm, FH - 0.15, 52, band)
			if style == "police" or style == "office":
				b.box(F.call(L + 0.8, 1.5), yaw, Vector3(0.08, 4.0, 0.08), 0.0, Color(0.85, 0.85, 0.85))   # 旗桿
		"store", "shop":
			b.box(F.call(L / 2.0, 0.04), yaw, Vector3(L * 0.8, 1.3, 0.05), 0.0, Color(0.6, 0.8, 0.9), false)
			var sc := Color(P.get("color", "#3aa6d8"))
			b.box(F.call(L / 2.0, 0.08), yaw, Vector3(L, 0.45, 0.1), FH - 0.45, sc)
			if P.get("sign", "") != "":
				sign_label(P["sign"], F.call(L / 2.0, 0.14), nrm, FH - 0.43, 48, Color.WHITE)
		_:
			_facade_tile(b, F, yaw, L, bays, bw, floors, h, col, ctr, depth)
	return h

## C：磁磚透天的臨街面（鐵捲門、鐵窗、陽台、立招、亭仔腳、水塔、鐵皮加蓋）
func _facade_tile(b: Builder, F: Callable, yaw: float, L: float, bays: int, bw: float, floors: int, h: float, col: Color, ctr: Vector2, depth: float) -> void:
	var grille := Color("#6e7b85") if rng.randf() < 0.6 else Color("#dadada")
	for i in bays:
		var s := bw * (i + 0.5)
		b.box(F.call(s, 0.03), yaw, Vector3(bw * 0.78, 1.5, 0.05), 0.0, Color("#9aa3a8"), false)        # 鐵捲門
		for fl in range(1, floors):
			b.box(F.call(s, 0.03), yaw, Vector3(bw * 0.5, 0.7, 0.05), fl * FH + 0.5, Color("#3f5566"), false)
			b.box(F.call(s, 0.09), yaw, Vector3(bw * 0.56, 0.78, 0.06), fl * FH + 0.46, grille, false)
			b.box(F.call(s, 0.1), yaw, Vector3(0.04, 0.74, 0.06), fl * FH + 0.48, grille, false)
	b.box(F.call(L / 2.0, 0.55), yaw, Vector3(L, 0.12, 1.1), FH - 0.1, col.darkened(0.12))               # 亭仔腳頂
	for i in bays + 1:
		b.box(F.call(clampf(bw * i, 0.12, L - 0.12), 1.0), yaw, Vector3(0.2, FH - 0.1, 0.2), 0.0, col.darkened(0.05))
	if floors >= 2 and rng.randf() < 0.35:
		b.box(F.call(L / 2.0, 0.25), yaw, Vector3(L, 0.08, 0.45), FH + 0.02, col.darkened(0.15), false)   # 陽台
		b.box(F.call(L / 2.0, 0.46), yaw, Vector3(L, 0.5, 0.03), FH + 0.1, grille, false)
	var r := rng.randf()
	if r < 0.4:
		b.box(F.call(L - 0.25, 0.4), yaw, Vector3(0.32, 1.1, 0.08), FH + 0.2, Color("#ffffff"))             # 直式立招
		b.box(F.call(L - 0.25, 0.45), yaw, Vector3(0.22, 0.9, 0.02), FH + 0.3, Color("#c8102e"), false)
	elif r < 0.7:
		var sc: Color = [Color("#d94f3d"), Color("#2f7fbf"), Color("#e8b33a"), Color("#3e9b6a")][rng.randi() % 4]
		b.box(F.call(L / 2.0, 1.12), yaw, Vector3(L * 0.85, 0.4, 0.08), FH - 0.5, sc)                       # 橫式招牌
	b.box(F.call(L / 2.0, -0.06), yaw, Vector3(L, 0.5, 0.12), h, col.lightened(0.05))                       # 女兒牆
	if rng.randf() < 0.45:
		b.box(ctr, yaw, Vector3(L * 0.8, 1.3, minf(depth * 0.5, 4.0)), h, Color(TIN_COLS[rng.randi() % TIN_COLS.size()]))  # 鐵皮加蓋
	elif rng.randf() < 0.7:
		b.cyl(ctr, 0.3, 0.8, h, Color("#c8ccd0"))                                                            # 不鏽鋼水塔

# ---------- 路邊：電線桿、電線、路燈、行道樹 ----------
func _build_street_props() -> void:
	var b := Builder.new(self)
	for e in edges:
		var wd: float = e[2]
		if wd < 4.2:
			continue
		var a: Vector2 = nodes[e[0]]
		var c: Vector2 = nodes[e[1]]
		var L := a.distance_to(c)
		if L < 10.0:
			continue
		var dir := (c - a) / L
		var side := Vector2(-dir.y, dir.x) * (wd / 2.0 + WALK_W * 0.7)
		var prev := Vector2.INF
		var t := 4.0
		while t < L - 3.0:
			var pp := a + dir * t + side
			if not _near_place(pp):
				_pole(b, pp, dir)
				if prev != Vector2.INF:
					for k: float in [-0.3, 0.3]:
						_wire(b, prev + dir.orthogonal() * k, pp + dir.orthogonal() * k, 4.6)
				prev = pp
			else:
				prev = Vector2.INF
			t += 14.0
	b.commit(self, "StreetProps")

func _near_place(q: Vector2) -> bool:
	for P in place_list:
		if q.distance_to(P["door2"]) < 3.0:
			return true
	return false

func _pole(b: Builder, p: Vector2, along: Vector2) -> void:
	var yaw := atan2(along.x, along.y)
	b.box(p, yaw, Vector3(0.16, 5.0, 0.16), 0.0, Color("#9a9a9a"))
	b.box(p, yaw + PI / 2.0, Vector3(0.08, 0.08, 0.9), 4.5, Color("#7a7a7a"))

func _wire(b: Builder, p0: Vector2, p1: Vector2, h: float) -> void:
	var d := p1 - p0
	var L := d.length()
	var yaw := atan2(d.x, d.y)
	var segs := maxi(2, int(L / 2.0))
	for i in segs:
		var tm := (float(i) + 0.5) / segs
		var sag := 0.4 * (1.0 - pow(2.0 * tm - 1.0, 2.0))
		b.box(p0 + d * tm, yaw, Vector3(0.03, 0.03, L / segs + 0.03), h - sag, Color("#222222"), false)

func _tree(b: Builder, p: Vector2, k: float) -> void:
	b.box(p, 0.0, Vector3(0.2, 1.1, 0.2) * k, 0.0, Color(0.48, 0.34, 0.24))
	b.blob(p, 1.6 * k, 0.9 * k, Color(0.36, 0.62, 0.32), 0.85)
	b.blob(p + Vector2(0.35, 0.2) * k, 2.1 * k, 0.55 * k, Color(0.44, 0.7, 0.36), 0.9)

# ---------- 星球另一面：稻田、濁水溪、八卦山 ----------
func _build_countryside() -> void:
	var b := Builder.new(self)
	var rmin := 600.0
	var rmax := PI * R - 20.0
	for i in 1400:
		var r := rng.randf_range(rmin, rmax)
		var a := rng.randf() * TAU
		var p := Vector2(cos(a), sin(a)) * r
		if absf((p - rail_o).dot(Vector2(-rail_d.y, rail_d.x))) < 4.0:
			continue
		var col: Color = [Color(0.52, 0.76, 0.38), Color(0.6, 0.8, 0.42), Color(0.82, 0.78, 0.4), Color(0.45, 0.7, 0.36)][rng.randi() % 4]
		b.box(p, a, Vector3(rng.randf_range(6.0, 12.0), 0.06, rng.randf_range(6.0, 12.0)), 0.0, col, false)
	var prev := Vector2.ZERO
	for i in 181:
		var a := TAU * i / 180.0
		var p := Vector2(cos(a), sin(a)) * (640.0 + sin(a * 3.0) * 14.0)
		if i > 0:
			b.strip(prev, p, 16.0, 0.09, Color(0.5, 0.72, 0.86))     # 濁水溪
			b.strip(prev, p, 24.0, 0.05, Color(0.78, 0.74, 0.62))
		prev = p
	for i in 18:
		var a := rng.randf() * TAU
		var p := Vector2(cos(a), sin(a)) * rng.randf_range(700.0, rmax)
		b.blob(p, 0.0, rng.randf_range(18.0, 30.0), Color(0.33, 0.56, 0.32), 0.5, true)     # 八卦山
	for i in 220:
		var a := rng.randf() * TAU
		var p := Vector2(cos(a), sin(a)) * rng.randf_range(rmin, rmax)
		_tree(b, p, rng.randf_range(1.4, 2.2))
	b.commit(self, "Country")

func _build_clouds() -> void:
	clouds = Node3D.new()
	clouds.name = "Clouds"
	add_child(clouds)
	var b := Builder.new(self)
	for i in 22:
		var a := rng.randf() * TAU
		var p := Vector2(cos(a), sin(a)) * rng.randf_range(40.0, 820.0)
		var h := rng.randf_range(40.0, 55.0)
		for k in 4:
			b.blob(p + Vector2(rng.randf_range(-5, 5), rng.randf_range(-3, 3)), h + rng.randf_range(-1.0, 1.5), rng.randf_range(3.0, 5.5), Color(0.98, 0.98, 1.0), 0.7, false)
	b.commit(clouds, "CloudMesh")

func _process(delta: float) -> void:
	if clouds:
		clouds.rotate_y(delta * 0.006)
	_update_train(delta)

class _LocalBuilder:
	var st := SurfaceTool.new()
	var ink := SurfaceTool.new()
	var w: Node3D
	func _init(world: Node3D) -> void:
		w = world
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		ink.begin(Mesh.PRIMITIVE_TRIANGLES)
	func _quad(t: SurfaceTool, a: Vector3, b: Vector3, c: Vector3, d: Vector3, col: Color) -> void:
		t.set_color(col)
		if w.FLIP:
			for v in [a, b, c, a, c, d]: t.add_vertex(v)
		else:
			for v in [a, c, b, a, d, c]: t.add_vertex(v)
	func _cube(t: SurfaceTool, c: Vector3, s: Vector3, col: Color) -> void:
		var h := s / 2.0
		var p := []
		for k in 8:
			p.append(Vector3(c.x + (h.x if k & 1 else -h.x), c.y + (s.y if k & 4 else 0.0), c.z + (h.z if k & 2 else -h.z)))
		_quad(t, p[4], p[5], p[7], p[6], col.lightened(0.08))
		_quad(t, p[0], p[2], p[3], p[1], col.darkened(0.3))
		_quad(t, p[2], p[6], p[7], p[3], col)
		_quad(t, p[0], p[1], p[5], p[4], col.darkened(0.04))
		_quad(t, p[1], p[3], p[7], p[5], col.darkened(0.04))
		_quad(t, p[0], p[4], p[6], p[2], col.darkened(0.04))
	func box(c: Vector3, s: Vector3, col: Color, outline := true) -> void:
		_cube(st, c, s, col)
		if outline and s.y > 0.2:
			var o: float = w.OUTLINE
			_cube(ink, c - Vector3(0, o, 0), s + Vector3(o * 2, o * 2, o * 2), w.INK)
	func commit(parent: Node3D) -> void:
		st.generate_normals()
		var mi := MeshInstance3D.new()
		mi.mesh = st.commit()
		mi.material_override = w.mat_toon
		parent.add_child(mi)
		ink.generate_normals()
		var m2 := ink.commit()
		if m2.get_surface_count() > 0:
			var mo := MeshInstance3D.new()
			mo.mesh = m2
			mo.material_override = w.mat_ink
			parent.add_child(mo)

func _update_train(delta: float) -> void:
	if train == null:
		return
	if train.get_child_count() == 0:
		for i in 3:
			var car := Node3D.new()
			train.add_child(car)
			var lb := _LocalBuilder.new(self)
			lb.box(Vector3(0, 0.25, 0), Vector3(1.8, 1.7, 5.4), Color(0.95, 0.95, 0.92))
			lb.box(Vector3(0, 1.0, 0), Vector3(1.85, 0.55, 5.0), Color(0.3, 0.45, 0.6), false)
			lb.box(Vector3(0, 0.4, 0), Vector3(1.85, 0.18, 5.45), Color(0.2, 0.55, 0.45), false)
			lb.commit(car)
	train_t += delta * 7.0
	var span := 1700.0
	var x0 := fposmod(train_t, span) - span / 2.0
	for i in train.get_child_count():
		var p := rail_o + rail_d * (x0 - i * 5.8)
		var car: Node3D = train.get_child(i)
		car.transform = frame_at(p, rail_d, 0.22)

# ---------- 找路（平面上 Dijkstra） ----------
func project(p: Vector2) -> Dictionary:
	var best := {"d": 1e9}
	for i in edges.size():
		var a: Vector2 = nodes[edges[i][0]]
		var b: Vector2 = nodes[edges[i][1]]
		var ab := b - a
		if ab.length_squared() < 0.0001:
			continue
		var t := clampf((p - a).dot(ab) / ab.length_squared(), 0.0, 1.0)
		var q := a + ab * t
		var d := q.distance_to(p)
		if d < best["d"]:
			best = {"d": d, "q": q, "edge": i}
	return best

func route(from_p: Vector2, to_p: Vector2) -> Array:
	var ps := project(from_p)
	var pt := project(to_p)
	var pos := {}
	var adj := {}
	for k in nodes:
		pos[k] = nodes[k]
		adj[k] = {}
	for e in edges:
		var dd: float = pos[e[0]].distance_to(pos[e[1]])
		adj[e[0]][e[1]] = dd
		adj[e[1]][e[0]] = dd
	pos["_S"] = ps["q"]
	adj["_S"] = {}
	pos["_T"] = pt["q"]
	adj["_T"] = {}
	for pair in [["_S", ps], ["_T", pt]]:
		var vid: String = pair[0]
		var e: Array = edges[pair[1]["edge"]]
		for end in [e[0], e[1]]:
			var dd: float = pos[vid].distance_to(pos[end])
			adj[vid][end] = dd
			adj[end][vid] = dd
	if ps["edge"] == pt["edge"]:
		var d2: float = pos["_S"].distance_to(pos["_T"])
		adj["_S"]["_T"] = d2
		adj["_T"]["_S"] = d2
	var dist := {}
	var prev := {}
	var done := {}
	var open := ["_S"]
	for k in pos:
		dist[k] = 1e9
	dist["_S"] = 0.0
	while open.size() > 0:
		var bi := 0
		for i in range(1, open.size()):
			if dist[open[i]] < dist[open[bi]]:
				bi = i
		var u: String = open[bi]
		open.remove_at(bi)
		if u == "_T":
			break
		done[u] = true
		for v in adj[u]:
			if done.has(v):
				continue
			var nd: float = dist[u] + adj[u][v]
			if nd < dist[v]:
				dist[v] = nd
				prev[v] = u
				if not open.has(v):
					open.append(v)
	var out := []
	var cur := "_T"
	while cur != "_S" and prev.has(cur):
		out.push_front(pos[cur])
		cur = prev[cur]
	out.push_front(pos["_S"])
	out.push_front(from_p)
	out.append(to_p)
	return out

# ---------- 問路模式：顏色路名（同一條路整場同色；路名去掉「三段」「（…）」，員集路三段、四段算同一條） ----------
const ROAD_COLORS := ["red", "yellow", "green", "blue", "black", "white", "purple", "pink", "orange", "brown"]
const ROAD_HEX := {"red": "#e03131", "yellow": "#fcc419", "green": "#2f9e44", "blue": "#1971c2", "black": "#212529",
	"white": "#f8f9fa", "purple": "#7048e8", "pink": "#f783ac", "orange": "#fd7e14", "brown": "#8b5a2b"}
var edge_group: Array = []      # 邊 → 路的編號
var road_groups: Array = []     # [{name, width, color, kind, edges:[i]}]
var road_paint: Node3D

func _road_name(e: Array) -> String:
	var nm := String(e[3]) if e.size() > 3 else ""
	var p := nm.find("（")
	if p >= 0:
		nm = nm.substr(0, p)
	var re := RegEx.new()
	re.compile("[一二三四五六七八九十]段.*$")
	return re.sub(nm, "")

func _build_road_groups() -> void:
	edge_group.resize(edges.size())
	var by_name := {}
	# 沒有名字的小巷：相連的算同一條
	var parent := {}
	var find := func(x, fn):
		while parent.get(x, x) != x:
			x = parent[x]
		return x
	for i in edges.size():
		if _road_name(edges[i]) == "":
			var a = find.call(edges[i][0], find)
			var b = find.call(edges[i][1], find)
			if a != b:
				parent[a] = b
	for i in edges.size():
		var nm := _road_name(edges[i])
		var key := nm if nm != "" else "_" + String(find.call(edges[i][0], find))
		if not by_name.has(key):
			by_name[key] = road_groups.size()
			road_groups.append({"name": nm, "width": 0.0, "edges": []})
		var g: int = by_name[key]
		edge_group[i] = g
		road_groups[g]["edges"].append(i)
		road_groups[g]["width"] = maxf(road_groups[g]["width"], float(edges[i][2]))
	# 有目的地的路先拿到不同顏色
	var count := {}
	for P in place_list:
		if P.get("word", "") != "":
			var g: int = edge_group[project(P["door2"])["edge"]]
			count[g] = count.get(g, 0) + 1
	var order := count.keys()
	order.sort_custom(func(x, y): return count[x] > count[y])
	var ci := 0
	for g in order:
		road_groups[g]["color"] = ROAD_COLORS[ci % ROAD_COLORS.size()]
		ci += 1
	for g in road_groups.size():
		if not road_groups[g].has("color"):
			road_groups[g]["color"] = ROAD_COLORS[ci % ROAD_COLORS.size()]
			ci += 1
		road_groups[g]["kind"] = "Road" if float(road_groups[g]["width"]) >= 4.2 else "Street"

func road_of(id: String) -> Dictionary:
	var g: int = edge_group[project(places[id]["door2"])["edge"]]
	return {"group": g, "color": road_groups[g]["color"], "kind": road_groups[g]["kind"], "name": road_groups[g]["name"]}

func show_road_color(g: int, color: String, door: Vector2, text: String) -> void:
	hide_road_color()
	road_paint = Node3D.new()
	road_paint.name = "RoadPaint"
	add_child(road_paint)
	var b := Builder.new(self)
	var col := Color(ROAD_HEX[color])
	for i in road_groups[g]["edges"]:
		var e: Array = edges[i]
		b.strip(nodes[e[0]], nodes[e[1]], float(e[2]) * 0.9, 0.135, col)
	b.commit(road_paint, "Paint")
	var l := label3d(text, 90, col.lightened(0.3) if color == "black" else col)
	l.outline_modulate = Color.WHITE if color == "black" else Color(0.1, 0.1, 0.16)
	l.transform = Transform3D(Basis(), bend2(door, 3.2))
	l.visibility_range_begin = 0.0
	road_paint.add_child(l)

func hide_road_color() -> void:
	if road_paint:
		road_paint.queue_free()
		road_paint = null

# ---------- 抵達鏡頭：在建築四周找一個不被房子擋住的角度 ----------
var blockers: Array = []   # [{poly, h, rect, id}]

func _add_blocker(poly: PackedVector2Array, h: float, id: String) -> void:
	var r := Rect2(poly[0], Vector2.ZERO)
	for q in poly:
		r = r.expand(q)
	blockers.append({"poly": poly, "h": h, "rect": r.grow(0.2), "id": id})

## 從平面點 cam2（高 ch）看向 tgt2（高 th）：有幾個取樣點被別的房子擋住
func _blocked_count(cam2: Vector2, ch: float, tgt2: Vector2, th: float, self_id: String) -> int:
	var n := 0
	for i in range(0, 16):
		var u := float(i) / 16.0
		var p := cam2.lerp(tgt2, u)
		var sh := lerpf(ch, th, u)
		for B in blockers:
			# 視線要高過屋頂一點；鏡頭正下方 3 m 內有屋頂也算擋住（屋頂會佔滿畫面下半部）
			var margin := 3.0 if i == 0 else 0.8
			if B["id"] == self_id or float(B["h"]) < sh - margin:
				continue
			if (B["rect"] as Rect2).has_point(p) and Geometry2D.is_point_in_polygon(p, B["poly"]):
				n += 1 if i > 0 else 30   # 鏡頭自己在房子裡面：最差
				break
	return n

## 押注畫面（老師 10/26：Ken 在圖書館等站被房子擋住）：繞角色一圈找不被擋的鏡頭方向
## pref＝最想要的方向（背對建築、面向街道）；回傳 [鏡頭平面位置, 鏡頭高度, 鏡頭方向]
func face_view(p: Vector2, pref: Vector2, dist := 4.6, ch := 1.9) -> Array:
	var best := []
	var best_score := 1e9
	for hk in [1.0, 1.6, 2.4]:
		for deg in [0, 20, -20, 40, -40, 60, -60, 80, -80, 100, -100, 120, -120, 140, -140, 160, -160, 180]:
			var dir := pref.rotated(deg_to_rad(deg))
			var side := Vector2(-dir.y, dir.x)
			var c2 := p + dir * dist + side * 1.1
			var hh: float = ch * hk
			var score: float = _blocked_count(c2, hh, p, 1.1, "") * 10.0 + absf(deg) / 40.0 + (hk - 1.0) * 2.0
			if score < best_score:
				best_score = score
				best = [c2, hh, dir]
	if OS.get_environment("ARRIVALS") != "":
		print("FACE ", p, " score=", best_score, " cam=", best)
	return best

## 回傳 [鏡頭平面位置, 鏡頭高度]；結果存在 P["view"]
func arrive_view(id: String, d: float, ch: float, tgt_h: float) -> Array:
	var P: Dictionary = places[id]
	if P.has("view"):
		return P["view"]
	var door: Vector2 = P["door2"]
	var pos: Vector2 = P["pos2"]
	var out := (door - pos).normalized()
	var tgt := pos.lerp(door, 0.4)
	var best := []
	var best_score := 1e9
	for hk in [1.0, 1.4, 1.9]:
		for deg in [0, 15, -15, 30, -30, 45, -45, 60, -60, 75, -75]:
			var dir := out.rotated(deg_to_rad(deg))
			var c2 := door + dir * d
			var hh: float = ch * hk
			# 被擋的取樣點越少越好；角度越正、鏡頭越低越好
			var score: float = _blocked_count(c2, hh, tgt, tgt_h, id) * 10.0 + absf(deg) / 30.0 + (hk - 1.0) * 3.0
			if score < best_score:
				best_score = score
				best = [c2, hh]
	P["view"] = best
	if OS.get_environment("ARRIVALS") != "":
		var near := []
		for B in blockers:
			if (B["rect"] as Rect2).grow(3.0).has_point(best[0]):
				near.append([B["id"], snappedf(B["h"], 0.1)])
		print("VIEW ", id, " score=", best_score, " cam=", best, " near=", near)
	return best

## 復刻模型的大小（遊戲公尺＝真實 × 0.55，取最長邊）
const BLD_SIZE := {
	"station": 30.0, "school": 30.0, "esjh": 30.0, "yuanquan": 26.0, "fuxing": 26.0, "library": 12.0, "post": 10.0,
	"health": 11.0, "market": 12.0, "pxmart": 18.0, "seven": 9.0, "ok": 7.0, "bookstore": 7.0, "teatop": 7.5,
	"tea2": 7.0, "inn": 9.0, "qizao": 12.0, "waterpark": 20.0, "fengbo": 20.0, "lawn": 22.0, "baobao": 20.0, "lintemple": 10.0,
}
## 招牌上的正確中文（模型上的字是英文佔位，疊一塊真正的招牌字）
const BLD_SIGN := {
	"station": "二水車站", "school": "二水國民小學", "esjh": "二水國民中學", "yuanquan": "源泉國民小學", "fuxing": "復興國民小學",
	"library": "二水鄉立圖書館", "post": "郵局", "health": "二水鄉衛生所", "market": "二水超市", "pxmart": "超市",
	"bookstore": "書店", "teatop": "飲料店", "tea2": "飲料店", "seven": "便利商店", "ok": "便利商店", "inn": "二八水驛站", "lintemple": "林先生廟",
}

func _place_sign(root: Node3D, P: Dictionary, wd: float, h: float, dp: float) -> void:
	var txt: String = BLD_SIGN.get(P["id"], "")
	if txt == "":
		return
	# 中文招牌：寬度約建築寬的 45%，高度放在模型英文佔位招牌附近（SIGN_Y＝佔建築高度比例）
	var l := Label3D.new()
	l.text = txt
	l.font = font_bold
	l.font_size = 64
	var want_w := minf(wd * 0.45, 2.4 + txt.length() * 0.45)
	l.pixel_size = want_w / maxf(1.0, txt.length() * 64.0)
	l.modulate = Color.WHITE
	l.outline_size = 14
	l.outline_modulate = Color(0.12, 0.1, 0.16)
	l.double_sided = false   # 從背面看不到（不會出現反字）
	l.position = Vector3(0, h * float(SIGN_Y.get(P["id"], 0.55)), dp / 2.0 + 0.12)
	# 老師 10/26 去品牌化：模型上有品牌字樣／配色的招牌，用一塊素色看板蓋住，中文招牌寫在看板上
	if SIGN_PLATE.has(P["id"]):
		var c: Array = SIGN_PLATE[P["id"]]   # [中心高度比例, 高度比例, 寬度比例, 顏色, 往前凸出 m]
		var pm := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(wd * float(c[2]), h * float(c[1]), 0.2)
		pm.mesh = bm
		var mt := StandardMaterial3D.new()
		mt.albedo_color = Color(c[3])
		mt.roughness = 0.9
		pm.material_override = mt
		pm.position = Vector3(0, h * float(c[0]), dp / 2.0 + float(c[4]))
		root.add_child(pm)
		if c.size() > 5 and c[5]:
			# 側面也有品牌色帶（全聯、7-ELEVEN）：兩側一起蓋
			for sx in [-1.0, 1.0]:
				var sp := MeshInstance3D.new()
				var sb := BoxMesh.new()
				sb.size = Vector3(0.2, h * float(c[1]), dp * 1.02)
				sp.mesh = sb
				sp.material_override = mt
				sp.position = Vector3(sx * (wd / 2.0 + float(c[4])), h * float(c[0]), 0)
				root.add_child(sp)
		l.position = Vector3(0, h * float(c[0]), dp / 2.0 + float(c[4]) + 0.14)
		l.pixel_size = minf(l.pixel_size, h * float(c[1]) * 0.75 / 64.0)
	root.add_child(l)

## 蓋品牌招牌的看板：[中心高度比例, 高度比例, 寬度比例, 顏色, 往前凸出 m]（對照 資料/generated-images/buildings 參考圖）
const SIGN_PLATE := {
	"pxmart": [0.7, 0.38, 1.03, "#2f6f73", 0.2, true],
	"seven": [0.78, 0.22, 1.02, "#4a5f8a", 0.15, true],
	"ok": [0.33, 0.1, 0.92, "#5a7d4f", 0.25],
	"teatop": [0.31, 0.08, 0.8, "#c0392b", 0.25],
	"tea2": [0.365, 0.14, 0.96, "#2b4f8a", 0.3],
}
## 招牌高度（占建築高度比例），對照參考圖英文佔位招牌的位置
const SIGN_Y := {
	"station": 0.78, "school": 0.55, "esjh": 0.6, "yuanquan": 0.45, "fuxing": 0.82, "library": 0.6, "post": 0.42,
	"health": 0.8, "market": 0.6, "pxmart": 0.72, "bookstore": 0.72, "teatop": 0.3, "tea2": 0.32, "inn": 0.4, "lintemple": 0.55,
}