"""把畫風 J（A11 剪紙人偶說書動畫）寫進 tools/影片與動畫工作流總覽.md（保留 CRLF）。"""
F = r"G:\我的雲端硬碟\teacher-toolkit\tools\影片與動畫工作流總覽.md"
s = open(F, encoding='utf-8', newline='').read()
assert 'A11' not in s
NL = '\r\n'
def ins_after_line(prefix, new):
    global s
    i = s.index(prefix); j = s.index(NL, i) + len(NL)
    s = s[:j] + new + NL + s[j:]

# 1. 素材 → 流程 表
ins_after_line('| 一組 **問答句型＋地點／位置**',
 '| 一課 **課本故事對話**（多個角色、一問一答），想要 **角色精準對嘴、名字標籤、印章字卡的說書風動畫** | 剪紙人偶說書動畫（旁白＋對話；透視大移動交給 3D、一大群人交給 AI 影片） | **A11 剪紙人偶說書動畫（畫風 J）** | ❌ 照總覽 A11＋專案 `hwg7-u03-vienna-cutout/HANDOFF.md`（引擎基底 skill `growkaz-cutout-tales`） |')
# 2. 畫風選單
ins_after_line('| I What IF 情境（2D 為主＋3D 鏡頭）',
 '| J 剪紙人偶說書（程式為主＋3D／AI 影片輔助） | 扁平向量人偶（關節像紙偶、每塊一個硬邊陰影、深咖啡粗描邊）、正面站成一排說話、鏡頭自動推近說話的人；彈出名字標籤、地點牌、**圖示＋大字的字卡**；向量嘴照音素精準對嘴 | 課本故事對話、多角色一問一答、要學生看嘴型跟讀 | ✅ 11/18 定案（A Day in Vienna v2） |')
# 3. A11 章節（放在 B 類之前）
A11 = NL.join([
 '### A11 剪紙人偶說書動畫（畫風 J，2026-11-18 新增；全片 v2 定案）',
 '> **第一支**：〈A Day in Vienna〉（HWG7 U03，對話 21 句＋英文旁白 12 句，2:29，字幕版＋聽力版），專案 `tools/2026 AI ANIMATED VIDEO/output/hwg7-u03-vienna-cutout/`，**先讀 `HANDOFF.md`**。規格卡 `rdq/RDQ-spec-hwg7-u03-vienna-cutout-20261117.md`、`rdq/RDQ-spec-vienna-v2-tram-card-opera-20261118.md`。',
 '> **分工原則（老師 11/17 指定）**：主力＝純程式動畫（pycairo 逐格畫＋ffmpeg）；3D（Colab Blender）和 AI 影片（KIE Seedance）只當輔助。會說話、要對嘴、拿道具的人一律用程式；「物體朝鏡頭開過來、鏡頭飛進場景」交給 3D；「一大群人一起小動作」交給 AI 影片；輔助鏡頭不放會說話的主角。這支片輔助約佔 2 成（3D 六鏡約 22 秒、Seedance 三鏡約 13 秒）。',
 '- **輸入**：課本故事對話稿（哪句是課本原句不能改要標出來）＋角色名與外型。旁白另寫，每句旁白都要有畫面和動作；旁白用字不超過課本程度（老師把 palace、orchestra 換成簡單說法）。',
 '- **人偶引擎** `src/cast.py`：腳在原點、手臂兩節 IK（指定手的位置）、腳踝 IK（騎車、坐姿）、`under_hands` 畫道具、表情、向量嘴＋下巴。一個角色一個 dict；兒童約 4.3 頭身、大人約 6.3 頭身。',
 '- **精準對嘴** `src/lipsync.py`＋`phalign.py`：edge-tts（0.8 倍）→ 去頭尾靜音 → wav2vec2 音素強制對齊（本機 CPU）→ 9 種嘴形連續混合。**不要用 edge-tts 的逐字時間**（實測比聲音早約 0.16 秒）。閉唇 P/B 放在爆破聲之前、每個嘴形至少 3 格、嘴形提早 1 格。對齊資料同時給卡拉 OK 字幕用。',
 '- **全片** `src/film.py`：時間軸是一串 beat，三種：`clip`（3D／AI 影片）、`stage`（人偶對話，鏡頭自動推近說話者，下一句 1 秒內開始就不拉回）、`insert`（道具特寫）。3D 還沒渲好的鏡頭自動用試渲片當替代並印 `PLACEHOLDER`，可以先做程式部分。`--stills` 出每句一格的檢查圖，`--nosub` 出聽力版。',
 '- **配音** `src/make_voices.py`：每個角色一個 edge-tts 聲線；男孩用成人男聲調高；機器人加 ffmpeg 相位歸零效果；大家一起說的句子只疊兩個聲音（老師 11/17）。',
 '- **3D 輔助** `src/b3d_vienna.py`：Blender 程序化建模（不用外部模型）、Toon＋自發光材質、Freestyle 深咖啡描邊、每格只由時間決定。先交 3 格檢查圖 → 1 秒試渲 → 正式渲。Colab L4 約 12–22 秒／格（1080p、64 samples）。',
 '- **AI 影片輔助** `seedance/seedance.py`：Codex 內建生圖畫首幀（附定裝圖當畫風參考）→ 老師看首幀 → Seedance 2.0 Mini 首幀模式、720p、無聲（約 8.2 點／秒）。',
 '- **配樂與音效**：公有領域錄音（Wikimedia Commons，逐頁讀授權，來源記在 `audio/music/sources.json`）＋程式合成（鋼琴、鈴聲、掌聲、whoosh）。有人說話時壓低；沒配音的段落配樂是正常音量的 1/4；道具特寫時配樂靜音。',
 '- **字卡規則（老師 11/18）**：單字字卡上要有對應圖示（BY TRAM 配電車圖），讓學生看圖就懂；字卡放在不擋角色臉的位置；字級約 72–76。聽力版只拿掉卡拉 OK 字幕，字卡、名字標籤、地點牌保留。',
 '- **流程**：RDQ → 定裝圖＋道具姿勢檢查圖 → 2 句對嘴測試片（含 0.5 倍慢速檢查版）→ 故事稿與旁白（Google 文件）→ 配音試聽 → 3D 檢查圖／AI 首幀 → 1 個場景試片 → 全片檢查圖 → 全片 v1 → 修改 → 字幕版＋聽力版（1080p、720p）。',
 '- **成本參考（A Day in Vienna）**：KIE 106.6 點；Colab 約 13.7 單位（其中約 4 單位是踩坑浪費，正常約 9）。',
 '',
 '**A11 踩坑**：',
 '',
 '| 坑 | 解法 |',
 '|---|---|',
 '| Colab CLI：`colab new` 後第一個 exec、或超過約 1 分鐘的 exec 會卡住；一次空等兩小時、機器上其實沒開始渲 | exec 只跑「立刻返回」的指令：用 `subprocess.Popen(start_new_session=True)` 把安裝和渲染丟到背景；開跑幾分鐘內先確認真的有出圖 |',
 '| 渲染丟到背景後只用 `colab ls` 看進度，Colab 判定閒置把機器回收，成品全沒了 | 每約 50 秒跑一個短 exec 保持連線；每個鏡頭渲完立刻下載；全部完成才 `colab stop`（`work/run_full.sh`） |',
 '| Blender：`transform_apply(scale=True)` 預設連位置也套用，之後再設 `location` 會位移兩次（白鍵浮高蓋住黑鍵、車門跑位） | 寫成 `transform_apply(location=False, rotation=False, scale=True)` |',
 '| 3D 鏡頭畫面一閃一閃：拱窗用「方塊＋圓柱」兩個物件拼，接縫處 Freestyle 描邊每格忽有忽無 | 一個形狀用一個網格（輪廓擠出）；交片前取連續 3–6 格放大看線條 |',
 '| 遠處密集的描邊線把時光隧道盡頭的亮光蓋成咖啡色 | 該鏡頭描邊改細（3.2 → 1.4 px） |',
 '| 全景鏡頭放大 1.12 倍後，畫面兩側各約 100 px 看不到，腳踏車停在畫面外 | 重要的東西放在 x＝103–1817 之間 |',
 '| 道具特寫只做 4 格逐步動畫，看起來卡 | 動作參數吃小數時間（按鍵→抬手→移到下一鍵），不要用整數格索引 |',
 '| 人偶站在踏板上滑行，沒有踩踏板 | 加腳踝 IK：臀部落在坐墊、兩腳跟著曲柄轉，輪子與曲柄的轉角由位移算（不打滑） |',
 '| 字卡蓋住角色的頭 | 字卡固定放畫面上方（y 約 130），特寫和全景都檢查一次 |',
 '| Wikimedia 檔案用腳本下載回 429 | 不要改瀏覽器身分硬抓；老師同意後用內建瀏覽器開 `Special:FilePath/<檔名>` 下載。.ogg 用 soundfile 解碼 |',
 '| 把自己的腳本取名 `align.py`，和 skill 裡的同名檔衝突 | 取不會撞名的檔名（`phalign.py`） |',
 '',
])
a = NL + '---' + NL + NL + '## B. AI 生成短片'
assert s.count(a) == 1
s = s.replace(a, NL + A11 + NL + '---' + NL + NL + '## B. AI 生成短片')
# 4. 缺口
ins_after_line('- 2026-11-16：A10 桌上小鎮句型問答動畫',
 '- 2026-11-18：A11 剪紙人偶說書動畫（畫風 J）〈A Day in Vienna〉全片 v2 定案，流程寫在本總覽；還沒有專屬 skill（`growkaz-cutout-tales` 只是引擎基底），做第二支時把 `cast.py`、`lipsync.py`、`film.py` 的 beat 時間軸整理成 skill 範本。')
# 5. 下次這樣跟我說
ins_after_line('| A10 桌上小鎮問答 |',
 '| A11 剪紙人偶說書 | 「把這課故事對話做成剪紙人偶版（畫風 J，像 A Day in Vienna）」 | 總覽 A11＋`hwg7-u03-vienna-cutout/HANDOFF.md` |')
assert '\n' not in s.replace('\r\n', '')
open(F, 'w', encoding='utf-8', newline='').write(s); print('ok', s.count('\r\n'), 'lines')
