extends RefCounted
## Battle data for the 10 HWG7 story battles ("Ken and the World Map Mix-Up").
## Learning scores never live here; only combat parameters. Seconds = teacher-approved battle-plan.json.
const NAMES = ["WELCOME HALL", "JAPANESE GARDEN", "NIGHT MARKET", "GARDEN CITY", "CITY CROSSWALK",
	"BUS STATION", "RAINY STREET", "METRO STATION", "MAP HALL", "MAP HALL"]
const HINTS = ["Watch the carousel arm. Step over it when it glows!", "Koi ponds slow you down. Keep moving!",
	"Lantern rings spread out. Find the gap!", "Sprinklers splash on the red circles. Step out!",
	"Two crossing gates! Stay between them.", "Bus smoke and wind push you.",
	"Deep rain puddles hurt. Do not stand in them.", "Suitcases bounce off the walls. Dodge!",
	"Break the paper shield, then hit Map Gobbler!", "Map Gobbler is angry! Finish it!"]
const SECONDS = [20.0, 21.0, 23.0, 24.0, 26.0, 27.0, 29.0, 30.0, 67.0, 67.0]
## mechanism kind per battle, using the HWG5 engine's kinds:
## 1 one sweeping arm, 2 slowing puddles, 3 rings, 4 falling hazards, 5 two arms, 6 wind + clouds,
## 7 damaging pools, 8 bouncing objects, 9 strong wind, 10 boss phase 1, 11 boss phase 2
const KIND = [1, 2, 3, 4, 5, 6, 7, 8, 10, 11]
## arena atlas + cell, enemy atlas cells used in this battle
const ARENA = [[0,0],[0,1],[0,2],[0,3],[1,0],[1,1],[1,2],[1,3],[2,0],[2,1]]
const FOES = [[[0,0]], [[0,3]], [[0,1]], [[0,2]], [[1,0]], [[0,1],[1,0]], [[1,1],[1,2]], [[1,3]], [[0,0],[0,2]], [[0,0],[0,3]]]
## mechanism sprites: [atlas (0 = GAME-08, 1 = GAME-09, 2 = GAME-10), cell]
const HUB = {1: [0, 0], 5: [1, 0]}      # carousel hub / crossing-gate post
const PUDDLE = [0, 1]                  # koi pond
const RING_SOURCE = [0, 2]             # glowing lantern
const DROP = [0, 3]                    # sprinkler
const CLOUD = [1, 1]                   # bus exhaust cloud
const WIND = [1, 2]
const POOL = [1, 3]                    # rain puddle
const BOUNCER = [2, 0]                 # suitcase
## reward item sprites: [atlas (0 = GAME-06, 1 = GAME-07), cell]
const BOOMERANG = [0, 0]
const UMBRELLA = [1, 2]
const BOSS1 = 9
const BOSS2 = 10
const BOSS_MAX = 200.0
static func valid(n: int) -> int: return clampi(n, 1, SECONDS.size())
static func seconds(n: int) -> float: return SECONDS[valid(n) - 1]
static func kind(n: int) -> int: return KIND[valid(n) - 1]
static func is_boss(n: int) -> bool: return valid(n) >= BOSS1
static func enemy_hp(n: int) -> float: return 2.0 + (valid(n) - 1) * 0.15
static func enemy_speed(n: int) -> float: return 28.0 + (valid(n) - 1) * 2.0
static func spawn_seconds(n: int) -> float: return 1.25 if is_boss(n) else 1.0 - (valid(n) - 1) * 0.03
