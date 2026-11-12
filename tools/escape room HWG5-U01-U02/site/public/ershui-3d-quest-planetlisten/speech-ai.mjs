// Listen and Guess 口說評分：和 hwg5-su-to-u04-story 同一套做法（Firebase AI Logic＋reCAPTCHA Enterprise App Check，
// 金鑰不在網頁裡、只有允許的網域能用）。學生是「猜」地點，所以不給目標句：AI 先寫出學生實際說的句子，
// 再以「學生說出的這句話」評發音／流暢／完整度，猜錯地點不扣發音分；猜對沒有由外框比對 transcript 決定。
// 2026-11-12 三種線索版：照 Free Time 兩人一組的口說規則，AI 另外回報 place_said／grammar_ok／grammar_errors，
// 逐字稿要保留文法錯（外框也自己檢查文法，不只信 AI）。
//
// 本機測試：網址加 ?fakeai=1 用假評分；window.__fakeAiQueue＝[{transcript, total_score, …}, …] 一次拿一個。
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
學生在玩「看線索猜地點」，要用英文說出自己猜的地點，句型是 "I'm going to the ___."
（例如 "I'm going to the post office."；如果猜學校，要說 "I'm going to school."，school 前面沒有 the）。
可能的地點：${words.join(", ")}。學生可能猜錯地點，這不是發音問題。
請先逐字寫出學生實際念出的英文（transcript）：照學生真的說的寫，保留文法錯誤，不要幫他改正
（例如學生說 "He's going to the school."，transcript 就寫 He's going to the school.，不可以改成 I'm 或拿掉 the；
學生只說 "station" 就寫 station，不要補成 train station）。
再以「學生說出的這句話」當目標評分：
- 不要因為猜的地點和答案不同而扣分；
- 句型少一個字（例如漏掉 I'm、to、the）或字尾沒有收音（例如 going 的 g、office 的 s）要明確扣分；
- 沒有說英文或聽不清楚時，transcript 寫空字串、各項給低分。
另外檢查文法（只看這三項，不管地點猜對猜錯）：
- 主詞：要說 I'm going to（不是 He's／She's／I going／I go）；
- the：school 前面不加 the（to school），其他地點要加 the（to the park、to the train station）；
- 地點單字要說完整（post office 不能只說 post、train station 不能只說 station、tea shop 不能只說 tea）。
place_said 寫學生說的地點（照他說的，例如 the station；沒有就空字串）；grammar_ok 是上面三項都對；
grammar_errors 列出每個錯誤 {said: 學生說的字, correct: 正確的字}（例如 {said: "He's", correct: "I'm"}、{said: "the school", correct: "school"}），沒有錯就空陣列。
回饋使用 50 字以內、溫柔而具體的繁體中文，只指出一項最需要改善之處（文法錯時優先講文法）。`;
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
    transcript: S.string({ description: "學生實際念出的英文逐字稿（保留文法錯）" }),
    accuracy: S.number({ description: "0 到 100 的發音精準度" }),
    fluency: S.number({ description: "0 到 100 的流暢度" }),
    completeness: S.number({ description: "0 到 100 的完整度" }),
    total_score: S.number({ description: "0 到 100 的總分" }),
    feedback: S.string({ description: "50 字以內、繁體中文、只給一項改進建議" }),
    place_said: S.string({ description: "學生說的地點（照他說的），沒有就空字串" }),
    grammar_ok: S.boolean({ description: "I'm going to、the 的有無、地點單字都正確" }),
    grammar_errors: S.array({ items: S.object({ properties: { said: S.string(), correct: S.string() } }), description: "文法錯誤：學生說的字 → 正確的字" }),
  } });
  model = ai.getGenerativeModel(ai.getAI(app, { backend: new ai.AgentPlatformBackend() }), {
    model: SPEECH_AI.model,
    generationConfig: { temperature: 0.1, responseMimeType: "application/json", responseSchema: schema },
  });
  return model;
}

const score = v => { const n = Math.round(Number(v)); if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error("bad score"); return n; };

// fake 參數只在假評分用（fake.sentence＝正確答句），不會送給 AI。
export async function scoreGuess({ base64Audio, mimeType, words, fake = {} }) {
  if (FAKE) {
    await new Promise(r => setTimeout(r, 900));
    const t = 70 + Math.floor(Math.random() * 26);
    const q = Array.isArray(window.__fakeAiQueue) && window.__fakeAiQueue.length ? window.__fakeAiQueue.shift() : null;
    const w = words[Math.floor(Math.random() * words.length)];
    const def = { transcript: fake.sentence && Math.random() < 0.75 ? fake.sentence : `I'm going to ${w === "school" ? "" : "the "}${w}.`,
      accuracy: t, fluency: t, completeness: t, total_score: t, feedback: "（測試）going 的 g 要念出來。", place_said: "", grammar_ok: true, grammar_errors: [] };
    return { ...def, ...(q || {}) };
  }
  const m = await getModel();
  const res = await m.generateContent([{ text: prompt(words) }, { inlineData: { mimeType, data: base64Audio } }]);
  const raw = res.response.text().trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const j = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw);
  return { transcript: String(j.transcript || "").trim(), feedback: String(j.feedback || "").trim(),
    accuracy: score(j.accuracy), fluency: score(j.fluency), completeness: score(j.completeness), total_score: score(j.total_score),
    place_said: String(j.place_said || "").trim(), grammar_ok: j.grammar_ok !== false,
    grammar_errors: Array.isArray(j.grammar_errors) ? j.grammar_errors.slice(0, 6).map(e => ({ said: String(e?.said || "").slice(0, 40), correct: String(e?.correct || "").slice(0, 40) })) : [] };
}
