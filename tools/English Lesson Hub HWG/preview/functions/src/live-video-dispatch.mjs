export async function dispatchVideoJob({ id, workerUrl, enabled, getClient }) {
  if (!enabled) return { disabled: true };
  let url;
  try {
    url = new URL(workerUrl);
  } catch {
    throw new Error("Worker URL not configured");
  }
  if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".run.app") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error("Worker must use an exact Cloud Run HTTPS origin");
  if (!/^cloud-[a-f0-9-]{36}$/.test(id || ""))
    throw new Error("Invalid job ID");
  const client = await getClient(url.origin);
  const response = await client.request({
    url: url.origin + "/transcode",
    method: "POST",
    data: { assetId: id },
    timeout: 9 * 60000,
    retry: false,
  });
  if (!["ready", "failed"].includes(response.data?.status))
    throw new Error("Worker has not completed this job");
  return response.data;
}

// Eventarc has no bounded retry count. A failed delivery becomes a teacher-visible,
// manually retryable job; neither an unbounded retry loop nor a lost queued job.
export async function failQueuedVideoDispatch({ db, id }) {
  if (!/^cloud-[a-f0-9-]{36}$/.test(id || ""))
    throw new Error("Invalid job ID");
  const jobRef = db.collection("liveVideoJobsV2").doc(id);
  const assetRef = db.collection("liveMediaV2").doc(id);
  return db.runTransaction(async (tx) => {
    const [job, asset] = await Promise.all([
      tx.get(jobRef),
      tx.get(assetRef),
    ]);
    if (!job.exists || job.data().status !== "queued") return false;
    const error = "影片服務暫時無法接通；原檔已保留，請教師重試。";
    tx.update(jobRef, {
      status: "failed",
      attempts: Math.min(3, (job.data().attempts || 0) + 1),
      error,
    });
    if (asset.exists && asset.data().status === "queued")
      tx.update(assetRef, { status: "failed", error });
    return true;
  });
}
