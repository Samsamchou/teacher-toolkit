extends RefCounted
## Mixamo 動作 → 角色骨架（Ken／水鈴／圳寶）重定向
## 做法：每一格取「來源骨頭在世界座標相對靜止姿勢轉了多少」，套到目標骨頭的世界靜止姿勢，再換回本地旋轉。
## 兩邊骨頭的靜止方向不同也能用；只有 Hips 搬移位置（依臀高比例縮放）。

var src_root: Node3D
var src_ap: AnimationPlayer
var src_sk: Skeleton3D
var tgt_sk: Skeleton3D
var map := {}          # 目標骨 idx → 來源骨 idx
var order: Array[int] = []   # 目標骨頭由父到子
var hips_t := -1
var hips_s := -1
var hip_ratio := 1.0
var anim_name := ""

static func norm(n: String) -> String:
	var s := n.to_lower()
	var i := s.find("mixamorig")
	if i >= 0:
		s = s.substr(i + 9)
		while s.length() > 0 and (s[0] == ":" or s[0] == "_" or s[0].is_valid_int()):
			s = s.substr(1)
	return s

static func find_type(n: Node, cls: String) -> Node:
	if n.is_class(cls):
		return n
	for c in n.get_children():
		var r := find_type(c, cls)
		if r:
			return r
	return null

## 讀 FBX（Without Skin）並掛到 parent 底下（隱藏）；回傳是否成功
func load_source(fbx_path: String, parent: Node) -> bool:
	var doc := FBXDocument.new()
	var st := FBXState.new()
	if doc.append_from_file(fbx_path, st) != OK:
		return false
	src_root = doc.generate_scene(st)
	src_root.visible = false
	parent.add_child(src_root)
	src_ap = find_type(src_root, "AnimationPlayer")
	src_sk = find_type(src_root, "Skeleton3D")
	anim_name = src_ap.get_animation_list()[0]
	return src_ap != null and src_sk != null

func bind(target: Skeleton3D) -> int:
	tgt_sk = target
	map.clear()
	var src_names := {}
	for i in src_sk.get_bone_count():
		src_names[norm(src_sk.get_bone_name(i))] = i
	for i in tgt_sk.get_bone_count():
		var k := norm(tgt_sk.get_bone_name(i))
		if src_names.has(k):
			map[i] = src_names[k]
	order.clear()
	for r in tgt_sk.get_parentless_bones():
		_walk(r)
	hips_t = _idx(tgt_sk, "hips")
	hips_s = _idx(src_sk, "hips")
	_build_corr()
	if hips_t >= 0 and hips_s >= 0:
		var ht := (tgt_sk.global_transform * tgt_sk.get_bone_global_rest(hips_t)).origin.y - tgt_sk.global_position.y
		var hs := (src_sk.global_transform * src_sk.get_bone_global_rest(hips_s)).origin.y - src_sk.global_position.y
		if absf(hs) > 0.0001:
			hip_ratio = ht / hs
	return map.size()

## Ken 的模型本身是「右手舉高」的姿勢，不是 T-pose。
## 先把目標每根骨頭轉到和來源靜止姿勢（T-pose）同方向，存成 corr（世界旋轉），動作再疊在 corr 上。
var corr := {}

static func _main_child(sk: Skeleton3D, b: int) -> int:
	var kids := sk.get_bone_children(b)
	if kids.is_empty():
		return -1
	if kids.size() == 1:
		return kids[0]
	for pref in ["neck", "spine", "handmiddle1", "middle1", "head"]:
		for c in kids:
			if norm(sk.get_bone_name(c)).contains(pref):
				return c
	return -1   # 分岔又找不到主幹（例如 Hips）→ 不對齊

func _build_corr() -> void:
	corr.clear()
	var tw := tgt_sk.global_transform.basis.orthonormalized()
	var sw := src_sk.global_transform.basis.orthonormalized()
	for b in order:
		var parent := tgt_sk.get_bone_parent(b)
		var p_world: Basis = tw if parent < 0 else corr[parent]
		var b0 := (p_world * tgt_sk.get_bone_rest(b).basis.orthonormalized()).orthonormalized()
		var c := _main_child(tgt_sk, b)
		if map.has(b) and c >= 0 and map.has(c) and norm(tgt_sk.get_bone_name(b)) != "hips":
			var s: int = map[b]
			var sc: int = map[c]
			var dt := (b0 * tgt_sk.get_bone_rest(c).origin).normalized()
			var s_world := (sw * src_sk.get_bone_global_rest(s).basis.orthonormalized()).orthonormalized()
			var ds := (s_world * src_sk.get_bone_rest(sc).origin).normalized()
			if dt.length() > 0.5 and ds.length() > 0.5 and dt.dot(ds) < 0.99999:
				var axis := dt.cross(ds)
				if axis.length() < 1e-6:
					axis = dt.cross(Vector3.UP if absf(dt.y) < 0.9 else Vector3.RIGHT)
				var q := Quaternion(axis.normalized(), dt.angle_to(ds))
				b0 = (Basis(q) * b0).orthonormalized()
		corr[b] = b0

func _walk(b: int) -> void:
	order.append(b)
	for c in tgt_sk.get_bone_children(b):
		_walk(c)

static func _idx(sk: Skeleton3D, key: String) -> int:
	for i in sk.get_bone_count():
		if norm(sk.get_bone_name(i)) == key:
			return i
	return -1

func length() -> float:
	return src_ap.get_animation(anim_name).length

## 把來源動畫跳到時間 t，並把姿勢套到目標骨架
func apply_at(t: float) -> void:
	src_ap.play(anim_name)
	src_ap.seek(t, true)
	src_ap.pause()
	var sw := src_sk.global_transform.basis.orthonormalized()
	var tw := tgt_sk.global_transform.basis.orthonormalized()
	var tw_inv := tw.inverse()
	var tgt_world := {}   # 目標骨 idx → 世界旋轉 Basis（只含旋轉）
	for b in order:
		var parent := tgt_sk.get_bone_parent(b)
		var p_world: Basis
		if parent < 0:
			p_world = tw
		elif tgt_world.has(parent):
			p_world = tgt_world[parent]
		else:
			p_world = tw * tgt_sk.get_bone_global_rest(parent).basis.orthonormalized()
		var rest_world: Basis = corr[b]
		var world: Basis
		if map.has(b):
			var s: int = map[b]
			var s_rest := sw * src_sk.get_bone_global_rest(s).basis.orthonormalized()
			var s_pose := sw * src_sk.get_bone_global_pose(s).basis.orthonormalized()
			var delta := (s_pose * s_rest.inverse()).orthonormalized()
			world = (delta * rest_world).orthonormalized()
		else:
			world = (p_world * tgt_sk.get_bone_rest(b).basis.orthonormalized()).orthonormalized()
		tgt_world[b] = world
		var local := (p_world.inverse() * world).orthonormalized()
		tgt_sk.set_bone_pose_rotation(b, local.get_rotation_quaternion())
	if hips_t >= 0 and hips_s >= 0:
		var s_off_world := sw * (src_sk.get_bone_global_pose(hips_s).origin - src_sk.get_bone_global_rest(hips_s).origin) * src_sk.global_transform.basis.get_scale()
		var off_sk := tw_inv * s_off_world * hip_ratio / tgt_sk.global_transform.basis.get_scale()
		var parent := tgt_sk.get_bone_parent(hips_t)
		var off_local := off_sk
		if parent >= 0:
			off_local = tgt_sk.get_bone_global_rest(parent).basis.inverse() * off_sk
		tgt_sk.set_bone_pose_position(hips_t, tgt_sk.get_bone_rest(hips_t).origin + off_local)

## 烘成目標骨架用的 Animation（30 fps），track 路徑相對 AnimationPlayer 的 root
func bake(skel_path: String, fps := 30.0, loop := true) -> Animation:
	var a := Animation.new()
	var L := length()
	a.length = L
	a.loop_mode = Animation.LOOP_LINEAR if loop else Animation.LOOP_NONE
	var tr := {}
	for b in order:
		var ti := a.add_track(Animation.TYPE_ROTATION_3D)
		a.track_set_path(ti, NodePath("%s:%s" % [skel_path, tgt_sk.get_bone_name(b)]))
		tr[b] = ti
	var hp := -1
	if hips_t >= 0:
		hp = a.add_track(Animation.TYPE_POSITION_3D)
		a.track_set_path(hp, NodePath("%s:%s" % [skel_path, tgt_sk.get_bone_name(hips_t)]))
	var n := int(ceil(L * fps))
	for f in n + 1:
		var t := minf(f / fps, L)
		apply_at(t)
		for b in order:
			a.rotation_track_insert_key(tr[b], t, tgt_sk.get_bone_pose_rotation(b))
		if hp >= 0:
			a.position_track_insert_key(hp, t, tgt_sk.get_bone_pose_position(hips_t))
	return a
