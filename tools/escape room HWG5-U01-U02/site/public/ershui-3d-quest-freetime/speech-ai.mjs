// Free Time 兩人一組 口說評分：照 Listen and Guess（ershui-3d-quest-planetlisten/speech-ai.mjs）同一套做法
// （Firebase AI Logic＋reCAPTCHA Enterprise App Check，同一個 App Check 網站金鑰；只有允許的網域能用）。
// 學生是「猜」Ken 的休閒活動，所以不給目標句：AI 先寫出學生實際說的句子，再以「學生說出的這句話」評分；
// 猜錯活動不扣發音分，猜對沒有由外框比對 transcript 決定。
// App Check 金鑰（g6-english-online-learning）只允許 hwg5-clock-tower.web.app／firebaseapp.com／ershui-preview 預覽網址。
// 本機測試：網址加 ?fakeai=1 用假評分（隨機 70–95 分）。
import { FIREBASE_CONFIG } from "../shared/quest-cloud.mjs";
const SPEECH_AI = { firebaseConfig: FIREBASE_CONFIG, appCheckSiteKey: "6LdUgxUuAAAAAFI1-EL3cj-ttV7Fm60JbCs5U20p", model: "gemini-3.7-flash" };
const SDK = "https://www.gstatic.com/firebasejs/12.17.1";
const FAKE = new URLSearchParams(location.search).has("fakeai") && ["127.0.0.1", "localhost"].includes(location.hostname)
  || new URLSearchParams(location.search).has("fakeai") && location.hostname.includes("--");

export const available = () => FAKE || !!SPEECH_AI;

function prompt(phrases, pattern = "I ______ in my free time.", example = "I watch TV in my free time.", who = "Ken") {
  return `你是一位嚴格且專業的台灣國小英語發音教練。
學生在玩「猜猜 ${who} 的休閒活動」，要用英文說出自己猜的活動，句型是 "${pattern}"（例如 "${example}"）。
可能的活動：${phrases.join(", ")}。學生可能猜錯活動，這不是發音問題。
請先逐字寫出學生實際念出的英文（transcript），再以「學生說出的這句話」當目標評分：
- 不要因為猜的活動和答案不同而扣分；
- 句型少一個字（例如漏掉主詞、in、my／her／his、free、time）或字尾沒有收音（例如 games 的 s、jogging 的 g、English 的 sh、第三人稱動詞 goes／plays／watches 的 s）要明確扣分；
- 沒有說英文或聽不清楚時，transcript 寫空字串、各項給低分。
回饋使用 50 字以內、溫柔而具體的繁體中文，只指出一項最需要改善之處。`;
}

let model = null;
async function getModel() {
  if (model) return model;
  const [{ initializeApp }, { initializeAppCheck, ReCaptchaEnterpriseProvider }, ai] = await Promise.all([
    import(`${SDK}/firebase-app.js`), import(`${SDK}/firebase-app-check.js`), import(`${SDK}/firebase-ai.js`)]);
  const app = initializeApp(SPEECH_AI.firebaseConfig, "freetime-speech-ai");
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

export async function scoreGuess({ base64Audio, mimeType, phrases, pattern, example, who }) {
  if (FAKE) {
    await new Promise(r => setTimeout(r, 900));
    const t = 70 + Math.floor(Math.random() * 26);
    return { transcript: String(pattern || "I ______ in my free time.").replace("______", phrases[Math.floor(Math.random() * phrases.length)]), accuracy: t, fluency: t, completeness: t, total_score: t, feedback: "（測試）time 的 m 要閉嘴念出來。" };
  }
  const m = await getModel();
  const res = await m.generateContent([{ text: prompt(phrases, pattern, example, who) }, { inlineData: { mimeType, data: base64Audio } }]);
  const raw = res.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const j = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
  return { transcript: String(j.transcript || "").trim(), feedback: String(j.feedback || "").trim(),
    accuracy: score(j.accuracy), fluency: score(j.fluency), completeness: score(j.completeness), total_score: score(j.total_score) };
}
