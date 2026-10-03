export const cloudMode = import.meta.env.VITE_LIVE_V2_TRANSPORT === "firebase";
let cloud;
let activeRoom='';
export const activeRoomCode=()=>activeRoom;
async function client() {
  if (!cloud)
    cloud = Promise.all([
      import("../lib/firebase-client.js"),
      import("firebase/functions"),
    ]).then(async (result) => {
      const siteKey = import.meta.env.VITE_LIVE_APPCHECK_SITE_KEY;
      if (!siteKey)
        throw new Error("雲端 v2 缺少 App Check 公開站台設定，已停止連線。");
      const [{ getApp }, { initializeAppCheck, ReCaptchaEnterpriseProvider }] =
        await Promise.all([
          import("firebase/app"),
          import("firebase/app-check"),
        ]);
      initializeAppCheck(getApp(), {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
      return result;
    });
  return cloud;
}
export async function api(action, code, payload = {}) {
  if (cloudMode) {
    const [firebase, { httpsCallable }] = await client();
    await firebase.ensureAnonymousSession();
    const session = firebase.teacherSession();
    const response = await httpsCallable(firebase.functions, "liveV2", {
      timeout: 120000,
    })({
      action,
      code: code || null,
      payload,
      sessionToken: session?.sessionToken || null,
    });
    if(response.data?.code)activeRoom=response.data.code;
    return response.data;
  }
  const response = await fetch("/api/live", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Lab-Role": new URLSearchParams(location.search).has("join")
        ? "student"
        : "teacher",
    },
    body: JSON.stringify({ action, code, payload }),
    credentials: "same-origin",
  });
  if (!response.headers.get("content-type")?.includes("application/json"))
    throw new Error("本機服務未啟動，或雲端 v2 尚未啟用。");
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "服務暫時無法連線。");
  return result;
}
export async function callCloudService(name,payload){
  const allowed=['liveMediaV2','liveImageSearchV2'];if(!allowed.includes(name)||!cloudMode)throw new Error('雲端服務未啟用。');
  const [firebase,{httpsCallable}]=await client();await firebase.ensureAnonymousSession();
  return (await httpsCallable(firebase.functions,name,{timeout:300000})({...payload,sessionToken:firebase.teacherSession()?.sessionToken||null})).data;
}
export async function loginTeacher(passcode) {
  const [firebase] = await client();
  return firebase.openTeacherResultsSession(passcode);
}
