---
rdq_version: 1
edition: chatgpt-app
task: 扇形車庫第2節ImageGen正式教材重製
domain: lesson
date: 2026-08-26
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 0
downstream: ershui-local-curriculum-builder + imagegen + skill-creator
---

# RDQ 需求規格：扇形車庫第2節ImageGen正式教材重製

## 一句話任務
以ImageGen主導重製〈扇形車庫〉第2節七類正式教材的學生版與教師答案版，精準覆排文字並統一使用Comic Relief英文字體，同時把規則寫入正式Skill。

## 已確認
- 對象為二水國小四年級；沿用已確認的七類教材、題目、答案、尺寸、份數、風格③及Production流程。
- 14頁的完整場景、角色、圖示、邊框與視覺構圖都由ImageGen生成；正式中英文與答案另外精準覆排，避免AI錯字。
- 視覺比例採約40%情境插畫＋60%題目／操作空間；同一位火車小偵探、同一種原創3D家庭動畫電影感。
- 所有英文單字、句型、英文答案及WHEN／WHAT／HOW等英文小標均使用真正的`ComicRelief-Regular.ttf`。
- 先製作「個人解密單」學生版＋教師答案版兩頁樣稿；教師確認後才生成其餘12頁。
- 學生版先生成；教師版以學生版為參考圖進行ImageGen編修，再覆排答案，兩版須逐頁對位。
- 明確授權直接覆寫目前14–17號正式教材成果；不覆寫正式Word、01–13號歷史成果、confirmed RDQ或歷史對話。
- 每頁最多生成兩次；第二次仍未通過即保留失敗輸出並停止，請教師決定。

## 已確認補充
- ImageGen母版一律避免生成可讀文字；若畫面誤生文字，先用ImageGen編修清除，再覆排正式文字。
- Comic Relief字型納入正式Skill資產前，先查核並記錄字型來源與授權；授權無法確認時不得擅自重新散布，改引用專案現有字型並回報。
- 兩頁樣稿獲得教師明確確認後，才視為正式批次生成授權；不把本規格確認解讀為略過樣稿關卡。

## 已採納建議
- 學生／教師版採參考圖衍生，鎖定構圖與角色一致性。
- ImageGen負責無字視覺母版，正式文字與答案精準覆排。
- Comic Relief字型、使用規則及來源紀錄納入正式Skill。
- 每頁兩次生成上限，失敗版留存並停止請示。
- QA涵蓋角色一致性、文字、字型、列印留白、灰階辨識及兩版對位。

## 本次不納入
- 不改已確認教材內容、歷史數字、英語句型、尺寸、份數或課堂流程。
- 不修改正式Word、舊教材草圖、舊版詳案或任何confirmed RDQ。
- 不commit、push、更新Obsidian、公開發布或部署。

## 一段式需求規格
在`G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui`中，以風格③原創3D家庭動畫電影感及同一位火車小偵探，使用ImageGen為〈扇形車庫〉第2節七類教材的學生版與教師答案版共14頁逐頁建立完整無字視覺母版，畫面約40%情境插畫與60%題目／操作空間；正式繁體中文、歷史數字、題目、答案與英文另行精準覆排，全部英文使用`ComicRelief-Regular.ttf`。先只重製個人解密單學生／教師兩頁，教師確認後再做其餘12頁；教師版以學生版為參考圖進行ImageGen編修並逐頁對位。每頁最多兩次生成，失敗版保留。確認後可覆寫14–17號正式教材，但必須保留正式Word、01–13號歷史成果、confirmed RDQ及歷史對話；完成後更新正式`ershui-local-curriculum-builder` Skill、查核字型來源／授權、同步安裝副本並執行內容、結構、彩色、灰階、列印與字型QA。

## 驗收條件
- [ ] 兩頁樣稿各有可追溯的ImageGen母版、精準覆排版本與學生／教師對位證據，並等待教師確認。
- [ ] 批次完成時14頁皆有ImageGen生成紀錄；所有文字、答案、1922／6與1933／12均讀回正確。
- [ ] 全部英文以實際Comic Relief檔案渲染，QA記錄字型檔SHA-256、來源／授權與使用範圍。
- [ ] 14–17號成果完成版本化讀回；正式Word、01–13號成果及既有confirmed RDQ保持未修改。
- [ ] 正式Skill來源與安裝副本一致，驗證工具通過；未執行Git／Obsidian同步或公開發布。
