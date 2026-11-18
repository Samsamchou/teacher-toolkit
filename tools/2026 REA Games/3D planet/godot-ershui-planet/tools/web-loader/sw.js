// [1118] 二水小行星：把遊戲大檔（index.pck、index.wasm）存在 iPad 上（Cache Storage）。
// 第一次下載完整才存；下次直接從 iPad 讀。改版時 apply_loader.py 換掉 VERSION → 舊的自動刪除、重新下載一次。
// （RDQ-spec-planet-ipad-load-20261118 ②）
const VERSION = "__VERSION__";
// [1118] 每個遊戲資料夾各用自己的名字（/ershui-planet/ → "ershui-planet-"、/ershui-freetime/ → "ershui-freetime-"），
//   只清掉「自己資料夾」的舊版本，不會刪到別的遊戲存在 iPad 上的檔案
const FOLDER = new URL(self.registration.scope).pathname.split("/").filter(Boolean).pop() || "root";
const PREFIX = FOLDER + "-";
const OLD = /^[0-9a-f]{12}-[0-9a-f]{6}$/;
const CACHE = PREFIX + VERSION;
const BIG = /\/index\.(pck|wasm)$/;
const inflight = new Map(); // 同一個檔案只留一條下載（重試時先停掉卡住的舊下載）

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
	e.waitUntil((async () => {
		for (const k of await caches.keys()) {
			if (k !== CACHE && k.startsWith(PREFIX) && OLD.test(k.slice(PREFIX.length))) await caches.delete(k);
		}
		await self.clients.claim();
	})());
});

self.addEventListener("fetch", (e) => {
	const req = e.request;
	if (req.method !== "GET") return;
	const url = new URL(req.url);
	if (url.origin !== self.location.origin || !BIG.test(url.pathname)) return;
	const key = url.pathname;
	e.respondWith((async () => {
		const cache = await caches.open(CACHE);
		const hit = await cache.match(key);
		if (hit) return hit;
		const old = inflight.get(key);
		if (old) old.abort();
		const ac = new AbortController();
		inflight.set(key, ac);
		// cache:"reload"＝不用瀏覽器一天的舊快取，確保拿到這一版
		const res = await fetch(key, { cache: "reload", signal: ac.signal, credentials: "same-origin" });
		if (res.ok && res.status === 200) {
			// 存「解壓後」的內容，只留 Content-Type（避免舊的 br／長度標頭和內容對不上）
			const ct = res.headers.get("Content-Type") || (key.endsWith(".wasm") ? "application/wasm" : "application/octet-stream");
			const copy = new Response(res.clone().body, { status: 200, headers: { "Content-Type": ct } });
			e.waitUntil(cache.put(key, copy)
				.catch(() => { /* 下載中斷：不存半個檔 */ })
				.finally(() => { if (inflight.get(key) === ac) inflight.delete(key); }));
		} else if (inflight.get(key) === ac) {
			inflight.delete(key);
		}
		return res;
	})());
});
