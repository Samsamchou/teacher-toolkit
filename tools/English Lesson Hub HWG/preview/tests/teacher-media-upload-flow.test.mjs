import assert from "node:assert/strict";
import test from "node:test";
import { teacherMediaUploadErrorMessage } from "../src/lib/teacher-media-upload-flow.js";

test("teacher media authorization errors explain the deployed Storage rule without a passcode prompt", () => {
  const unauthorized = { code: "storage/unauthorized", message: "Firebase Storage: User does not have permission." };
  const message = teacherMediaUploadErrorMessage(unauthorized);
  assert.equal(message, "上傳未獲得 Firebase Storage 權限，請確認已發布最新教材上傳規則。");
  assert.equal(message.includes("通行碼"), false);
});

test("teacher media errors never expose raw Firebase Storage paths", () => {
  const raw = { code: "storage/unknown", message: "Firebase Storage: no access to teacher-media/hwg7-u01-l01/video/example.mp4" };
  assert.equal(teacherMediaUploadErrorMessage(raw), "教材上傳暫時失敗，請確認網路後再試。");
  assert.equal(teacherMediaUploadErrorMessage({ code: "storage/quota-exceeded" }), "雲端儲存空間不足，暫時無法上傳。");
});
