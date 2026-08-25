import Link from "next/link";
import { chatGPTSignOutPath, requireChatGPTUser } from "@/app/chatgpt-auth";
import { isTeacherAllowed } from "@/lib/teacher-auth";
import { TeacherDashboard } from "./TeacherDashboard";
import "./teacher.css";

export default async function TeacherPage() {
  const user = await requireChatGPTUser("/teacher");
  const allowed = await isTeacherAllowed(user.email);

  return (
    <main className="teacher-shell">
      <header className="teacher-topbar">
        <div>
          <Link href="/" className="teacher-home-link">
            ← 回課程首頁
          </Link>
          <h1>教師後台</h1>
          <p>購票練習紀錄 · 事件重播 · 七頁學習證據</p>
        </div>
        <div className="teacher-account">
          <span>{user.displayName}</span>
          <a href={chatGPTSignOutPath("/")} className="button-secondary">
            登出
          </a>
        </div>
      </header>

      {allowed ? (
        <TeacherDashboard />
      ) : (
        <section className="teacher-blocked">
          <span aria-hidden="true">🔒</span>
          <h2>這個信箱尚未加入教師白名單</h2>
          <p>
            已安全阻擋資料存取。請由網站管理者把目前登入的 ChatGPT
            電子郵件加入 <code>TEACHER_EMAILS</code> 後重新部署。
          </p>
          <p className="teacher-email">{user.email}</p>
        </section>
      )}
    </main>
  );
}
