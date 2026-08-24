# HWG5 SR 題圖產生與本機 QA

- 單元：`HWG5 SR`
- 題圖：15 張，皆為 `1280 × 720` PNG
- 原始參考圖：只作為語意與位置關係參考，未修改、未公開複製
- 公開資產清單：`manifest.json`
- 教師圖像複核狀態：2026-08-24 已確認 15／15

## 產生方法

### 精確時鐘（001、002、009、010）

為避免生成式圖片把指針時間畫錯，四張時鐘使用專案內的確定性繪圖腳本 `scripts/generate-hwg5-clock-images.py` 產生：

| 題號 | 時間 | 驗證重點 |
|---|---:|---|
| HWG5-SR-001 | 5:55 | 分針指向 11；時針接近 6 |
| HWG5-SR-002 | 3:15 | 分針指向 3；時針略過 3 |
| HWG5-SR-009 | 5:45 | 分針指向 9；時針接近 6 |
| HWG5-SR-010 | 11:00 | 分針指向 12；時針指向 11 |

### 原創情境圖（003–008、011–015）

使用內建圖片生成服務逐張產生，再以 `scripts/optimize-hwg5-question-images.py` 做本機 PNG 最佳化。所有題圖共用以下視覺提示詞合約：

> Polished, friendly 3D children's educational illustration for a Taiwanese elementary English speaking activity, original characters only, warm pastel colors, clear classroom-readable subject, landscape 16:9, no text, no letters, no numbers, no logos, no brands, no watermark, no copyrighted or known characters.

每題再加入下列主體與構圖限制：

| 題號 | 個別提示詞重點 |
|---|---|
| HWG5-SR-003 | 原創女學生坐在書桌前，用鉛筆在紙上寫字；手部、鉛筆與書寫動作清楚。 |
| HWG5-SR-004 | 原創男孩在泳池水道中游泳；泳姿清楚，場景安全且不含文字。 |
| HWG5-SR-005 | 原創女孩站在有爐台、流理台與櫥櫃的廚房；房間特徵一眼可辨。 |
| HWG5-SR-006 | 原創男孩站在有植物、草地與戶外步道的庭院；避免像室內或公園。 |
| HWG5-SR-007 | 一支粗頭彩色 marker 明確放在透明拉鍊袋內；袋內外位置關係不可含糊。 |
| HWG5-SR-008 | 一頂黃色寬邊帽清楚放在矮木桌旁邊；帽子不在桌上或桌下。 |
| HWG5-SR-011 | 原創男孩在戶外公園向前跑；雙腿與手臂呈清楚跑步姿勢。 |
| HWG5-SR-012 | 原創孩子在廚房餐桌邊拿杯子喝水；飲用動作清楚。 |
| HWG5-SR-013 | 原創孩子站在有餐桌與餐椅的 dining room；空間用途清楚。 |
| HWG5-SR-014 | 原創男孩站在有沙發、茶几與燈具的 living room；空間用途清楚。 |
| HWG5-SR-015 | 綠球直接位在圓桌下方；球、桌面與桌腳完整可見，位置關係明確。 |

## 本機檢查結果

- 15/15 檔案可讀，PNG 簽章正確。
- 15/15 尺寸為 `1280 × 720`。
- 四張時鐘已以接觸表逐張核對指針方向。
- 十一張情境圖已以接觸表核對人物、動作、房間、物件與位置關係。
- 所有公開替代文字沿用教師確認題庫，位置題不直接洩漏答案。
- 最佳化後總大小與逐檔 SHA-256 以 `manifest.json` 為準。

## 教師確認

教師已確認 15 張題圖並授權產生 15 段正式 TTS、啟用 HWG5 SR 與部署。`manifest.json` 的教師確認欄位與題庫 `ready` 狀態已同步更新。自動化視覺 QA 與教師確認都不取代學校實體 iPad Safari 的教室可讀性與麥克風人工驗收。
