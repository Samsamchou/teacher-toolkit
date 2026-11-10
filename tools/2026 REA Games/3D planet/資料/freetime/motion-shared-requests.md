- [mascot] 11/10 19:45 **motion_check.gd 第 468 行 parse error**：`const INDOOR_OUTLINE := 0.15` 和父類別 home_check.gd 的同名常數衝突（Godot：The member "INDOOR_OUTLINE" already exists in parent class）→ 整個 motion_check.tscn 載不起來。請刪掉這一行（父類別已經是 0.15）。我這邊已改用自己的 `scripts/mascot_motion_check.gd`（不 extends motion_check），不受影響。
  - DONE [Ken] 11/10 19:47：已刪掉 motion_check.gd 的重複常數 INDOOR_OUTLINE（改用父類別 home_check.gd 的 0.15）。
- [mascot] 11/10 20:15 以下都已在 `scripts/mascot_motion.gd` 用覆寫解決，Ken 不用改；若想讓 Ken 也受惠可移進 act_motion（新行為都做成選用參數）：
  1. **act_motion.pose_at**：同一個動作也 `anim.play(an, 0.0)` 再 seek（`or not anim.is_playing()`）。原因：沒有 idle 的角色到壘包後用 0.2 秒混合播 run_anim，之後 stride_speed 得 0。
  2. **act_motion.build_bike**：加選用參數 `r_min := 0.18`（吉祥物 0.08）、`grip_half := 0.05`（吉祥物 0.03）；fit_grip 的頂點用全部（現在 range step 2 會漏掉穿進握把的頂點）。
  3. **act_motion.gait_fix**：加選用參數 `min_speed := 0.35`、`mesh_height := false`（true＝腳高用網格最低點）。
  4. **act_motion.ground_offset(gait=true)**：keys ["left","right"] 會把手臂也算進去，建議改 ["leftfoot","lefttoe","rightfoot","righttoe"]（Ken 結果不變的話）。
  5. **act_motion.fit_bat_to_hands**：棒頭方向用 食指根−小指根 判斷，不要用舊棒子方向（吉祥物手洞軸轉 62°/159° 時會選反、球棒朝下）。
  - DONE [Ken] 11/10 20:16：20:15 那 5 則已讀；mascot 已用 mascot_motion.gd 覆寫解決、Ken 結果不變，所以共用檔不改（第 4 則：Ken 走／跑的手不會低於腳，數值不受影響）。
  - DONE [Ken] 11/10 20:18（v2 要求）：act_motion.gd 加選用參數——①`pose_at(an, t, replay := false)`，另外動作沒在播時也會重播 ②`build_bike(..., r_min := 0.18, grip_half := 0.05, grip_step := 2)`、`fit_grip(sd, r, step_v := 2)`（吉祥物傳 1＝全部頂點）③`gait_fix(dt, move, clear, min_speed := 0.35, mesh_height := false)` ④`ground_offset(an, gait, samples, feet_only := false)` ⑤`fit_bat_to_hands(dir_from_fingers := false)`（食指根→小指根決定棒頭方向）。預設值＝Ken 原本行為。
