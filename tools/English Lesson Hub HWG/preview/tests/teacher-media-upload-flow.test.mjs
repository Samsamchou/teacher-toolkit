import assert from "node:assert/strict";
import test from "node:test";
import { teacherMediaUploadErrorMessage } from "../src/lib/teacher-media-upload-flow.js";

test("missing or expired teacher unlock gives an actionable prompt without a passcode field", () => {
  const required = teacherMediaUploadErrorMessage({ code: "teacher-media-unlock-required" });
  const expired = teacherMediaUploadErrorMessage({ code: "teacher-media-unlock-expired" });
  assert.equal(required, "圖片上傳尚未解鎖。請到 Results 建立並開啟一次性教師解鎖連結。");
  assert.equal(expired, "圖片上傳解鎖已過期。請重新建立並開啟一次性教師解鎖連結。");
  assert.equal(required.includes("通行碼"), false);
});

test("Storage rule rejection stays distinct from a missing unlock", () => {
  const denied = teacherMediaUploadErrorMessage({ code: "teacher-media-storage-rules-denied" });
  const unauthorized = teacherMediaUploadErrorMessage({ code: "storage/unauthorized" });
  assert.match(denied, /雲端圖片規則拒絕/);
  assert.match(unauthorized, /上傳權限仍未生效/);
});

test("teacher media errors distinguish network failures and never expose raw Firebase Storage paths", () => {
  const raw = { code: "storage/unauthorized", message: "Firebase Storage: no access to teacher-image-slides/hwg7-u01-l01/example.png" };
  const sanitized = teacherMediaUploadErrorMessage(raw);
  assert.equal(sanitized, "上傳權限仍未生效。請重新開啟教師解鎖連結；若仍失敗，請保留此提示供檢查。");
  assert.equal(sanitized.includes("teacher-image-slides/"), false);
  assert.equal(teacherMediaUploadErrorMessage({ code: "storage/retry-limit-exceeded" }), "上傳網路連線中斷，請確認網路後再試。");
  assert.equal(teacherMediaUploadErrorMessage({ code: "storage/quota-exceeded" }), "雲端儲存空間不足，暫時無法上傳。");
});
