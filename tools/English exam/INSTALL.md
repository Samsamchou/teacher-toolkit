# 安裝 English exam / Installation

1. 下載本頁提供的 english-exam-v1.0.0.zip，解壓縮到自己方便找到的位置。
2. 確認解壓縮後有 `english-exam/SKILL.md`，以及 references、scripts、examples。
3. 在 Codex 電腦版提供解壓縮位置，貼上以下指令。路徑請換成自己的位置：

```text
請檢查【解壓縮位置】中的 english-exam 技能內容及檔案清單，確認沒有秘密資料或自動付費步驟。將 english-exam 資料夾安裝到這個 Codex 環境支援的個人技能目錄。若已有同名技能，先列出差異並詢問我，不要直接覆寫。不安裝其他技能，不讀取金鑰。安裝後列出實際位置及驗證結果。
```

4. 若目前任務未載入新技能，開啟新任務，必要時重新啟動 Codex，再貼：

```text
請使用 $english-exam。先確認能讀到技能原文與附帶示例，說明它能做與不能做的事。現在只檢查安裝，不出正式考卷、不呼叫付費API。
```

5. 成功載入後，參照 PROMPTS.md。教材放在自己另外指定的資料夾，不必放進技能安裝目錄。

## 驗證 / Optional offline check

由 Codex 找出可用 Python 後執行以下命令，將 `<skill>` 替換成實際技能位置：

```text
python "<skill>/scripts/exam_check.py" "<skill>/examples/reading-plan.json"
python "<skill>/scripts/exam_check.py" "<skill>/examples/listening-plan.json"
```

預期兩者 `ok: true`。這只驗證自製示例資料結構；不代表真實教材已核對或教師驗收。加上 `--release` 應失敗，因示例刻意沒有教師正式驗收紀錄。

本包不提供自動安裝程式，不要求把密碼或API金鑰貼入聊天。Windows／macOS技能路徑與環境支援可能不同，由實際環境確認，不將作者電腦路徑當作同事的路徑。
