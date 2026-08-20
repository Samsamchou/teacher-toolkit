import assert from "node:assert/strict";
import test from "node:test";
import { teacherMediaUploadErrorMessage } from "../src/lib/teacher-media-upload-flow.js";

test("direct upload authentication and rule errors are actionable without unlock instructions", () => {
  const unauthenticated = teacherMediaUploadErrorMessage({ code: "storage/unauthenticated" });
  const unauthorized = teacherMediaUploadErrorMessage({ code: "storage/unauthorized" });
  assert.equal(unauthenticated, "匿名登入狀態已失效。請重新整理後再選取圖片。");
  assert.equal(unauthorized, "雲端規則拒絕這次上傳。請確認圖片格式與 20 MB 上限，重新整理後再試。");
  assert.equal(unauthenticated.includes("解鎖"), false);
  assert.equal(unauthorized.includes("解鎖"), false);
});

test("teacher media errors distinguish network failures and never expose raw Firebase Storage paths", () => {
  const raw = { code: "storage/unauthorized", message: "Firebase Storage: no access to teacher-image-slides/hwg7-u01-l01/example.png" };
  const sanitized = teacherMediaUploadErrorMessage(raw);
  assert.equal(sanitized, "雲端規則拒絕這次上傳。請確認圖片格式與 20 MB 上限，重新整理後再試。");
  assert.equal(sanitized.includes("teacher-image-slides/"), false);
  assert.equal(teacherMediaUploadErrorMessage({ code: "storage/retry-limit-exceeded" }), "上傳網路連線中斷，請確認網路後再試。");
  assert.equal(teacherMediaUploadErrorMessage({ code: "storage/quota-exceeded" }), "雲端儲存空間不足，暫時無法上傳。");
});
