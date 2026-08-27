#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const REQUIRED_PRONUNCIATION = ["difficultWords", "stress", "linking", "rhythm", "intonation", "scoringFocus"];
const EXPECTED_PROJECT = "hwg5-su-to-u04-story";
const EXPECTED_URL = "https://hwg5-su-to-u04-story.web.app";
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const SAFE_SLUG = /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/;

function usage() {
  console.log(`Usage:
  node story-site-tool.mjs validate --input <content.json>
  node story-site-tool.mjs dry-run-extend --project <path> --input <content.json> --output <empty-dir>
  node story-site-tool.mjs dry-run-new --input <content.json> --output <empty-dir>`);
}

function parseArgs(argv) {
  const command = argv[2];
  const options = {};
  for (let i = 3; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith("--") || value === undefined) throw new Error(`無效參數：${key ?? "(空白)"}`);
    options[key.slice(2)] = value;
  }
  return { command, options };
}

function readJson(filePath) {
  const absolute = path.resolve(filePath);
  return { absolute, data: JSON.parse(fs.readFileSync(absolute, "utf8")) };
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateContent(doc, expectedMode = null) {
  const errors = [];
  const warnings = [];
  const itemIds = new Set();
  const unitKeys = new Set();
  let itemCount = 0;

  if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
    return { valid: false, errors: ["根節點必須是 JSON 物件。"], warnings, stats: { unitCount: 0, itemCount: 0 } };
  }
  if (doc.schemaVersion !== "1.0") errors.push("schemaVersion 必須是 1.0。");
  if (!["extend-existing", "new-site"].includes(doc.mode)) errors.push("mode 必須是 extend-existing 或 new-site。");
  if (expectedMode && doc.mode !== expectedMode) errors.push(`此指令只接受 mode=${expectedMode}。`);

  if (!nonEmpty(doc.site?.name)) errors.push("site.name 不可空白。");
  if (doc.mode === "extend-existing") {
    if (doc.site?.targetProjectId !== EXPECTED_PROJECT) errors.push(`擴增模式 targetProjectId 必須是 ${EXPECTED_PROJECT}。`);
    if (doc.site?.productionUrl !== EXPECTED_URL) errors.push(`擴增模式 productionUrl 必須是 ${EXPECTED_URL}。`);
    if (doc.site?.slug !== null) warnings.push("擴增模式不使用 site.slug，建議設為 null。");
  }
  if (doc.mode === "new-site") {
    if (!SAFE_SLUG.test(doc.site?.slug ?? "")) errors.push("新站 site.slug 必須是 3-63 字元的小寫英數連字號格式。");
    if (doc.site?.targetProjectId !== null) errors.push("新站 dry run 的 site.targetProjectId 必須是 null，避免誤連正式專案。");
    if (doc.site?.productionUrl !== null) errors.push("新站 dry run 的 site.productionUrl 必須是 null。");
  }

  const approval = doc.teacherApproval;
  for (const field of ["contentBankConfirmed", "installSkillConfirmed", "productionDeployConfirmed"]) {
    if (typeof approval?.[field] !== "boolean") errors.push(`teacherApproval.${field} 必須是布林值。`);
  }
  if (approval?.contentBankConfirmed || approval?.installSkillConfirmed || approval?.productionDeployConfirmed) {
    warnings.push("此檔案含批准旗標；腳本只做 dry run，旗標不會觸發安裝或部署。外部動作仍需當次明確授權。");
  }

  if (!Number.isInteger(doc.policy?.classSize) || doc.policy.classSize < 1) errors.push("policy.classSize 必須是正整數。");
  if (doc.policy?.maxScoredAttemptsPerItemPerDay !== 3) errors.push("policy.maxScoredAttemptsPerItemPerDay 必須是 3。");
  if (doc.policy?.recordRetentionCalendarMonths !== 7) errors.push("policy.recordRetentionCalendarMonths 必須是 7。");

  if (!Array.isArray(doc.units) || doc.units.length === 0) {
    errors.push("units 至少要有一個單元。");
  } else {
    for (const [unitIndex, unit] of doc.units.entries()) {
      const prefix = `units[${unitIndex}]`;
      if (!SAFE_ID.test(unit?.theme ?? "")) errors.push(`${prefix}.theme 格式不合法。`);
      if (!SAFE_ID.test(unit?.unit ?? "")) errors.push(`${prefix}.unit 格式不合法。`);
      const unitKey = `${unit?.theme}-${unit?.unit}`;
      if (unitKeys.has(unitKey)) errors.push(`單元 key 重複：${unitKey}。`);
      unitKeys.add(unitKey);
      if (!nonEmpty(unit?.label)) errors.push(`${prefix}.label 不可空白。`);
      if (!Array.isArray(unit?.items) || unit.items.length === 0) {
        errors.push(`${prefix}.items 至少要有一句。`);
        continue;
      }
      for (const [itemIndex, item] of unit.items.entries()) {
        const itemPrefix = `${prefix}.items[${itemIndex}]`;
        itemCount += 1;
        if (!SAFE_ID.test(item?.id ?? "")) errors.push(`${itemPrefix}.id 格式不合法。`);
        if (itemIds.has(item?.id)) errors.push(`item id 重複：${item?.id}。`);
        itemIds.add(item?.id);
        if (!nonEmpty(item?.text)) errors.push(`${itemPrefix}.text 不可空白。`);
        if (!nonEmpty(item?.translation)) errors.push(`${itemPrefix}.translation 不可空白。`);
        for (const field of REQUIRED_PRONUNCIATION) {
          if (field === "difficultWords") {
            if (!Array.isArray(item?.pronunciation?.difficultWords)) errors.push(`${itemPrefix}.pronunciation.difficultWords 必須是陣列。`);
          } else if (!nonEmpty(item?.pronunciation?.[field])) {
            errors.push(`${itemPrefix}.pronunciation.${field} 不可空白。`);
          }
        }
        if (Array.isArray(item?.pronunciation?.difficultWords)) {
          for (const [wordIndex, word] of item.pronunciation.difficultWords.entries()) {
            for (const field of ["word", "ipa", "tip"]) {
              if (!nonEmpty(word?.[field])) errors.push(`${itemPrefix}.pronunciation.difficultWords[${wordIndex}].${field} 不可空白。`);
            }
          }
        }
        if (item?.tts?.ssml !== undefined) {
          if (!nonEmpty(item.tts.ssml) || !/^<speak>[\s\S]*<\/speak>$/.test(item.tts.ssml.trim())) {
            errors.push(`${itemPrefix}.tts.ssml 必須是完整 <speak>...</speak>。`);
          }
        }
      }
    }
  }

  if (doc.mode === "extend-existing" && unitKeys.size > 1) {
    errors.push("擴增正式站一次 dry run 只能處理一個單元，避免混合變更。");
  }

  const serialized = JSON.stringify(doc);
  const secretPatterns = [
    [/AIza[0-9A-Za-z_-]{20,}/, "偵測到疑似 Google API key"],
    [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "偵測到私鑰"],
    [/\"(?:apiKey|debugToken|recaptchaKey|private_key)\"\s*:/i, "偵測到不應放入內容檔的敏感設定欄位"]
  ];
  for (const [pattern, message] of secretPatterns) if (pattern.test(serialized)) errors.push(`${message}。`);

  const theoryDailyAttempts = Number.isInteger(doc.policy?.classSize)
    ? doc.policy.classSize * itemCount * (doc.policy?.maxScoredAttemptsPerItemPerDay ?? 0)
    : null;
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: { unitCount: Array.isArray(doc.units) ? doc.units.length : 0, itemCount, theoryDailyAttempts }
  };
}

function ensureOutput(outputPath) {
  const absolute = path.resolve(outputPath);
  if (fs.existsSync(absolute) && fs.readdirSync(absolute).length > 0) {
    throw new Error(`輸出資料夾不是空白，拒絕覆寫：${absolute}`);
  }
  fs.mkdirSync(absolute, { recursive: true });
  return absolute;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeText(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value, "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapeXml(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

function focusFrom(item) {
  const p = item.pronunciation;
  const words = p.difficultWords.map((entry) => `${entry.word} ${entry.ipa}：${entry.tip}`).join("；");
  return [words ? `難字：${words}` : "難字：無", `重音：${p.stress}`, `連音：${p.linking}`, `節奏：${p.rhythm}`, `語調：${p.intonation}`, `評分：${p.scoringFocus}`].join(" ");
}

function ssmlFrom(item) {
  return item.tts?.ssml?.trim() || `<speak>${escapeXml(item.text)}</speak>`;
}

function normalize(doc) {
  return {
    ...doc,
    units: doc.units.map((unit) => ({
      ...unit,
      items: unit.items.map((item) => ({
        ...item,
        text: item.text.trim(),
        translation: item.translation.trim(),
        derived: {
          currentSiteFocus: focusFrom(item),
          ssml: ssmlFrom(item),
          ssmlWasGenerated: !item.tts?.ssml
        }
      }))
    }))
  };
}

function currentSiteAdapter(doc) {
  const unit = doc.units[0];
  const dictionary = {};
  for (const item of unit.items) {
    for (const entry of item.pronunciation.difficultWords) {
      const key = entry.word.toLowerCase();
      dictionary[key] ??= {
        zh: "待教師確認",
        tip: `${entry.ipa}；${entry.tip}`,
        ssml: `<speak><prosody rate='slow'><emphasis level='strong'>${escapeXml(entry.word)}</emphasis></prosody></speak>`
      };
    }
  }
  return {
    targetKey: `${unit.theme}-${unit.unit}`,
    practiceData: unit.items.map((item) => ({
      id: item.id,
      en: item.text,
      zh: item.translation,
      focus: focusFrom(item),
      ssml: ssmlFrom(item)
    })),
    dictionaryCandidates: dictionary,
    note: "dry run 轉接資料；未經教師確認不得貼入 public/index.html。"
  };
}

function snapshotExistingProject(projectPath) {
  const absolute = path.resolve(projectPath);
  const required = [
    "public/index.html",
    "public/ai-scoring.js",
    "public/ai-scoring-core.js",
    "functions/index.js",
    "firebase.json",
    "firestore.indexes.json"
  ];
  const files = {};
  for (const relative of required) {
    const full = path.join(absolute, relative);
    if (!fs.existsSync(full)) throw new Error(`既有站缺少必要檔案：${relative}`);
    const content = fs.readFileSync(full);
    files[relative] = { bytes: content.length, sha256: sha256(content) };
  }
  const html = fs.readFileSync(path.join(absolute, "public/index.html"), "utf8");
  for (const marker of ["allPracticeData", "MAX_SCORED_ATTEMPTS_PER_ITEM", "RECORD_RETENTION_MONTHS", "scoreAudio"]) {
    if (!html.includes(marker)) throw new Error(`既有站基線標記不存在：${marker}`);
  }
  const unitKeys = [...html.matchAll(/\"([A-Z0-9]+-(?:SU|U\d{2}))\"\s*:\s*\[/g)].map((match) => match[1]);
  return { projectPath: absolute, files, detectedUnitKeys: [...new Set(unitKeys)] };
}

function approvalGates(doc) {
  return {
    currentState: "DRY_RUN_ONLY",
    contentWriteAllowed: false,
    skillInstallAllowed: false,
    productionDeployAllowed: false,
    requiredPhrases: ["確認內容", "確認安裝 Skill", "確認正式部署"],
    note: "JSON 中的布林旗標不會授權外部動作；必須由教師在當次對話明確確認。",
    suppliedFlags: doc.teacherApproval
  };
}

function reportHeader(doc, validation) {
  return `# Dry-run 報告\n\n- 模式：\`${doc.mode}\`\n- 網站：${doc.site.name}\n- 單元數：${validation.stats.unitCount}\n- 句數：${validation.stats.itemCount}\n- 班級估算：${doc.policy.classSize} 人\n- 每題每日最多計分：${doc.policy.maxScoredAttemptsPerItemPerDay} 次\n- 理論每日評分上限：${validation.stats.theoryDailyAttempts} 次\n- 錄音保存：建立日起 7 個月曆月；雲端清理可能延遲\n\n`;
}

function runExtend(doc, projectPath, outputPath, validation) {
  const output = ensureOutput(outputPath);
  const snapshot = snapshotExistingProject(projectPath);
  const normalized = normalize(doc);
  const adapter = currentSiteAdapter(doc);
  const collision = snapshot.detectedUnitKeys.includes(adapter.targetKey);
  writeJson(path.join(output, "validation.json"), validation);
  writeJson(path.join(output, "normalized-content.json"), normalized);
  writeJson(path.join(output, "current-site-adapter.json"), adapter);
  writeJson(path.join(output, "current-source-snapshot.json"), snapshot);
  writeJson(path.join(output, "approval-gates.json"), approvalGates(doc));
  writeJson(path.join(output, "change-plan.json"), {
    targetProjectId: EXPECTED_PROJECT,
    targetUrl: EXPECTED_URL,
    intendedFilesAfterApproval: ["public/index.html", "tests/content-data.test.mjs"],
    preserve: ["UI fields", "structured AI score schema", "App Check", "TTS callable", "reading_records schema", "7-calendar-month expiry"],
    unitCollision: collision,
    sourceModified: false,
    deployed: false
  });
  const collisionText = collision
    ? "⚠️ 目標單元 key 已存在；正式實作前必須逐題人工合併，不可覆蓋。"
    : "目標單元 key 尚未出現在既有題庫，可進入教師內容審核。";
  writeText(path.join(output, "DRY-RUN-REPORT.md"), `${reportHeader(doc, validation)}## 結果\n\n- ${collisionText}\n- 已建立既有欄位相容轉接資料與來源 SHA-256 快照。\n- **未修改任何來源檔、未安裝 Skill、未連線 Firebase、未部署。**\n- 樣本句只用於驗證流程，不是 HWG5 U04 正式題庫。\n\n## 下一個閘門\n\n教師提供真正的 HWG5 U04 句子與逐句發音分析並回讀無誤後，需明確回覆 \`確認內容\`，才可寫入本機來源。Skill 安裝與正式部署仍各自需要另行確認。\n`);
  return output;
}

function previewHtml(doc) {
  const safeName = doc.site.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return `<!doctype html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${safeName} - Dry Run</title>
  <style>
    :root{font-family:system-ui,-apple-system,"Noto Sans TC",sans-serif;color:#172554;background:#eff6ff}body{margin:0}.wrap{max-width:920px;margin:auto;padding:24px}.gate{background:#7f1d1d;color:#fff;padding:14px 18px;font-weight:800;border-radius:14px}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}select{font:inherit;padding:10px 14px;border:2px solid #93c5fd;border-radius:12px}.card{background:white;border:3px solid #bfdbfe;border-radius:20px;padding:20px;margin:16px 0;box-shadow:0 6px 16px #1e3a8a18}h1{color:#1d4ed8}.sentence{font-size:1.7rem;font-weight:900;color:#111827}.zh{font-size:1.1rem;color:#475569}.grid{display:grid;grid-template-columns:9rem 1fr;gap:7px 12px}.label{font-weight:800;color:#4338ca}.word{display:inline-block;background:#ede9fe;border-radius:10px;padding:6px 9px;margin:3px}.empty{padding:30px;text-align:center}small{color:#475569}
  </style>
</head>
<body>
  <main class="wrap">
    <div class="gate">DRY RUN：只供教師審核內容；沒有錄音、AI、TTS、Firebase 或正式部署。</div>
    <h1>${safeName}</h1>
    <div class="controls"><label>主題／單元 <select id="unit"></select></label></div>
    <section id="cards"></section>
    <small>樣本內容不是正式題庫。教師確認後才可進入本機完整網站實作。</small>
  </main>
  <script src="site-content.js"></script>
  <script>
    const units = window.SITE_CONTENT.units;
    const select = document.getElementById('unit');
    const cards = document.getElementById('cards');
    for (const [index, unit] of units.entries()) {
      const option = document.createElement('option'); option.value = index; option.textContent = unit.theme + ' / ' + unit.unit + ' — ' + unit.label; select.append(option);
    }
    const safe = (value) => { const el=document.createElement('span'); el.textContent=value; return el.innerHTML; };
    function render() {
      const unit = units[Number(select.value || 0)];
      cards.innerHTML = unit.items.map((item, index) => '<article class="card"><div class="sentence">' + (index+1) + '. ' + safe(item.text) + '</div><p class="zh">' + safe(item.translation) + '</p><div class="grid"><div class="label">難字</div><div>' + (item.pronunciation.difficultWords.map(w => '<span class="word">' + safe(w.word) + ' ' + safe(w.ipa) + '：' + safe(w.tip) + '</span>').join('') || '無') + '</div><div class="label">重音</div><div>' + safe(item.pronunciation.stress) + '</div><div class="label">連音</div><div>' + safe(item.pronunciation.linking) + '</div><div class="label">節奏</div><div>' + safe(item.pronunciation.rhythm) + '</div><div class="label">語調</div><div>' + safe(item.pronunciation.intonation) + '</div><div class="label">評分焦點</div><div>' + safe(item.pronunciation.scoringFocus) + '</div></div></article>').join('');
    }
    select.addEventListener('change', render); render();
  </script>
</body>
</html>
`;
}

function runNew(doc, outputPath, validation) {
  const output = ensureOutput(outputPath);
  const normalized = normalize(doc);
  const previewDir = path.join(output, "preview", "public");
  const browserData = JSON.stringify(doc).replaceAll("</script", "<\\/script");
  writeJson(path.join(output, "validation.json"), validation);
  writeJson(path.join(output, "normalized-content.json"), normalized);
  writeJson(path.join(output, "approval-gates.json"), approvalGates(doc));
  writeText(path.join(previewDir, "site-content.js"), `window.SITE_CONTENT = ${browserData};\n`);
  writeText(path.join(previewDir, "index.html"), previewHtml(doc));
  writeJson(path.join(output, "proposed-project-tree.json"), {
    generatedInDryRun: ["preview/public/index.html", "preview/public/site-content.js"],
    plannedAfterContentApproval: [
      "public/index.html", "public/site-content.js", "public/ai-scoring.js", "public/ai-scoring-core.js",
      "functions/index.js", "firestore.rules", "storage.rules", "firebase.json", "tests/"
    ],
    firebaseConfigured: false,
    aiConfigured: false,
    ttsConfigured: false,
    deployed: false
  });
  writeText(path.join(output, "DRY-RUN-REPORT.md"), `${reportHeader(doc, validation)}## 結果\n\n- 已生成可離線開啟的題庫與發音分析預覽：\`preview/public/index.html\`。\n- 已生成正規化內容與預計專案樹。\n- **預覽不含錄音、AI、TTS、Firebase、教師登入或正式部署。**\n- 樣本句只用於驗證重製流程，不是教師正式題庫。\n\n## 下一個閘門\n\n教師提供真正的網站名稱、主題單元與逐句發音分析，回讀無誤後需明確回覆 \`確認內容\`，才可建立本機完整新站。Skill 安裝與正式部署仍各自需要另行確認。\n`);
  return output;
}

function main() {
  const { command, options } = parseArgs(process.argv);
  if (!command || !options.input || !["validate", "dry-run-extend", "dry-run-new"].includes(command)) {
    usage();
    process.exitCode = 2;
    return;
  }
  const { absolute: inputPath, data: doc } = readJson(options.input);
  const expectedMode = command === "dry-run-extend" ? "extend-existing" : command === "dry-run-new" ? "new-site" : null;
  const validation = validateContent(doc, expectedMode);
  if (command === "validate") {
    console.log(JSON.stringify({ inputPath, ...validation }, null, 2));
    if (!validation.valid) process.exitCode = 1;
    return;
  }
  if (!validation.valid) {
    console.error(JSON.stringify(validation, null, 2));
    process.exitCode = 1;
    return;
  }
  if (!options.output) throw new Error("dry run 缺少 --output。");
  let output;
  if (command === "dry-run-extend") {
    if (!options.project) throw new Error("dry-run-extend 缺少 --project。");
    output = runExtend(doc, options.project, options.output, validation);
  } else {
    output = runNew(doc, options.output, validation);
  }
  console.log(JSON.stringify({ ok: true, command, inputPath, output, validation }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
}
