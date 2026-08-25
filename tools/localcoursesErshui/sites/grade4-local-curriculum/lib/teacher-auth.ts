import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDbBinding, runtimeEnv } from "./runtime";

export async function isTeacherAllowed(email: string): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  const configured = ((await runtimeEnv()).TEACHER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (configured.includes(normalized)) {
    const now = new Date().toISOString();
    await (await getDbBinding())
      .prepare(
        `INSERT INTO teacher_allowlist
           (email, role, active, created_at, updated_at)
         VALUES (?1, 'admin', 1, ?2, ?2)
         ON CONFLICT(email) DO UPDATE SET active = 1, updated_at = excluded.updated_at`,
      )
      .bind(normalized, now)
      .run();
    return true;
  }

  const row = await (await getDbBinding())
    .prepare(
      "SELECT email FROM teacher_allowlist WHERE email = ?1 AND active = 1",
    )
    .bind(normalized)
    .first();
  return Boolean(row);
}

export async function teacherApiIdentity(): Promise<
  { ok: true; email: string } | { ok: false; status: 401 | 403 }
> {
  const user = await getChatGPTUser();
  if (!user) return { ok: false, status: 401 };
  if (!(await isTeacherAllowed(user.email))) {
    return { ok: false, status: 403 };
  }
  return { ok: true, email: user.email.toLowerCase() };
}
