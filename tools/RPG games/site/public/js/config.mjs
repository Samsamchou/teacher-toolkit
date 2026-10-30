// 遊戲設定：角色、怪物、數值。換主題時只改這裡和 assets/。
export const STUDENT_ID = /^[3-6]\d{2}(0[1-9]|[12]\d|30)$/u;   // 年級＋班級(2)＋座號(01–30)

export const HERO = {
  name: "Ken",
  sprite: "assets/sprites/hero_ken.webp",
  rows: { idle: 0, attack: 1, hurt: 2, win: 3 },
  maxHp: 100,
};

// 三段：每隻怪物負責一段題目。怪物 HP＝題數 × 10；答對傷害 10＋連擊加成，大招 2.5 倍。
// 打得夠快也要撐到該段最後一題才倒下（保留 1 HP），所以題目一定全部做完。
export const MONSTERS = [
  { name: "齒輪小怪", sprite: "assets/sprites/monster_gear.webp", atk: 12, filter: "", scale: 1 },
  { name: "發條兔兔", sprite: "assets/sprites/monster_windup.webp", atk: 14, filter: "", scale: 1.05 },
  { name: "時間吞噬者", sprite: "assets/sprites/boss_timemuncher.webp", atk: 18, filter: "", scale: 1.3, boss: true },
];
export const MONSTER_ROWS = { idle: 0, attack: 1, hurt: 2, defeat: 3 };

export const BALANCE = {
  hpPerQuestion: 10,
  baseDamage: 10,
  comboBonus: 2,      // 連擊每多 1 題 +2
  comboCap: 8,        // 加成最多 +8
  ultMultiplier: 2.5,
  energyPerCorrect: 35,
};

export const ARENA_BG = "assets/bg/arena_clocktower.webp";
