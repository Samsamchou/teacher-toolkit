export type RuntimeEnv = {
  DB: D1Database;
  EVIDENCE_BUCKET: R2Bucket;
  TEACHER_EMAILS?: string;
};

export async function runtimeEnv(): Promise<RuntimeEnv> {
  const workers = await import("cloudflare:workers");
  return workers.env as unknown as RuntimeEnv;
}

export async function getDbBinding(): Promise<D1Database> {
  const db = (await runtimeEnv()).DB;
  if (!db) throw new Error("D1 binding DB is unavailable.");
  return db;
}

export async function getEvidenceBucket(): Promise<R2Bucket> {
  const bucket = (await runtimeEnv()).EVIDENCE_BUCKET;
  if (!bucket) throw new Error("R2 binding EVIDENCE_BUCKET is unavailable.");
  return bucket;
}
