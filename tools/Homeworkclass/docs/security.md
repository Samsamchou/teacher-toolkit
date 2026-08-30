# Firebase 安全基線 / Firebase Security Baseline

## 目前狀態 / Current status

這份專案已有**本機／Emulator 安全基線與正式部署讀回**。2026-08-29 在教師逐項授權下，`hwclass-479d2` 已完成 Firestore、Rules／Indexes、Secret Manager、App Check、Firebase Authentication、第二代 callable、最小 IAM 與 Hosting 部署。正式通行碼登入、custom token、App Check 及重新整理後工作階段已驗證；本次驗證未建立或刪除正式教學紀錄。

This project has both an Emulator security baseline and a read-back production deployment. Live custom-token sign-in, App Check, Authentication, and session persistence after reload passed on 2026-08-29. No production teaching record was created or deleted during this verification.

正式專案為 `hwclass-479d2`，網址為 <https://hwclass-479d2.web.app>。部署證據見 `docs/production-deployment-20260829.md`；`.firebaserc` 本身仍不是部署證明。

The production target is `hwclass-479d2`. The dated deployment record, rather than `.firebaserc`, is the evidence for its current state.

## 安全架構 / Security architecture

1. 首頁只把六位數通行碼送到 callable v2 Function `verifyTeacherPin`；通行碼不進入前端原始碼、Firestore 或 Git。
2. Function 使用 Secret Manager 中的 `TEACHER_PIN_BCRYPT_HASH` 做 bcrypt 比對，成功後只簽發固定 uid `homeworkclass-teacher`、claim `role: teacher` 的 Firebase custom token。
3. 正式執行環境強制 App Check；Functions Emulator 才會停用 enforcement，讓本機測試不需要正式 App Check token。
4. 來源 IP 只在 Function 記憶體中短暫出現，使用秘密 `RATE_LIMIT_IP_SALT` 做 HMAC-SHA-256；Firestore 只保存加鹽雜湊文件 ID，不保存原始 IP。
5. 同一 IP 連續錯誤 5 次會鎖定 15 分鐘；成功登入會刪除該 IP 的失敗紀錄。失敗紀錄另含 `expiresAt`，建議正式啟用 Firestore TTL 以移除 24 小時未再使用的紀錄。
6. Firestore Rules 同時要求固定 uid 與 `role: teacher`；單有其中一項仍會被拒絕。
7. 作業、繳交、課堂事件與課表異動只能新增，瀏覽器不能更新或刪除。補交與修正必須新增事件，保留歷程。
8. `_securityRateLimits` 對所有瀏覽器用戶拒絕讀寫；Admin SDK 在可信任的 Function 內使用，並會繞過 Security Rules，因此 Function 程式碼本身是此集合的安全邊界。

1. The homepage sends the six-digit PIN only to callable v2 Function `verifyTeacherPin`; the PIN never belongs in frontend source, Firestore, or Git.
2. The Function compares against Secret Manager value `TEACHER_PIN_BCRYPT_HASH`, then mints a custom token with fixed uid `homeworkclass-teacher` and claim `role: teacher`.
3. App Check is enforced in production. Only the Functions Emulator disables enforcement for local testing.
4. A raw source IP exists only briefly in Function memory. It is HMAC-SHA-256 hashed with secret `RATE_LIMIT_IP_SALT`; Firestore stores only the salted digest as a document ID.
5. Five failures from one IP trigger a 15-minute lock. A successful sign-in deletes that IP's counter. Records also include `expiresAt`; enable Firestore TTL in production to remove records unused for 24 hours.
6. Firestore Rules require both the fixed uid and teacher role claim.
7. Assignments, submissions, classroom incidents, and timetable exceptions are append-only from browsers.
8. Browser clients cannot access `_securityRateLimits`. The trusted Function uses Admin SDK, which bypasses Rules, so the Function code is the boundary for that collection.

官方參考 / Official references:

- [Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens)
- [Cloud Functions secrets](https://firebase.google.com/docs/functions/config-env#secret_parameters)
- [Cloud Functions App Check enforcement](https://firebase.google.com/docs/app-check/cloud-functions)
- [Firestore field validation](https://firebase.google.com/docs/firestore/security/rules-fields)

## Firestore 權限矩陣 / Firestore access matrix

| Collection | Teacher read | Teacher create | Teacher update | Teacher delete | Validation |
|---|---:|---:|---:|---:|---|
| `assignments` | Yes | Yes | No | No | exact fields, class, subject, date, period, homework type |
| `submissionEvents` | Yes | Yes | No | No | assignment exists, same class, valid seat/reason/outcome |
| `classroomIncidents` | Yes | Yes | No | No | valid class/subject/seat/category/weight; seat or factual note required |
| `timetableExceptions` | Yes | Yes | No | No | valid cancel/add shape and replacement slot |
| `settings/main` | Yes | Yes | Yes | No | only bounded attention weights and threshold |
| `_securityRateLimits` | No | No | No | No | Admin SDK only |
| everything else | No | No | No | No | default deny |

有效座號由 Rules 再次驗證：四甲 3 號與三甲 8 號一定被拒絕。欄位白名單也會拒絕姓名等未核准欄位。

Valid seats are revalidated in Rules: 四甲 seat 3 and 三甲 seat 8 are always rejected. Exact field allowlists also reject unapproved fields such as student names.

## 本機安裝與檢查 / Local install and verification

以下操作只在專案資料夾執行，不需要 Firebase 登入：

```powershell
npm.cmd install
npm.cmd --prefix functions install
npm.cmd --prefix functions run build
npm.cmd run test:rules
```

`test:rules` 需要 Firebase CLI 可啟動 Firestore Emulator，也需要該 Firebase CLI 版本支援的 Java。測試包含：未登入拒絕、錯誤 uid／role 拒絕、教師允許、欄位白名單、有效座號、作業／事件類別、國定假日／撤銷目標驗證，以及不可覆寫／刪除事件。2026-08-29 本機增量為 12/12 通過，尚未部署這次 Rules 變更。

`test:rules` requires a Firebase CLI-compatible Java runtime. It covers unauthenticated denial, wrong uid/role denial, teacher access, field allowlists, valid seats, allowed categories, and append-only history.

### Emulator 假資料 / Emulator-only seed

`scripts/seed-emulator.mjs` 在任何寫入前先檢查 `FIRESTORE_EMULATOR_HOST`，且只接受 `localhost`、`127.0.0.1` 或 `::1` 加明確連接埠。缺少或使用非本機位址時會直接拒絕。通過 loopback 驗證後才使用 Emulator 專用的本機 owner token 寫入 6 筆固定假資料；不需要也不讀取服務帳戶，假資料不含姓名。

`scripts/seed-emulator.mjs` checks `FIRESTORE_EMULATOR_HOST` before any write and accepts only loopback hosts with an explicit port. Only after that check does it use the Emulator-only local owner token to write six fixed demo documents. It neither needs nor reads a service account, and the demo records contain no names.

可由 Emulator 包住 seed 指令，讓 CLI 自動提供環境變數：

```powershell
npx.cmd firebase-tools emulators:exec --only firestore "npm.cmd run seed:emulator"
```

直接執行 `npm.cmd run seed:emulator` 而沒有 Emulator 環境變數，預期會安全失敗。

Running `npm.cmd run seed:emulator` directly without the Emulator environment is expected to fail safely.

## 本機 Function 秘密 / Local Function secrets

六位通行碼請由教師本人在互動式終端機輸入。工具會遮蔽輸入，只輸出 bcrypt hash；不要把 PIN 傳給協作者，也不要把 hash 當成公開資料。

The teacher should personally enter the PIN in an interactive terminal. The helper masks input and emits only the bcrypt hash. Do not share the PIN, and still treat the hash as a secret because a six-digit PIN has limited entropy.

```powershell
npm.cmd --prefix functions run hash:pin
```

另以密碼學安全亂數產生至少 32-byte 的 IP HMAC salt。指令本身不含秘密，但輸出必須妥善保管：

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

僅供 Emulator 時，可由教師本人建立**不提交 Git** 的 `functions/.secret.local`：

```dotenv
TEACHER_PIN_BCRYPT_HASH=<teacher-generated bcrypt hash>
RATE_LIMIT_IP_SALT=<teacher-generated random salt>
```

`.secret.local` 必須在 `.gitignore`；App Check debug token、服務帳戶 JSON、PIN、hash、salt 與 token 都不可提交。Emulator 不應讀取正式 Secret Manager 值。

`functions/.secret.local` must be ignored. Never commit App Check debug tokens, service-account JSON, PINs, hashes, salts, or session tokens. The Emulator should not read production Secret Manager values.

## 正式環境狀態與後續關卡 / Production status and future gates

2026-08-29 已完成並讀回：

1. Web App、project id、`asia-east1`、Hosting site 與 Blaze 狀態。
2. reCAPTCHA Enterprise App Check 註冊；正式 callable 強制 `enforceAppCheck: true`，正式請求日誌顯示 token 有效。
3. 教師本人透過遮蔽輸入建立兩個 Secret Manager secrets；秘密值未進入聊天、原始碼或 Git。
4. Functions runtime service account 只在自身資源取得 `roles/iam.serviceAccountTokenCreator`；未下載服務帳戶金鑰。
5. Authentication 已初始化，所有內建登入供應商維持關閉；custom-token 登入及重新整理後工作階段通過。
6. Rules、Indexes、Function 與 Hosting 已部署並讀回。

仍是後續獨立關卡：

1. `_securityRateLimits.expiresAt` TTL 尚未啟用。
2. Firestore 產品層 App Check enforcement 尚未另行開啟；目前 Firestore 由 Auth＋Rules 保護。
3. 五次錯誤鎖 15 分鐘、30 分鐘閒置與 7 天到期仍需完整時間型驗收。
4. 正式資料寫入、完整匯出讀回及任何資料清理需要教師另行確認。
5. 未來 Secrets、IAM、Rules、App Check、Functions 或 Hosting 變更仍需明確授權。

## 兩學期保存與受控刪除 / Two-semester retention and controlled deletion

本版**不會自動刪除**超過兩學期的資料，也沒有提供瀏覽器刪除權限。介面只能提示「待匯出／待歸檔」；教師完成匯出與讀回、再明確確認之前，資料必須保持不變。

This version **does not automatically delete** records older than two semesters and grants no browser delete permission. The UI may only mark them as pending export/archive; records remain unchanged until the teacher completes export/readback and explicitly confirms deletion.

未來若要加入 `purgeArchivedSemester`，必須另行設計、測試與授權，最低要求如下：

- callable 同時驗證固定 teacher uid、`role: teacher` 與正式 App Check。
- 先執行唯讀 dry run，回傳學期、collection 與筆數；不可接受任意路徑或任意日期範圍。
- 刪除請求必須攜帶後端簽發、短效且單次使用的匯出確認憑證；憑證綁定 export id、內容雜湊、學期、筆數與確認時間。
- 實際刪除前再次比對筆數／邊界，分批處理，並以獨立 append-only audit event 記錄操作者、範圍、匯出憑證與結果。
- 任何不一致都要 fail closed；不得用布林值 `confirmed: true` 取代可驗證的匯出收據。
- Function、TTL、IAM 與正式刪除都需要獨立部署授權與刪除後讀回。

A future `purgeArchivedSemester` requires separate design, tests, and authorization: fixed teacher uid/claim plus App Check; a read-only dry run; server-issued short-lived single-use export receipt bound to export id/hash, semester, count, and confirmation time; bounded batch deletion; append-only audit evidence; fail-closed count/boundary rechecks; and separate deployment/deletion approval. A client boolean such as `confirmed: true` is not sufficient evidence.

## 已知限制 / Known limitations

- 六位數 PIN 不是高熵密碼或多因素驗證。App Check、bcrypt 與每 IP 限流只降低風險，不能消除 PIN 被旁觀、釣魚或共用的風險。
- 校園共用 NAT 可能讓同一出口 IP 的教師裝置一起被鎖 15 分鐘；本系統只有一位教師，這是選定的安全取捨。
- 瀏覽器端正式資料還原不應取得 delete/update 權限。展示模式可本機還原；雲端還原必須另做受控、可稽核的 Admin 匯入流程。
- Firestore Rules 測試不能證明 App Check、IAM、custom-token signing 或真實裝置流程已在線上成功；這些都需要後續明確授權與讀回證據。

- A six-digit PIN is not a high-entropy password or MFA. App Check, bcrypt, and per-IP limiting reduce but do not eliminate observation, phishing, or sharing risk.
- A school NAT may cause teacher devices sharing one public IP to share the 15-minute lock.
- Browser clients intentionally cannot perform destructive cloud restore. Production restore needs a separate audited Admin workflow.
- Emulator Rules tests do not prove live App Check, IAM, token signing, or real-device success.
