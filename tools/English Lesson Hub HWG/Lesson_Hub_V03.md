# English Lesson Hub V03 — Codex Website Specification

**文件用途：** 提供 Codex 直接進行 Prototype / Frontend / Data Model 建置  
**版本：** V03  
**核心定位：** 一站式英語教學駕駛艙（Teacher-configurable Lesson Cockpit）  
**主要使用者：** 國小英語教師、學生  
**主要裝置：** 教師桌機、教室大螢幕／觸控螢幕、學生 iPad／平板  
**核心原則：** 教師新增、刪除、更換教材或調整教學流程時，不得需要修改程式碼。

---

## 0. V03 核心產品目標

English Lesson Hub V03 必須讓教師完成以下完整工作流：

`Teacher Studio → 選擇 / 建立 Lesson → 編輯 Steps → 更換教材 → 儲存 → Start Lesson → Previous / Next → Finish Lesson → 查看 Results`

V03 的重點不是「把很多教材放在同一頁」，而是把一堂英文課變成可編排、可播放、可互動、可記錄結果的 Lesson Flow。

### V03 必須達成的六個產品原則

1. **No-code lesson editing**：教師更換教材、增刪 Step、重新排序，不需改程式。
2. **Start Lesson first**：教師第二天上課只要選擇 Lesson，按下 Start Lesson。
3. **Next-driven teaching**：上課主要以 Previous / Next 推進整堂課。
4. **Teacher / Student separation**：教師工具與學生閱讀介面清楚分離。
5. **Responsive classroom UI**：桌機、16:9 教室螢幕與平板皆能穩定操作。
6. **Native formative assessment**：Vocabulary Quiz 為 Lesson Hub 原生功能，並保存 Student ID 與個別結果。

---

# 1. V03 預設 Lesson Cards

Teacher Studio 首頁第一版預設顯示 8 張 Lesson Cards：

### HWG5
- HWG5 Unit 1
- HWG5 Unit 2
- HWG5 Unit 3
- HWG5 Unit 4

### HWG7
- HWG7 Unit 1
- HWG7 Unit 2
- HWG7 Unit 3
- HWG7 Unit 4

每張 Lesson Card 至少包含：

- Lesson title
- Grade / Book 標記
- Unit
- 最後修改時間
- Steps 數量
- **Start Lesson**
- **Edit**
- **Duplicate**
- **Delete**（可加入確認視窗）

### 1.1 Lesson Card 行為

- `Start Lesson`：直接進入 Lesson Cockpit。
- `Edit`：進入該 Lesson 的 Lesson Studio。
- `Duplicate`：複製完整 Lesson 結構與教材設定，再讓教師重新命名。
- `Delete`：刪除 Lesson 前必須二次確認。
- 未來允許教師新增 HWG5 / HWG7 Unit 5 或其他課程，不得把 8 張卡片寫死在 UI source code 中。

---

# 2. Teacher Studio / Lesson Studio

Teacher Studio 是教師備課與管理教材的後台。

## 2.1 Lesson Studio 必須可動態編輯 Flow

教師可以：

- 新增 Step
- 刪除 Step
- 複製 Step
- 編輯 Step
- 啟用 / 停用 Step
- 使用 Drag & Drop 改變 Step 順序
- 將任意 Step 移到前面或後面
- 儲存 Lesson

任何 Step 的增刪與排序都不得需要改程式碼。

## 2.2 預設 Demo Flow

```text
Step 1  Warm-up
Step 2  HWG7 Online E-book
Step 3  Teaching Video
Step 4  Vocabulary Image Slides
Step 5  Wayground Live Interactive Practice
Step 6  Lesson Hub Vocabulary Quiz
```

以上只是預設範例，不是固定流程。

教師可以改成：

```text
Step 1  Warm-up
Step 2  Teaching Video
Step 3  Vocabulary Image Slides
Step 4  HWG7 Online E-book
Step 5  Lesson Hub Vocabulary Quiz
Step 6  Wayground Live Interactive Practice
Step 7  Exit Ticket
```

## 2.3 Step 類型必須可擴充

V03 內建 Step Types：

- Warm-up
- E-book / Web Embed
- Video
- Image Slides
- Live Interactive Practice
- Vocabulary Quiz

資料模型與 UI 架構必須允許未來新增：

- Audio
- PDF
- Text / Instructions
- YouTube / Streaming Video
- Exit Ticket
- Speaking Practice
- Worksheet
- Custom Embed
- 其他未來類型

禁止使用大量 `if lesson === HWG7 Unit 1` 之類的硬編碼方式。

---

# 3. Lesson Step 共通資料結構

每個 Step 至少包含：

```ts
interface LessonStep {
  id: string;
  lessonId: string;
  type: StepType;
  title: string;
  order: number;
  enabled: boolean;
  content: StepContent;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

`StepContent` 依 Step type 使用對應資料結構。

排序必須由 `order` 或排序陣列控制，而不是由 source code 出現順序控制。

---

# 4. 教材 CRUD：教師可以自行更換所有內容

所有教材模組都必須支援：

- Add
- Edit
- Replace
- Remove
- Reorder（適用多素材）
- Preview
- Save

### 4.1 影片

教師可以：

`移除舊影片 → 上傳新影片 → Preview → Save`

### 4.2 外部練習網址

教師可以：

`移除舊網址 → 貼入新的 URL / Embed Code → Preview → Save`

### 4.3 圖片簡報

教師可以：

`刪除舊圖 → 上傳新圖 → Drag & Drop 排序 → Preview → Save`

### 4.4 電子書

教師可以：

`更換電子書 URL → Preview → Save`

### 4.5 最重要規則

**改教材 ≠ 改程式。**

教材資料必須存放於資料層，而不是直接寫入 React component。

---

# 5. Start Lesson 與 Lesson Cockpit

## 5.1 Start Lesson

教師在 Lesson Card 按下 `Start Lesson` 後：

1. 載入 Lesson Flow。
2. 只載入 enabled Steps。
3. 依 order 排序。
4. 自動進入第一個 Step。
5. 隱藏 Teacher Studio 編輯介面。
6. 顯示 Lesson Cockpit。
7. 開始本次 lesson session。

## 5.2 Lesson Progress Bar

畫面上方顯示：

`1 Warm-up → 2 E-book → 3 Video → 4 Slides → 5 Practice → 6 Quiz`

目前 Step 必須有高辨識度 active state。

教師可：

- 點擊任意 Step 跳轉。
- 使用 Previous / Next 前後移動。

如果教師在 Studio 新增 Step 7，Progress Bar 必須自動更新，不可手動改程式。

---

# 6. Teaching Dock

畫面底部固定 Teaching Dock。

Teacher Mode 建議包含：

- Home
- Previous
- Next
- Lesson Map
- Notes（預留）
- Fullscreen
- End Lesson

其中 `Previous` 與 `Next` 是最高頻率的課堂操作，按鈕必須：

- 大型
- 適合觸控
- 位置固定
- 不因不同 Step 重新排版

### 6.1 Next 行為

- 下一 Step 存在：進入下一 Step。
- 已在最後一 Step：顯示 `Finish Lesson`。
- disabled Step 自動跳過。

---

# 7. Teacher / Student Mode

網站右上方固定提供：

`教師模式 | 學生模式`

## 7.1 Teacher Mode 顯示

- Lesson Progress
- Teaching Dock
- 左側 Annotation Toolbar
- 右側 Classroom Tools
- Previous / Next
- Fullscreen
- Teacher-specific controls

## 7.2 Student Mode 隱藏

- Teacher Studio
- Lesson Edit
- 抽籤工具
- 教師計時器設定
- Annotation tools
- 教師專用控制

學生主要看到：

- Lesson content
- Web / E-book
- Slides
- Video（依教師設定）
- Live Practice
- Vocabulary Quiz
- Student ID
- 個人成績 / Reward 結果

---

# 8. Responsive Design

必須至少驗證以下 viewport：

- Desktop：1920 × 1080
- Classroom display：16:9
- iPad Landscape
- iPad Portrait
- 一般 10–11 吋平板

## 8.1 平板 UX 規則

- 不可依賴 hover。
- 主要操作按鈕必須 touch-friendly。
- Slides 支援 swipe。
- Quiz 選項使用大型選項卡。
- Student ID 輸入欄位必須適合虛擬鍵盤。
- 橫向與直向切換不得破版。
- Teacher floating tools 在窄畫面下可 collapse。
- Student Mode 不應顯示左右教師工具列，以最大化內容區域。

---

# 9. 左側 Annotation Toolbar

畫筆工具完全獨立在畫面左側。

按下 Pen / Annotation 後，所有畫筆功能都只在左側顯示。

禁止把 Pen controls 放入右側 Classroom Tools。

## 9.1 工具

- Pointer
- Pen
- Highlighter
- Eraser
- Undo
- Redo
- Clear All

## 9.2 顏色

- Black
- Red
- Blue
- Green
- Orange
- Purple
- Pink

## 9.3 粗細

- Thin
- Medium
- Thick

Annotation layer 必須覆蓋在目前教材之上，但不可永久修改原始教材檔案。

---

# 10. 右側 Floating Classroom Tools

右側為獨立浮動工具面板。

V03 至少包含：

- Random Student Picker
- Timer

## 10.1 Random Student Picker

可設定全班座號範圍：

- Minimum：預設 1
- Maximum：預設 30

限制：

- Minimum >= 1
- Maximum <= 30
- Minimum <= Maximum

功能：

- Start Draw
- Draw Again
- Reset
- Avoid Repeat ON / OFF

Avoid Repeat ON 時，本輪已抽到座號不重複，直到 Reset。

## 10.2 Timer

快速按鈕：

- 1 min
- 3 min
- 5 min
- 10 min
- Custom

控制：

- Start
- Pause
- Resume
- Reset

倒數完成提供視覺提示，可選擇播放提示音。

---

# 11. HWG7 Online E-book Module

第一個實際 E-book URL：

`https://h5.hle.com.tw/toolbar/release/index.html?key=ada138a7-e48e-4d2e-9ecc-ea2290864493`

教師端設定欄位：

- Step title
- E-book URL
- Display name
- Embed mode
- Fullscreen allowed
- Save

Lesson Cockpit 優先嘗試 inline embed。

如果第三方網站因 iframe / CSP / X-Frame-Options 無法內嵌，顯示 fallback UI，不得讓整個 Lesson Cockpit 崩潰。

---

# 12. Teaching Video Player + AB Repeat

教師可：

- Upload MP4
- Replace Video
- Remove Video
- Rename Video
- Preview

## 12.1 播放控制

必須包含：

- Play / Pause
- Seek
- Volume
- Fullscreen
- Playback Speed

Playback Speed 固定提供：

- 0.75×
- 0.8×
- 1.0×
- 1.25×

## 12.2 AB Repeat

控制：

- Set A
- Set B
- Loop ON / OFF
- Clear A/B

流程：

1. 教師播放影片。
2. 按 A 記錄 `startTime`。
3. 按 B 記錄 `endTime`。
4. 當 Loop ON，影片播放到 B 時自動跳回 A。
5. Clear 清除 A / B。

狀態例：

```text
A 00:35.20
B 00:42.80
AB Repeat: ON
```

---

# 13. Vocabulary Image Slides

教師可以一次上傳多張圖片。

支援：

- JPG
- PNG
- WebP

教師端：

- Add Image
- Remove Image
- Replace Image
- Drag & Drop reorder
- Preview
- Save

播放端：

- Previous
- Next
- Current / Total，例如 `3 / 10`
- Keyboard ← / →
- Swipe
- Fullscreen

---

# 14. Wayground Live Interactive Practice

目前示範 URL：

`https://wayground.com/join?gc=336134`

教師端可以設定：

- Activity name
- URL
- Embed URL / Embed code
- Display mode
- Save

優先顯示於 Lesson Cockpit 內容區，不另開頁面。

若第三方平台不允許 embed，顯示 fallback action。

教師可以隨時：

`Remove old practice → Add new practice URL → Preview → Save`

---

# 15. Lesson Hub Native Vocabulary Quiz

Vocabulary Quiz 不依賴 Wayground，直接由 Lesson Hub 原生實作。

學生進入前先輸入：

`Student ID`

不要求學生建立完整帳號。

## 15.1 V03 題型

### Type A — Look and Choose

- 顯示一張圖片。
- 顯示四個單字選項。
- 一個正確答案。
- 三個 distractors 從同一 Vocabulary Set 產生。

### Type B — Listen and Choose

- 顯示 Audio / Play control。
- 顯示四個單字選項。
- 一個正確答案。
- 三個 distractors 從同一 Vocabulary Set 產生。

---

# 16. Vocabulary Bank

每個 Vocabulary item 至少包含：

```ts
interface VocabularyItem {
  id: string;
  word: string;
  imageUrl?: string;
  audioUrl?: string;
  enabled: boolean;
}
```

教師可以：

- Add word
- Edit word
- Delete word
- Replace image
- Replace audio
- Enable / Disable word

Quiz Engine 自動建立：

- Correct answer
- Distractors
- Question order
- Option order

---

# 17. 每題答對的 Celebration Feedback

V03 新增強化版正向回饋。

## 17.1 Trigger

每次學生答對一題，立即觸發慶祝效果。

## 17.2 Celebration Layer

持續時間：約 **2.8 秒**。

內容包含：

- Celebration overlay
- 3D floating emoji / icons
- Stars 🌟
- Trophy 🏆
- Confetti 🎉
- Clapping 👏
- Medal 🏅
- Applause sound

動畫可採不同組合隨機出現，避免每題完全相同。

## 17.3 UX 規則

1. 答對後立刻鎖定當題，避免重複點擊。
2. 播放約 2.8 秒 celebration。
3. 音效與動畫同步啟動。
4. 動畫結束後自動進入下一題或下一狀態。
5. 不需要學生額外按 Continue。
6. 必須有全域 Sound ON / OFF 控制，以處理教室靜音需求。
7. 若 browser 阻止 autoplay，必須在第一次 student interaction 後初始化 audio context。
8. `prefers-reduced-motion` 開啟時，改用簡化動畫，但保留正向回饋。

答錯時不播放慶祝動畫；顯示簡潔的 try-again / incorrect feedback，避免使用負向羞辱性效果。

---

# 18. Quiz Progress 與 Reward Checkpoints

Type A 與 Type B 各自獨立計算 progress。

## 18.1 Type A

當 Type A 完成：

- **50% 題數** → 進入 Reward Slot Machine。
- **100% 題數** → 再次進入 Reward Slot Machine。

## 18.2 Type B

當 Type B 完成：

- **50% 題數** → 進入 Reward Slot Machine。
- **100% 題數** → 再次進入 Reward Slot Machine。

### 18.3 題數為奇數時的 50% 規則

使用：

`halfCheckpoint = ceil(totalQuestions / 2)`

例如：

- 10 題 → 第 5 題後進入 50% Reward。
- 9 題 → 第 5 題後進入 50% Reward。

### 18.4 V03 固定 Reward Session 規則

每一個 50% 或 100% checkpoint 都會開啟一個 Reward Slot Session。

**每個 Reward Slot Session 可 SPIN 4 次。**

因此預設：

- Type A 50%：4 spins
- Type A 100%：4 spins
- Type B 50%：4 spins
- Type B 100%：4 spins

此數值要做成 configuration constant，例如：

```ts
rewardConfig = {
  checkpoints: [0.5, 1.0],
  spinsPerCheckpoint: 4
}
```

未來可以調整規則而不用改 Quiz 核心邏輯。

---

# 19. Reward Slot Machine — 畫面與流程

## 19.1 進入畫面

進入 Slot Machine 後，顯示：

- Student ID
- Current mode：Type A 或 Type B
- Current checkpoint：50% 或 100%
- 本次練習分數
- 目前累積拉霸獎勵分數
- 三個 slot reels
- 剩餘 SPIN 次數

初始三軸：

`❓ | ❓ | ❓`

## 19.2 Slot Symbols

固定符號：

- 🍎
- 🌟
- 💎
- 🔔
- 🍒
- 7️⃣

每一軸最終結果使用公平的 random selection，不因 practice score 改變機率。

## 19.3 SPIN 次數

每個 Reward Slot Session：

`4 SPINS`

畫面顯示：

`Spin 1 / 4`

依序至：

`Spin 4 / 4`

第 4 次結束後禁止繼續 SPIN。

## 19.4 Reel Stop Timing

三個滾輪必須依序停止：

- Reel 1：15 ticks
- Reel 2：20 ticks
- Reel 3：25 ticks

視覺效果必須讓學生明顯看到：

`Reel 1 stops → Reel 2 stops → Reel 3 stops`

禁止三軸同時瞬間顯示答案。

## 19.5 Audio Sequence

點擊 `SPIN`：

1. 立即播放 `click`。
2. 滾輪轉動過程播放 `tick`。
3. 最後一軸停止。
4. 計算本次 spin score。
5. 播放 `win` 音階。
6. 顯示本次得分動畫。

音效必須受到 global Sound ON / OFF 控制。

---

# 20. Reward Slot Machine — 計分規則

每次 SPIN 使用以下計分：

| 結果 | 分數 |
|---|---:|
| 三個圖案相同 | 100 |
| 任兩個圖案相同 | 50 |
| 三個全部不同 | 10 |

計分邏輯優先順序：

```ts
if (a === b && b === c) score = 100;
else if (a === b || a === c || b === c) score = 50;
else score = 10;
```

## 20.1 Session Slot Score

四次 SPIN 分數相加：

```text
spin1 + spin2 + spin3 + spin4 = totalSlotScore
```

例如：

```text
50 + 10 + 100 + 50 = 210
```

## 20.2 Reward 分數不得修改練習分數

**Slot Score 是獎勵分數。**

不得：

- 加回題目正確率。
- 修改 practice score。
- 讓錯題變成答對。

畫面分開顯示：

```text
練習分數     拉霸獎勵
8 / 10       210
```

在 Quiz 最終結果頁也必須並排顯示。

---

# 21. Reward Slot Machine — 完成闖關

四次 SPIN 完成後：

- SPIN button disabled。
- 顯示 `完成闖關`。

只有學生按下：

**完成闖關**

之後，才正式提交該 Reward Session 的結果。

## 21.1 暫存 vs 正式儲存

在四次 SPIN 尚未完成或尚未按完成闖關前：

- 結果只存在 client state / temporary session state。
- 不寫入正式 `practiceResults` collection。

按下完成闖關後：

1. Freeze session。
2. 建立 immutable reward session record。
3. 寫入 practiceResults。
4. 若為 50% checkpoint：返回 Quiz 繼續答題。
5. 若為 100% checkpoint：結束該 Type，進入下一 Type 或總結果。

防止重複提交：

- `Complete Challenge` 必須 idempotent。
- button click 後立即 disable。
- 使用 `sessionId` 防止重複建立紀錄。

---

# 22. Quiz 狀態機

建議 Codex 使用明確 state machine，而不是零散 boolean。

```text
ENTER_STUDENT_ID
      ↓
TYPE_A_QUIZ
      ↓ 50%
TYPE_A_SLOT_HALF
      ↓ complete challenge
TYPE_A_QUIZ
      ↓ 100%
TYPE_A_SLOT_COMPLETE
      ↓ complete challenge
TYPE_B_QUIZ
      ↓ 50%
TYPE_B_SLOT_HALF
      ↓ complete challenge
TYPE_B_QUIZ
      ↓ 100%
TYPE_B_SLOT_COMPLETE
      ↓ complete challenge
FINAL_RESULT
```

每題內部：

```text
QUESTION_ACTIVE
   ├─ wrong → QUESTION_FEEDBACK_WRONG → QUESTION_ACTIVE / NEXT POLICY
   └─ correct → CELEBRATION_2_8S → NEXT_QUESTION / CHECKPOINT
```

這個狀態機必須避免：

- 慶祝動畫還沒結束就重複提交。
- checkpoint 被觸發兩次。
- refresh 後重複獲得 reward。
- 四次 SPIN 以上。
- 完成闖關重複寫入資料庫。

---

# 23. practiceResults 資料模型

建議不要只存一個總分，需保留 practice 與 reward 分離資料。

```ts
interface PracticeResult {
  id: string;
  lessonId: string;
  quizId: string;
  studentId: string;
  sessionId: string;

  startedAt: Timestamp;
  completedAt?: Timestamp;

  typeA: ModeResult;
  typeB: ModeResult;

  practiceScore: number;
  practiceMaxScore: number;
  practiceAccuracy: number;

  totalSlotScore: number;

  status: 'in_progress' | 'completed';
}

interface ModeResult {
  mode: 'A' | 'B';
  correctCount: number;
  totalQuestions: number;
  practiceScore: number;
  practiceMaxScore: number;
  slotScore: number;
  rewardSessions: RewardSession[];
}

interface RewardSession {
  rewardSessionId: string;
  checkpoint: 0.5 | 1.0;
  spins: SpinResult[];
  totalSlotScore: number;
  completed: boolean;
  completedAt?: Timestamp;
}

interface SpinResult {
  spinIndex: 1 | 2 | 3 | 4;
  reels: [SlotSymbol, SlotSymbol, SlotSymbol];
  score: 10 | 50 | 100;
}
```

## 23.1 totalSlotScore

總拉霸獎勵：

```text
Type A 50% session
+ Type A 100% session
+ Type B 50% session
+ Type B 100% session
= practiceResults.totalSlotScore
```

practiceScore 與 totalSlotScore 永遠為獨立欄位。

---

# 24. Quiz Result 畫面

完成 Type A + Type B 後顯示：

```text
Great Job!

練習分數        拉霸獎勵
18 / 20          640

正確率
90%
```

可以另外顯示：

- Type A score
- Type A slot reward
- Type B score
- Type B slot reward
- Total practice score
- Total slot reward

不得把兩種分數相加成一個「總學業分數」。

---

# 25. Teacher Results Dashboard

教師可以依：

- Lesson
- Quiz
- Student ID
- Class
- Date

篩選。

列表至少顯示：

| Student ID | Practice Score | Accuracy | Slot Reward | Type A | Type B | Time |
|---|---:|---:|---:|---:|---:|---:|
| 50101 | 18/20 | 90% | 640 | 9/10 | 9/10 | 04:52 |

點開個別結果可看到：

- 每題答案
- 正確 / 錯誤
- Type A / B 統計
- 四個 Reward Sessions
- 每次 SPIN 三軸結果
- 每次 SPIN 分數
- totalSlotScore

---

# 26. Suggested Frontend Components

建議元件拆分：

```text
AppShell
├── TeacherStudio
│   ├── LessonCardGrid
│   ├── LessonCard
│   └── LessonStudio
│       ├── StepList
│       ├── StepEditor
│       └── MediaManager
│
├── LessonCockpit
│   ├── LessonProgressBar
│   ├── LessonRenderer
│   ├── AnnotationToolbar
│   ├── ClassroomTools
│   └── TeachingDock
│
├── StepRenderers
│   ├── WarmupStep
│   ├── EbookStep
│   ├── VideoStep
│   ├── SlidesStep
│   ├── WebPracticeStep
│   └── VocabularyQuizStep
│
└── Quiz
    ├── StudentIdGate
    ├── QuestionCard
    ├── CelebrationOverlay
    ├── QuizProgress
    ├── RewardSlotMachine
    │   ├── SlotReel
    │   ├── SpinControls
    │   └── RewardScorePanel
    └── QuizResult
```

Step Renderer 建議使用 registry pattern：

```ts
const stepRendererRegistry = {
  warmup: WarmupStep,
  ebook: EbookStep,
  video: VideoStep,
  slides: SlidesStep,
  webPractice: WebPracticeStep,
  vocabularyQuiz: VocabularyQuizStep,
};
```

未來新增 Step type 時，只需新增 renderer 與 schema，不應重寫 Lesson Cockpit。

---

# 27. Suggested Backend / Storage

建議：

- Frontend：Next.js / React
- Authentication：Firebase Authentication（Teacher）
- Database：Firestore
- Media：Firebase Storage

核心 collections：

```text
users
classes
lessons
vocabularySets
quizzes
practiceResults
```

實際 schema 可在 Prototype 確認後再鎖定。

---

# 28. Audio Asset Requirements

V03 至少需要：

- `celebration_applause`
- `slot_click`
- `slot_tick`
- `slot_win`
- `timer_end`（可選）

規則：

- 所有音效使用單一 Audio Manager。
- 不要每個 component 自行建立不可控 audio instance。
- 支援 global mute。
- 需處理 mobile Safari audio unlock。
- 同一時間避免多個 celebration / slot sound 疊加失控。

---

# 29. Accessibility / Classroom Safety UX

- Celebration 不能快速閃爍造成強烈視覺刺激。
- 尊重 `prefers-reduced-motion`。
- 所有主要按鈕有清楚文字，不只靠 icon。
- Keyboard focus 可辨識。
- Quiz 正確 / 錯誤不可只靠顏色辨識。
- 音效可以關閉。
- 平板旋轉後狀態不得重置。

---

# 30. Prototype / Preview Scope

V03 第一階段先做可操作 Preview，優先確認 UX，不需一次完成正式 Firebase 後端。

使用 mock data 完成：

1. 8 張預設 Lesson Cards。
2. Lesson Studio。
3. Step Drag & Drop。
4. Add Step / Delete Step。
5. Start Lesson。
6. Previous / Next。
7. Teacher / Student Mode。
8. E-book placeholder / real embed test。
9. Video Player + AB Repeat。
10. Image Slides。
11. Wayground embed area。
12. Student ID gate。
13. Type A Quiz。
14. Type B Quiz。
15. 每題答對 2.8 秒 Celebration。
16. Type A 50% / 100% Reward Slot。
17. Type B 50% / 100% Reward Slot。
18. 4-spin slot flow。
19. 15 / 20 / 25 tick reels。
20. Practice Score + Slot Reward 並排。
21. Mock practiceResults save。
22. 左側畫筆工具。
23. 右側抽籤與計時器。
24. Teaching Dock。
25. Desktop / iPad responsive preview。

---

# 31. V03 Demo Data

## 31.1 Lesson Cards

```text
HWG5 Unit 1
HWG5 Unit 2
HWG5 Unit 3
HWG5 Unit 4
HWG7 Unit 1
HWG7 Unit 2
HWG7 Unit 3
HWG7 Unit 4
```

## 31.2 Demo Lesson Flow

```text
1. Warm-up
2. HWG7 Online E-book
3. Teaching Video
4. Vocabulary Image Slides
5. Wayground Live Interactive Practice
6. Lesson Hub Vocabulary Quiz
```

## 31.3 Demo URLs

HWG7 E-book:

`https://h5.hle.com.tw/toolbar/release/index.html?key=ada138a7-e48e-4d2e-9ecc-ea2290864493`

Wayground:

`https://wayground.com/join?gc=336134`

---

# 32. Acceptance Criteria — Lesson Studio

V03 Preview 通過條件：

- [ ] 顯示 8 張指定 Lesson Cards。
- [ ] 教師可以 Edit 任一 Lesson。
- [ ] 教師可以新增 Step。
- [ ] 教師可以刪除 Step。
- [ ] 教師可以拖曳 Step 改變順序。
- [ ] 儲存後 Start Lesson 使用新順序。
- [ ] Step type 架構可擴充。
- [ ] 不需改 source code 才能更換教材。

---

# 33. Acceptance Criteria — Lesson Cockpit

- [ ] Start Lesson 進入第一個 enabled Step。
- [ ] Previous / Next 正確運作。
- [ ] Progress Bar 依 Lesson Steps 動態生成。
- [ ] Teacher / Student Mode 正確切換。
- [ ] 左側只有 Annotation tools。
- [ ] 右側包含 Random Picker / Timer。
- [ ] Teaching Dock 始終固定且可觸控。
- [ ] Desktop / iPad 不破版。

---

# 34. Acceptance Criteria — Quiz Celebration

- [ ] Type A / B 答對均觸發 Celebration。
- [ ] Celebration 約 2.8 秒。
- [ ] 顯示 3D-style floating reward emoji / icon。
- [ ] 包含 stars / trophy / confetti / clapping / medal 類型。
- [ ] 播放 applause sound。
- [ ] Celebration 期間不可重複提交當題。
- [ ] 動畫完成自動進入下一題／checkpoint。
- [ ] 支援 Sound OFF。

---

# 35. Acceptance Criteria — Reward Slot Machine

- [ ] Type A 50% 進入 Slot Machine。
- [ ] Type A 100% 進入 Slot Machine。
- [ ] Type B 50% 進入 Slot Machine。
- [ ] Type B 100% 進入 Slot Machine。
- [ ] 每個 Reward Session 初始為 `❓ ❓ ❓`。
- [ ] Symbols 僅使用 🍎 🌟 💎 🔔 🍒 7️⃣。
- [ ] 每個 Reward Session 可 SPIN 4 次。
- [ ] Reel 1 在 15 ticks 停止。
- [ ] Reel 2 在 20 ticks 停止。
- [ ] Reel 3 在 25 ticks 停止。
- [ ] SPIN 點擊播放 click。
- [ ] 轉動播放 tick。
- [ ] 最後得分播放 win 音階。
- [ ] 三同 = 100。
- [ ] 任兩同 = 50。
- [ ] 全不同 = 10。
- [ ] 四次 SPIN 相加為該 Reward Session 的 totalSlotScore。
- [ ] Slot Score 不修改 practice score。
- [ ] 練習分數與拉霸獎勵並排顯示。
- [ ] 第四次後 SPIN disabled。
- [ ] 顯示完成闖關。
- [ ] 只有完成闖關後才正式寫入 practiceResults。
- [ ] 重複點擊完成闖關不會產生 duplicate record。

---

# 36. Acceptance Criteria — Results

- [ ] Student ID 與結果正確關聯。
- [ ] Practice Score 與 Slot Score 分開儲存。
- [ ] 可以看到 Type A / Type B 個別結果。
- [ ] 可以看到每個 Reward Session。
- [ ] 可以看到每次 SPIN 的 symbols 與 score。
- [ ] Dashboard 顯示 Practice Score / Accuracy / Slot Reward。

---

# 37. Codex Implementation Priorities

## Phase 1 — Prototype

優先做：

1. Layout / responsive shell
2. Lesson Cards
3. Lesson Studio dynamic steps
4. Lesson Cockpit navigation
5. Teacher / Student mode
6. Video / Slides / Embed placeholders
7. Native Quiz
8. Celebration Overlay
9. Reward Slot Machine
10. Mock Results

## Phase 2 — Real Content

1. 真實 HWG7 E-book embed test
2. 真實 Wayground embed test
3. Video upload / local preview
4. Image upload / reorder
5. Vocabulary media

## Phase 3 — Persistence

1. Firebase Auth
2. Firestore lessons
3. Firebase Storage
4. practiceResults
5. Results Dashboard

## Phase 4 — Classroom Hardening

1. iPad Safari testing
2. audio unlock
3. fullscreen behavior
4. network failure states
5. autosave / recovery
6. accessibility
7. performance

---

# 38. Non-Goals for Initial V03 Prototype

除非另外指定，Prototype 暫不優先：

- Google Classroom integration
- AI 自動生成 Vocabulary
- Multiplayer game engine
- Student social accounts
- Public ranking leaderboard
- Complex LMS permissions
- Payment / subscription

先把「教師備課 → Start Lesson → Next 上課 → Quiz → Reward → Result」做穩定。

---

# 39. V03 Definition of Done

V03 可以進入下一階段的最低標準：

> 教師可以從 8 張 Lesson Cards 選擇課程，進入 Lesson Studio 後自由新增、刪除與重新排序 Step，不需要修改程式碼。

> 教師可以自行更換電子書、影片、圖片與 Wayground 練習來源。

> 上課時只需按 Start Lesson，並以 Previous / Next 推進整堂課。

> Vocabulary Quiz 原生支援 Student ID、Type A、Type B、每題答對 2.8 秒慶祝回饋，以及 50% / 100% Reward Slot Machine。

> 每個 Reward Slot Session 具有 4 次 SPIN、15/20/25 ticks、click/tick/win 音效與 100/50/10 計分規則。

> Practice Score 與 Slot Reward 永遠分開，並在完成闖關後保存到 practiceResults。

> Teacher / Student Mode 與 iPad responsive UI 可以正常使用。

---

# 40. Codex 最重要的開發約束

1. 不得把 Lesson Flow 寫死。
2. 不得把 8 個 Lesson 的教材內容寫死在 component。
3. Step types 必須使用可擴充架構。
4. Practice Score 與 Reward Score 必須分離。
5. Slot Machine 必須是真實可見的 reel animation，不可直接隨機出三個結果後瞬間顯示。
6. 15 / 20 / 25 tick 的依序停止必須可觀察。
7. `practiceResults` 正式提交必須發生在「完成闖關」之後。
8. 所有核心操作需支援 touch。
9. Preview 先確認 UI / UX，再進行完整 Firebase 實作。
10. 任何未來更換教材的工作，都應由 Teacher Studio 完成，而不是要求教師修改 source code。

---

## V03 核心產品句

**Prepare once. Start Lesson. Teach with Next. Reward every success.**

**備課時排好，上課時只管教；每一次答對，都立即得到正向回饋。**
