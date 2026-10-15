extends SceneTree
var failed = 0
var checked = 0
func check(value: bool,label: String) -> void:
	checked+=1
	if not value:failed+=1;printerr("FAIL ",label)
func scene():
	var g=load("res://forest.gd").new()
	g.spawn_clock=100;g.fire_clock=100;g.orbit_clock=100;g.heal_clock=100
	return g
func enemy(at: Vector2) -> Dictionary:return {"pos":at,"hp":100.0,"kind":0,"seed":0.0}
func _initialize() -> void:
	# These are actual combat() executions with controlled inputs, not copied formulas.
	var g=scene()
	for n in range(1,7):
		g.level=n;g.enemies.clear();g.spawn_clock=0;g.combat(0)
		check(g.enemies.size()==1,"level spawns a foe")
		check(is_equal_approx(g.enemies[0].hp,2.0*(1+(n-1)*0.05)),"gentle level HP progression")
	g.free()
	var shot_damage=[];var intervals=[];var speeds=[];var protection=[]
	for points in range(1,5):
		g=scene();g.power[0]=points;g.enemies=[enemy(g.hero+Vector2(100,0))];g.fire_clock=0;g.combat(0);intervals.append(g.fire_clock)
		g.shots=[{"pos":g.enemies[0].pos,"vel":Vector2.ZERO,"life":1.0}];g.combat(0);shot_damage.append(100-g.enemies[0].hp);g.free()
		g=scene();g.power[2]=points;g.host={"input":{"x":1,"y":0}};var start=g.hero.x;g.combat(0.01);speeds.append(g.hero.x-start);g.free()
		g=scene();g.power[1]=points;g.enemies=[enemy(g.hero)];g.combat(0);protection.append(g.hp);g.free()
	for i in range(1,4):
		check(shot_damage[i]>shot_damage[i-1],"higher-quality sunbeam hits harder")
		check(intervals[i]<intervals[i-1],"higher-quality sunbeam fires faster")
		check(speeds[i]>speeds[i-1],"higher-quality boots move faster")
		check(protection[i]>protection[i-1],"higher-quality leaf shield absorbs more")
	g=scene();g.power[3]=4;g.enemies=[enemy(g.hero+Vector2(65,0))];g.orbit_clock=0;g.combat(0);check(g.enemies[0].hp<100,"orbit star damages nearby foe");g.free()
	var distances=[]
	for points in [0,4]:
		g=scene();g.power[4]=points;g.enemies=[enemy(g.hero+Vector2(60,0))];g.combat(0.1);distances.append(60-g.hero.distance_to(g.enemies[0].pos));g.free()
	check(distances[1]<distances[0],"frost bell slows a foe")
	g=scene();g.power[5]=4;g.enemies=[enemy(g.hero+Vector2(80,0)),enemy(g.hero+Vector2(120,0))];g.shots=[{"pos":g.enemies[0].pos,"vel":Vector2.ZERO,"life":1.0}];g.combat(0);check(g.enemies[1].hp<100,"lightning feather chains to second foe");g.free()
	g=scene();g.hp=4;g.power[6]=4;g.heal_clock=0;g.combat(0);check(g.hp>4&&g.hp<=8,"healing bloom restores health within cap");g.free()
	g=scene();g.power[7]=4;g.host={"input":{"x":1,"y":0,"dash":true}};var start=g.hero.x;g.combat(0.01);check(g.hero.x-start>speeds[3],"dawn wings dash faster than upgraded walking");check(g.hurt>0&&g.dash_clock>0,"dash has protection and cooldown");g.free()
	print(JSON.stringify({"suite":"six-level-real-combat","checks":checked,"failed":failed,"sunbeamDamageBasicToLegendary":shot_damage,"fireIntervalBasicToLegendary":intervals,"bootsMovementBasicToLegendary":speeds,"shieldHpAfterHitBasicToLegendary":protection}))
	quit(1 if failed else 0)
