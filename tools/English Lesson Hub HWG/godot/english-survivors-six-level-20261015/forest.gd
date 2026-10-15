extends Node2D
const QUESTION_SECONDS = [15.0,17.0,19.0,21.0,23.0,25.0]
## Academic results and equipment grants arrive from the authenticated host.
## This scene owns only combat, rendering, and non-academic game telemetry.
var arena: Texture2D = preload("res://assets/arena.png")
var biomes: Texture2D = preload("res://assets/biomes.png")
var castle: Texture2D = preload("res://assets/castle.png")
var people: Texture2D = preload("res://assets/characters.png")
var props: Texture2D = preload("res://assets/props.png")
var equipment: Texture2D = preload("res://assets/equipment.png")
var item_ids = ["sunbeam","leaf-shield","swift-boots","orbit-star","frost-bell","lightning-feather","healing-bloom","dawn-wings"]
var power = [0.0,0.0,0.0,0.0,0.0,0.0,0.0,0.0]
var hero = Vector2(480,330)
var hp = 8.0
var enemies: Array = []
var shots: Array = []
var sparks: Array = []
var bolts: Array = []
var host: Dictionary = {}
var phase = "playing"
var level = 1
var question_index = 0
var run_id = ""
var recovery_id = 0
var defeated = 0
var seconds = 0.0
var wave = 0.0
var question_interval = 15.0
var clock = 0.0
var spawn_clock = 0.0
var fire_clock = 0.0
var orbit_clock = 0.0
var heal_clock = 8.0
var frost_sound_clock = 0.0
var dash_clock = 0.0
var dash_time = 0.0
var bridge_clock = 0.0
var hurt = 0.0
var waiting = false
var low = false
var reduced = false
var slow_seconds = 0.0
var mean_frame = 0.0167
var native_label: Label
var screenshot_at = -1.0
var screenshot_path = ""

func _ready() -> void:
	if OS.has_feature("web"):
		event({"type":"ready"})
	else:
		native_label=Label.new()
		native_label.position=Vector2(24,20)
		native_label.add_theme_font_size_override("font_size",18)
		add_child(native_label)
		for arg in OS.get_cmdline_user_args():
			if arg.begins_with("--review-level="):
				level=clampi(int(arg.trim_prefix("--review-level=")),1,6)
				for i in range(mini(level+2,8)):power[i]=4
			if arg.begins_with("--capture="):
				screenshot_at=3.0
				native_label.visible=false
				screenshot_path=arg.trim_prefix("--capture=")
	set_process(true)

func event(data: Dictionary) -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.emitSurvivorEvent("+JSON.stringify(data)+")")

func read_host() -> void:
	if not OS.has_feature("web"): return
	var value=JSON.parse_string(str(JavaScriptBridge.eval("JSON.stringify(window.SurvivorsHost||{})")))
	if not value is Dictionary: return
	host=value
	phase=str(host.get("phase","paused"))
	reduced=bool(host.get("reduced",false))
	var quality=str(host.get("quality","auto"))
	if quality=="low": low=true
	elif quality=="high": low=false
	else:
		var mobile=bool(JavaScriptBridge.eval("/iPad|iPhone|Android/.test(navigator.userAgent)||(navigator.maxTouchPoints>1&&/Mac/.test(navigator.platform))"))
		low=mobile or slow_seconds>3.0
	Engine.max_fps=(30 if low else 60) if phase=="playing" else 10
	var incoming_id=str(host.get("id",""))
	var game: Dictionary=host.get("game",{})
	if incoming_id!=run_id:
		run_id=incoming_id
		hero=Vector2(float(game.get("x",480)),float(game.get("y",330)))
		hp=float(game.get("hp",8))
		defeated=int(game.get("defeated",0))
		seconds=float(game.get("seconds",0))
		recovery_id=int(game.get("recoveries",0))
		enemies.clear();shots.clear();sparks.clear()
	var new_index=int(host.get("index",0))
	var new_level=clampi(int(host.get("level",1)),1,6)
	question_interval=clampf(float(host.get("questionSeconds",QUESTION_SECONDS[new_level-1])),15.0,25.0)
	if new_index!=question_index or new_level!=level:
		question_index=new_index
		wave=0;waiting=false;enemies.clear();shots.clear();bolts.clear()
		hp=minf(8,hp+2)
		if new_level!=level:
			level=new_level;hp=8;hero=Vector2(480,330)
	if int(game.get("recoveries",0))!=recovery_id:
		recovery_id=int(game.get("recoveries",0))
		hp=8;hero=Vector2(480,330);enemies.clear();shots.clear();hurt=2;waiting=false;wave=0
	for i in range(8):power[i]=0
	var awards: Dictionary=host.get("awards",{})
	for award in awards.values():
		var index=item_ids.find(str(award.get("itemId","")))
		if index>=0:power[index]+=clampf(float(award.get("points",0)),0,4)

func _process(dt: float) -> void:
	clock+=dt
	# Paused screens use 10 FPS; exclude that deliberate limit from auto quality.
	if phase=="playing":mean_frame=lerpf(mean_frame,dt,0.025)
	if phase=="playing" and mean_frame>0.026:slow_seconds+=minf(dt,0.1)
	bridge_clock+=dt
	if bridge_clock>=0.1:read_host();bridge_clock=0
	var step=minf(dt,0.05)
	if phase=="playing" and not waiting:combat(step)
	if phase=="playing":
		for p in sparks:p.pos+=p.vel*step;p.life-=step
		for b in bolts:b.life-=step
		sparks=sparks.filter(func(p):return p.life>0)
		bolts=bolts.filter(func(b):return b.life>0)
	if int(clock*4)!=int((clock-dt)*4):
		event({"type":"stats","fps":roundi(1.0/maxf(mean_frame,0.001)),"quality":"low" if low else "high","enemies":enemies.size(),"level":level,"game":{"x":hero.x,"y":hero.y,"hp":hp,"defeated":defeated,"seconds":seconds}})
	if native_label:native_label.text="FOREST OF WORDS | STAGE %d | %d FPS\nWASD / Arrows: move. Shift: wings dash. Web host supplies English challenges.\nHP %d / 8    Defeated %d" % [level,roundi(1/maxf(mean_frame,0.001)),hp,defeated]
	if screenshot_at>0 and clock>=screenshot_at:
		screenshot_at=-1
		await RenderingServer.frame_post_draw
		var err=get_viewport().get_texture().get_image().save_png(screenshot_path)
		print("CAPTURE_RESULT ",err)
		get_tree().quit()
	queue_redraw()

func combat(dt: float) -> void:
	seconds+=dt;wave+=dt;hurt=maxf(0,hurt-dt);dash_clock=maxf(0,dash_clock-dt);dash_time=maxf(0,dash_time-dt);frost_sound_clock=maxf(0,frost_sound_clock-dt)
	var control: Dictionary=host.get("input",{})
	var direction=Vector2(float(control.get("x",0)),float(control.get("y",0)))
	direction+=Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP)))
	if power[7]>0 and dash_clock<=0 and (bool(control.get("dash",false)) or Input.is_physical_key_pressed(KEY_SHIFT)):
		dash_time=0.65;dash_clock=maxf(6,14-sqrt(power[7]));hurt=maxf(hurt,0.9);burst(hero)
		event({"type":"sound","kind":"dash","x":hero.x})
	hero+=direction.normalized()*(150+4*sqrt(power[2]))*(2.3 if dash_time>0 else 1.0)*dt
	hero=hero.clamp(Vector2(155,115),Vector2(805,535))
	spawn_clock-=dt;fire_clock-=dt;orbit_clock-=dt;heal_clock-=dt
	if spawn_clock<=0 and enemies.size()<(12 if low else 20):
		var angle=randf()*TAU
		var point=Vector2(480,320)+Vector2(cos(angle)*345,sin(angle)*215)
		enemies.append({"pos":point,"hp":2.0*(1+(level-1)*0.05),"kind":randi()%3,"seed":randf()*10})
		spawn_clock=maxf(0.62,0.92-(level-1)*0.035)
	if fire_clock<=0 and not enemies.is_empty():
		var nearest=enemies[0]
		for enemy in enemies:
			if hero.distance_squared_to(enemy.pos)<hero.distance_squared_to(nearest.pos):nearest=enemy
		var aim=(nearest.pos-hero).normalized()
		shots.append({"pos":hero+Vector2(10,-15),"vel":aim*430,"life":2.0})
		fire_clock=maxf(0.28,0.72-0.04*sqrt(power[0]))
		event({"type":"sound","kind":"shot","x":hero.x})
	for enemy in enemies:
		var slow=0.65 if power[4]>0 and hero.distance_to(enemy.pos)<90+3*sqrt(power[4]) else 1.0
		if slow<1.0 and frost_sound_clock<=0:
			frost_sound_clock=3.5
			event({"type":"sound","kind":"frost","x":enemy.pos.x})
		enemy.pos+=(hero-enemy.pos).normalized()*27*(1+(level-1)*0.02)*slow*dt
		if hero.distance_to(enemy.pos)<28 and hurt<=0:
			hp=maxf(0,hp-(1-minf(0.55,sqrt(power[1])*0.06)));hurt=1.5
			enemy.pos+=(enemy.pos-hero).normalized()*45
			event({"type":"sound","kind":"shield" if power[1]>0 else "hurt","x":hero.x})
	var orbit_count=mini(3,ceili(sqrt(power[3])))
	if orbit_count>0 and orbit_clock<=0:
		for i in range(orbit_count):
			var point=hero+Vector2.from_angle(clock*2.2+i*TAU/orbit_count)*65
			for enemy in enemies:
				if enemy.hp>0 and point.distance_to(enemy.pos)<30:
					damage(enemy,0.7+0.08*sqrt(power[3]))
					event({"type":"sound","kind":"orbit","x":point.x})
		orbit_clock=0.45
	if power[6]>0 and heal_clock<=0:
		if hp<8:event({"type":"sound","kind":"heal","x":hero.x})
		hp=minf(8,hp+0.5+sqrt(power[6])*0.08);heal_clock=maxf(8,18-sqrt(power[6]));burst(hero)
	for shot in shots:
		shot.pos+=shot.vel*dt;shot.life-=dt
		for enemy in enemies:
			if enemy.hp>0 and shot.life>0 and shot.pos.distance_to(enemy.pos)<25:
				damage(enemy,1+0.16*sqrt(power[0]));shot.life=0
				if power[5]>0:
					var count=0
					for second in enemies:
						if second!=enemy and second.hp>0 and enemy.pos.distance_to(second.pos)<130 and count<2:
							damage(second,0.45+sqrt(power[5])*0.07);count+=1
							if count==1:event({"type":"sound","kind":"lightning","x":enemy.pos.x})
							if bolts.size()<8:bolts.append({"a":enemy.pos,"b":second.pos,"life":0.2})
	enemies=enemies.filter(func(e):return e.hp>0)
	shots=shots.filter(func(s):return s.life>0)
	if hp<=0:waiting=true;event({"type":"recovery"})
	if wave>=question_interval and OS.has_feature("web"):waiting=true;event({"type":"question"});wave=0

func damage(enemy: Dictionary,amount: float) -> void:
	if enemy.hp<=0:return
	enemy.hp-=amount;burst(enemy.pos)
	if enemy.hp<=0:
		defeated+=1
		event({"type":"sound","kind":"defeat","x":enemy.pos.x})
	else:event({"type":"sound","kind":"impact","x":enemy.pos.x})

func burst(point: Vector2) -> void:
	for i in range(3 if low or reduced else 9):
		if sparks.size()>=90:break
		sparks.append({"pos":point,"vel":Vector2.from_angle(randf()*TAU)*randf_range(25,90),"life":0.6})

func cell(texture: Texture2D,index: int,columns: int=2,rows: int=2) -> Rect2:
	var size=texture.get_size()/Vector2(columns,rows)
	return Rect2(Vector2(index%columns,floori(float(index)/columns))*size,size)

func sprite(texture: Texture2D,index: int,at: Vector2,size: Vector2,tint: Color=Color.WHITE,columns: int=2,rows: int=2) -> void:
	draw_texture_rect_region(texture,Rect2(at-size*0.5,size),cell(texture,index,columns,rows),tint)

func _draw() -> void:
	if level==1:draw_texture_rect(arena,Rect2(0,0,960,640),false)
	elif level==6:draw_texture_rect(castle,Rect2(0,0,960,640),false)
	else:draw_texture_rect_region(biomes,Rect2(0,0,960,640),cell(biomes,level-2))
	var pulse=1.0 if reduced else 1.0+sin(clock*2)*0.025
	sprite(props,0,Vector2(770,150),Vector2(130,145)*pulse,Color(1,1,1,0.7))
	sprite(props,1,Vector2(220,165),Vector2(88,88))
	if power[1]>0:sprite(props,3,hero+Vector2(0,8),Vector2(100,100),Color(0.8,1,0.9,0.30))
	if power[4]>0:
		draw_arc(hero,90+3*sqrt(power[4]),0,TAU,48,Color(0.5,0.85,1,0.28),2,true)
	if power[7]>0 and dash_time>0:sprite(equipment,7,hero+Vector2(0,-20),Vector2(155,135),Color(1,1,1,0.7),4,2)
	var figures=enemies.duplicate()
	figures.append({"pos":hero,"kind":-1,"seed":0})
	figures.sort_custom(func(a,b):return a.pos.y<b.pos.y)
	for figure in figures:
		var bob=0.0 if reduced or phase!="playing" else sin(clock*(7 if figure.kind<0 else 4)+figure.seed)*2.3
		if figure.kind<0:
			var tint=Color(1,0.65,0.5,0.65) if hurt>0 and int(clock*10)%2 else Color.WHITE
			sprite(people,0,figure.pos+Vector2(0,-18+bob),Vector2(97,97),tint)
			if power[0]>0:sprite(equipment,0,hero+Vector2(30,-20),Vector2(35,60),Color.WHITE,4,2)
		else:sprite(people,figure.kind+1,figure.pos+Vector2(0,-8+bob),Vector2(65,65))
	var orbit_count=mini(3,ceili(sqrt(power[3])))
	for i in range(orbit_count):sprite(equipment,3,hero+Vector2.from_angle(clock*2.2+i*TAU/orbit_count)*65,Vector2(42,46),Color.WHITE,4,2)
	for shot in shots:sprite(props,2,shot.pos,Vector2(35,35))
	for spark in sparks:sprite(props,2,spark.pos,Vector2(16,16)*spark.life,Color(1,1,1,spark.life))
	for bolt in bolts:draw_line(bolt.a,bolt.b,Color(0.8,0.8,1,bolt.life*4),3,true)
	if not low and not reduced:
		for i in range(18):
			var point=Vector2(170+fmod(i*79.0+clock*3,620),115+fmod(i*97.0+sin(clock+i)*12,410))
			sprite(props,2,point,Vector2(8,8),Color(1,1,1,0.5+sin(clock+i)*0.2))
