# English Lesson Hub：完整六關正式版收工 / Closeout

時間：2026-10-16T22:34:23+08:00。正式入口：[Lesson Hub](https://lesson-hub-v03.web.app/lab)。

本次完整六關、三角色、後台串接與觸控修正已正式部署；Godot Games skill已建立及安裝。以下是最新接續狀態，早期handoff中的「本機候選／尚未部署」僅保留為歷史。

## 目前正式版本

- Firebase：hwg7teaching；Hosting：sites/lesson-hub-v03/versions/f1274706dc9b3bfe。
- liveV2：livev2-00018-vaq，ACTIVE／Ready，Cloud Run latestCreated／latestReady相同。只有指定Hosting及liveV2在本輪發布；部署前後其他12 Functions、預設Hosting、9課程與24原音檔保留。
- 三英雄技能、完整六關、15／17／19／21／23／25秒、3→8種道具、機關與雙階段Boss，學習作答／遊戲分頁，存檔續玩與教師明細／CSV。
- 練習一般題首次＋3次重試採最高分，答錯不扣分；拼字兩模式無限重試，測驗保留首次分；首次全對提交次數決定4／3／2／1級道具。Phonics36題全部答對100分，24原音檔保留。
- 方向鍵逐pointerId追蹤，Web宿主單一輸入來源，iframe鍵盤轉交；教師已確認左右移動正常。實體多指／Safari／喇叭不是自動檢查已驗收。

## 保存位置與證據

- 完整Godot：godot/forest-of-words-six-heroes-20261016/project.godot。
- 製作手冊、製作流程、移動修正、原始素材與兩種ZIP都在上述資料夾；Web42檔／28,287,302 bytes，Source99檔／41,882,250 bytes，收工SHA核對通過。
- Skill：C:/Users/User/.codex/skills/godot-games/SKILL.md；專案skills/godot-games；skills/Godot-Games-skill-20261016.zip。11檔三份逐檔一致；可用「使用 $godot-games，接續這款遊戲……」。
- 發布：rdq/DEPLOYMENT-godot-six-heroes-20261016.md；qa/godot-six-production-20261016/final-readback.json。
- 發布檢查：301網站測試、15模擬器、209正式資源（189全檔SHA／20傳輸SHA與長度）、42後台來源、470來源。正式Source ZIP完整下載與CRC通過，重新匯入真正Godot後72關卡＋29移動檢查通過。
- 收工只再讀回9公開資源、3入口、Hosting／後台Ready與下載包／skill，不重跑或冒稱重跑完整測試。證據：qa/godot-six-production-20261016/closeout/。

## 同步狀態

| 位置 | 實際結果 |
|---|---|
| GDrive | 本專案交接、程式、素材、下載包與QA存於既有掛載路徑並讀回；Google Drive服務端同步未獨立驗證。 |
| Obsidian | 指定secondbrain/teacher-toolkit/工作筆記.md四區段新增本案進度、紀錄、下一步與踩坑；原文及frontmatter保留並讀回。 |
| GitHub | 本輪未stage／commit／push。main遠端045337f1a78bdd9a289e3f2f77b38ebf63d298dd，先前核准326檔已完成；本次新增清單尚未核定。 |

共用本機main：88f2fdba89a4fdde3d7c2f3a319fa28c5268f393；暫存0檔。收工盤點全repo 27536筆（--untracked-files=all），其中本專案2498筆，其餘25038筆；包含舊HEAD已落後遠端的差異，不能當成本次新增數。Git index與既有鎖保留。對本機舊HEAD的diff --check回傳2，三個既有檔尾空白提示詳見git-before.json，未改原程式以消除此舊提示。

## 下次接續

1. 教師本人重新整理／登入正式站，以現有Phonics題組建立新分配，使用gameVersion2。舊分配維持相容，這輪未建立正式測試分配或寫入學生答案。
2. 實體iPad／Safari與校網確認三角色、六關、雙指與快速換向、切題／失焦、續玩、學習分數／道具分級、Boss戰果、教師排行與CSV、慶祝音量。
3. 若要GitHub同步新版，先列出相對現有遠端的專案專屬檔案並確認新範圍；保留其他工作與既有鎖，不重複推送先前326檔。

本次收工只保存與讀回，電腦、應用程式及其他執行中工作維持運作。沒有新部署、生圖、付費生成或資料庫寫入。
