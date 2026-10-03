export function createImageSearch({
  key,
  enabled = false,
  fetcher = fetch,
  now = Date.now,
  cacheStore,
}) {
  const cache = new Map(),
    allowed = new Map();
  return async function run({ action = "search", query = "", id }) {
    if (!enabled || !key)
      throw new Error(
        "已採用 Pixabay；搜尋尚未啟用，需安全設定伺服器金鑰並另行部署。",
      );
    if (action === "download") {
      const hit = cacheStore
        ? await cacheStore.getHit(String(id))
        : allowed.get(String(id));
      if (!hit || hit.until < now())
        throw new Error("搜尋結果已到期，請重新搜尋。");
      const u = new URL(hit.image);
      if (
        u.protocol !== "https:" ||
        !["pixabay.com", "cdn.pixabay.com"].includes(u.hostname)
      )
        throw new Error("素材來源不在白名單。");
      const response = await fetcher(u, {
        redirect: "error",
        signal: AbortSignal.timeout(15000),
      }).catch(() => {
        throw new Error("圖片來源暫時無法連線。");
      });
      if (!response.ok) throw new Error("無法下載素材。");
      const mime = response.headers.get("content-type")?.split(";")[0];
      if (!["image/jpeg", "image/png", "image/webp"].includes(mime))
        throw new Error("素材不是支援的圖片。");
      const parts = [];
      let size = 0;
      for await (const part of response.body) {
        size += part.length;
        if (size > 8 * 1024 * 1024)
          throw new Error("搜尋圖片超過 8 MB，請選另一張圖片。");
        parts.push(part);
      }
      return {
        base64: Buffer.concat(parts).toString("base64"),
        mime,
        source: {
          provider: "Pixabay",
          id: String(id),
          page: hit.page,
          author: hit.author,
          license: "https://pixabay.com/service/license-summary/",
          confirmedAt: new Date(now()).toISOString(),
        },
      };
    }
    const q = String(query).trim();
    if (!q || q.length > 80) throw new Error("搜尋字詞限 1–80 字。");
    const cached = cacheStore ? await cacheStore.getQuery(q) : cache.get(q);
    if (cached && cached.until > now()) return cached.data;
    const u = new URL("https://pixabay.com/api/");
    u.search = new URLSearchParams({
      key,
      q,
      safesearch: "true",
      image_type: "photo",
      per_page: "20",
    }).toString();
    const response = await fetcher(u, {
      signal: AbortSignal.timeout(15000),
    }).catch(() => {
      throw new Error("圖片搜尋暫時無法連線。");
    });
    if (!response.ok) throw new Error(`搜尋服務失敗 (${response.status})。`);
    const data = await response.json();
    const hits = (data.hits || [])
      .map((h) => ({
        id: String(h.id),
        preview: h.previewURL,
        image: h.webformatURL,
        page: h.pageURL,
        author: h.user,
        tags: h.tags,
      }))
      .filter((h) => {
        try {
          if (!/^\d{1,20}$/.test(h.id)) return false;
          return [h.preview, h.image, h.page].every((v) => {
            const u = new URL(v);
            return (
              u.protocol === "https:" &&
              !u.username &&
              !u.password &&
              ["pixabay.com", "cdn.pixabay.com"].includes(u.hostname)
            );
          });
        } catch {
          return false;
        }
      });
    for (const h of hits) allowed.set(h.id, { ...h, until: now() + 86400000 });
    const result = { hits, safeSearch: true };
    cache.set(q, { data: result, until: now() + 86400000 });
    if (cacheStore)
      await cacheStore.save(q, { data: result, until: now() + 86400000 });
    return result;
  };
}
export function imageSearchPlugin() {
  const run = createImageSearch({
    enabled: process.env.LIVE_IMAGE_SEARCH_ENABLED === "true",
    key: process.env.PIXABAY_API_KEY,
  });
  return {
    name: "live-image-search",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/live-images", async (req, res) => {
        res.setHeader("Content-Type", "application/json");
        const host = req.headers.host || "";
        if (
          !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ||
          (req.headers.origin && req.headers.origin !== `http://${host}`) ||
          req.method !== "GET"
        ) {
          res.statusCode = 403;
          res.end("{}");
          return;
        }
        try {
          const input = Object.fromEntries(
            new URL(req.url, `http://${host}`).searchParams,
          );
          res.end(JSON.stringify(await run(input)));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}
