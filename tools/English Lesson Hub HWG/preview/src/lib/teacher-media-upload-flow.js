const AUTHORIZATION_CODES = new Set(["storage/unauthorized", "storage/unauthenticated"]);

export function teacherMediaUploadErrorMessage(error) {
  if (AUTHORIZATION_CODES.has(String(error?.code || ""))) {
    return "上傳未獲得 Firebase Storage 權限，請確認已發布最新教材上傳規則。";
  }
  const code = String(error?.code || "");
  if (code === "storage/canceled") return "已取消上傳。";
  if (code === "storage/quota-exceeded") return "雲端儲存空間不足，暫時無法上傳。";
  if (code === "storage/retry-limit-exceeded") return "上傳連線逾時，請確認網路後再試。";
  const message = String(error?.message || "").trim();
  return /[\u3400-\u9fff]/.test(message) ? message : "教材上傳暫時失敗，請確認網路後再試。";
}
