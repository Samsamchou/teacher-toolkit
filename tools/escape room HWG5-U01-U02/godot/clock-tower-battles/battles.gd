extends RefCounted
## Battle data for the 11 story battles. Learning scores never live here; only combat parameters.
const NAMES = ["CLOCK TOWER PLAZA", "ART ROOM", "MUSIC HALL", "MATH LAB", "LONG HALL", "LANGUAGE ROOM",
	"SCIENCE LAB", "GYM AND MAP ROOM", "ROOFTOP", "CLOCK CORE", "CLOCK CORE"]
const HINTS = ["Watch the clock hand. Step over it when it glows!", "Paint puddles slow you down. Keep moving!",
	"Sound rings spread out. Find the gap!", "Blocks fall on the red circles. Step out!",
	"Two clock hands! Stay between them.", "Ink clouds and paper winds push you.",
	"Bubbling pools hurt. Do not stand in them.", "Balls bounce off the walls. Dodge!",
	"Strong winds on the rooftop. Hold your ground!", "Break the gear shield, then hit Time Muncher!",
	"Time Muncher is angry! Finish it!"]
const SECONDS = [20.0, 21.0, 22.0, 23.0, 24.0, 25.0, 26.0, 28.0, 30.0, 67.0, 67.0]
## arena atlas + cell, enemy atlas cells used in this battle
const ARENA = [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1],[2,2]]
const FOES = [[[0,0],[0,1]], [[0,2]], [[0,3]], [[1,0]], [[0,1],[0,0]], [[1,1]], [[1,2]], [[1,3]], [[0,3],[0,0]], [[0,0]], [[0,0],[0,1]]]
const BOSS_MAX = 200.0
static func valid(n: int) -> int: return clampi(n, 1, 11)
static func seconds(n: int) -> float: return SECONDS[valid(n) - 1]
static func is_boss(n: int) -> bool: return valid(n) >= 10
static func enemy_hp(n: int) -> float: return 2.0 + (valid(n) - 1) * 0.15
static func enemy_speed(n: int) -> float: return 28.0 + (valid(n) - 1) * 2.0
static func spawn_seconds(n: int) -> float: return 1.25 if is_boss(n) else 1.0 - (valid(n) - 1) * 0.03
