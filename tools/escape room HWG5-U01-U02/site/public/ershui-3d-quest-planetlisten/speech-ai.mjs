// Listen and Guess 口說評分：和 hwg5-su-to-u04-story 同一套做法（Firebase AI Logic＋reCAPTCHA Enterprise App Check，
// 金鑰不在網頁裡、只有允許的網域能用）。學生是「猜」地點，所以不給目標句：AI 先寫出學生實際說的句子，
// 再以「學生說出的這句話」評發音／流暢／完整度，猜錯地點不扣發音分；猜對沒有由程式比對 transcript 決定。
//
// SPEECH_AI 還沒設定（老師還沒決定用哪個 Firebase 專案）時 available() 回傳 false，外框就不出口說題。
// 本機測試：網址加 ?fakeai=1 用假評分（隨機 70–95 分）。
// 2026-11-08 老師選 B：在小行星自己的專案 g6-english-online-learning 建一套（reCAPTCHA Enterprise 金鑰只允許
// hwg5-clock-tower.web.app／firebaseapp.com／ershui-preview 預覽網址；App Check 註冊在這個網頁 App 上）。
import { FIREBASE_CONFIG } from "../shared/quest-cloud.mjs";
const SPEECH_AI = { firebaseConfig: FIREBASE_CONFIG, appCheckSiteKey: "6LdUgxUuAAAAAFI1-EL3cj-ttV7Fm60JbCs5U20p", model: "gemini-3.7-flash" };
const SDK = "https://www.gstatic.com/firebasejs/12.17.1";
const FAKE = new URLSearchParams(location.search).has("fakeai") && ["127.0.0.1", "localhost"].includes(location.hostname)
  || new URLSearchParams(location.search).has("fakeai") && location.hostname.includes("--");

export const available = () => FAKE || !!SPEECH_AI;

function prompt(words) {
  return `你是一位嚴格且專業的台灣國小英語發音教練。
學生在玩「聽環境音猜地點」，要用英文說出自己猜的地點，句型是 "I'm going to the ___."（如果猜學校，要說 "I'm going to school."，沒有 the）。
可能的地點：${words.join(", ")}。學生可能猜錯地點，這不是發音問題。
請先逐字寫出學生實際念出的英文（transcript），再以「學生說出的這句話」當目標評分：
- 不要因為猜的地點和別人不同而扣分；
- 句型少一個字（例如漏掉 I'm、to、the）或字尾沒有收音（例如 going 的 g、office 的 s）要明確扣分；
- 沒有說英文或聽不清楚時，transcript 寫空字串、各項給低分。
回饋使用 50 字以內、溫柔而具體的繁體中文，只指出一項最需要改善之處。`;
}

let model = null;
async function getModel() {
  if (model) return model;
  const [{ initializeApp }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, ai] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-app-check.js`), import(`${SDK}/firebase-ai.js`)]);
  const app = initializeApp(SPEECH_AI.firebaseConfig, "planet-speech-ai");
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(SPEECH_AI.appCheckSiteKey), isTokenAutoRefreshEnabled: true });
  const S = ai.Schema;
  const schema = S.object({ properties: {
    transcript: S.string({ description: "學生實際念出的英文逐字稿" }),
    accuracy: S.number({ description: "0 到 100 的發音精準度" }),
    fluency: S.number({ description: "0 到 100 的流暢度" }),
    completeness: S.number({ description: "0 到 100 的完整度" }),
    total_score: S.number({ description: "0 到 100 的總分" }),
    feedback: S.string({ description: "50 字以內、繁體中文、只給一項改進建議" }),
  } });
  model = ai.getGenerativeModel(ai.getAI(app, { backend: new ai.AgentPlatformBackend() }), {
    model: SPEECH_AI.model,
    generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: schema },
  });
  return model;
}

const score = v => { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("bad score"); return n; };

export async function scoreGuess({ base64Audio, mimeType, words }) {
  if (FAKE) {
    await new Promise(r => setTimeout(r, 900));
    const t = 70 + Math.floor(Math.random() * 26);
    return { transcript: `I'm going to the ${words[Math.floor(Math.random() * words.length)]}.`, accuracy: t, fluency: t, completeness: t, total_score: t, feedback: "（測試）going 的 g 要念出來。" };
  }
  const m = await getModel();
  const res = await m.generateContent([{ text: prompt(words) }, { inlineData: { mimeType, data: base64Audio } }]);
  const raw = res.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const j = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
  return { transcript: String(j.transcript || "").trim(), feedback: String(j.feedback || "").trim(),
    accuracy: score(j.accuracy), fluency: score(j.fluency), completeness: score(j.completeness), total_score: score(j.total_score) };
}
