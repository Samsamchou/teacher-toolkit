# Mixamo 動作檔（2026-11-09 下載）

- 來源：mixamo.com（老師的 Adobe 帳號），角色 X Bot，FBX 7.4 binary（fbx7_2019）、Without Skin、30 fps、keyframe 不精簡。
- 授權：Mixamo 動作可用於個人與商業專案（含遊戲），但不得單獨散布原始檔 → **FBX 不入庫**（`.gitignore` 有 `*.fbx`），只留 GDrive。
- 骨架：mixamorig 骨名，和 ken_rigged／shuiling_rigged／zunbo_rigged 相同。

| 檔名 | Mixamo 名稱 | 用在 | 長度 | 備註 |
|---|---|---|---|---|
| mx_jogging.fbx | Jogging | go jogging | 2.57 s | In Place |
| mx_sitting_laughing.fbx | Sitting Laughing | watch TV | 8.33 s | 坐姿 |
| mx_writing.fbx | Writing（Male Writing While Seated） | study English | 5.00 s | 坐姿 |
| mx_typing.fbx | Typing | surf the Internet、play online games | 16.47 s | 坐姿 |
| mx_dribble.fbx | Dribble | play basketball | 2.10 s | |
| mx_baseball_hit.fbx | Baseball Hit | play baseball | 2.90 s | |
| mx_kneeling_idle.fbx | Kneeling Idle | go camping | 4.27 s | |
| mx_plant_a_plant.fbx | Plant A Plant | go camping（搭帳篷） | 7.57 s | |
| mx_driving.fbx | Driving | ride a bike（坐姿＋程式腳踏車） | 5.00 s | |
| mx_sitting_idle.fbx | Sitting Idle | listen to music（＋耳機道具） | 4.30 s | |
| mx_cheering.fbx | Cheering | 結果慶祝 | 2.90 s | |

- play the recorder：Mixamo 沒有 → 程式擺手臂姿勢＋直笛道具。
- 下載坑：Chrome 會擋同一網站連續下載；被擋的檔會變成 `<uuid>.tmp`（內容完整），用 Godot `FBXDocument` 看臀部高度分辨坐姿／站姿再改名。
