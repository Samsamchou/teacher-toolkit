import { randomBytes, randomInt } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { resolve } from "node:path";
import {playReward,finishReward} from '../src/live/rewards.mjs';
import {reportAccess,reportSummary,responseFeedback} from '../src/live/review.mjs';
import {
  createRoom,
  joinRoom,
  controlRoom,
  submitRoom,
  tapVowel,
  snapshot,
  report,
  validateDeck,
} from "../src/live/domain.mjs";

// Development-only service: bound to loopback, cookie-owned rooms, disk persistence.
export function liveLabPlugin() {
  const root = resolve(".live-lab");
  let state = { rooms: {}, decks: {} };
  let queue = Promise.resolve();
  const ready = mkdir(root, { recursive: true }).then(async () => {
    try {
      state = JSON.parse(await readFile(resolve(root, "state.json"), "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
  });
  async function persist() {
    await writeFile(resolve(root, "state.tmp"), JSON.stringify(state));
    await rename(resolve(root, "state.tmp"), resolve(root, "state.json"));
  }
  return {
    name: "lesson-live-local",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/live", async (req, res) => {
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        const host = req.headers.host || "";
        if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "本機預覽僅接受 loopback。" }));
          return;
        }
        if (req.headers.origin && req.headers.origin !== `http://${host}`) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "來源不符。" }));
          return;
        }
        const cookieName =
          req.headers["x-lab-role"] === "student"
            ? "hub_lab_student"
            : "hub_lab_teacher";
        const cookie = (req.headers.cookie || "").match(
          new RegExp(`(?:^|;\\s*)${cookieName}=([a-f0-9]{48})(?:;|$)`),
        );
        const uid = cookie?.[1] || randomBytes(24).toString("hex");
        if (!cookie)
          res.setHeader(
            "Set-Cookie",
            `${cookieName}=${uid}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
          );
        let size = 0;
        const chunks = [];
        try {
          if (req.method !== "POST") throw new Error("請使用 POST。");
          for await (const part of req) {
            size += part.length;
            if (size > 400000) throw new Error("請求過大。");
            chunks.push(part);
          }
          const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const task = async () => {
            await ready;
            const { action, code, payload = {} } = input;
            let result;
            if (action === "decks") result = { decks: state.decks[uid] || [] };
            else if(action==='reports') result={reports:Object.values(state.rooms).filter(r=>r.teacher===uid&&(r.retentionAt||r.expiresAt)>=Date.now()).sort((a,b)=>b.createdAt-a.createdAt).map(reportSummary)};
            else if(action==='report') {
              const room=state.rooms[code];reportAccess(room,uid);
              result={report:report(room),reportBlocks:room.deck.blocks,meta:reportSummary(room)};
            }
            else if (action === "previousDeck") {
              const versions = state.history?.[uid]?.[payload.id] || [];
              if (!versions.length) throw new Error("尚無可復原版本。");
              result = { deck: versions.at(-1) };
            } else if (action === "saveDeck") {
              validateDeck(payload.deck, { draft: true });
              const list = (state.decks[uid] ??= []);
              const i = list.findIndex((d) => d.id === payload.deck.id);
              const old = list[i];
              if (old && payload.expectedVersion !== old.version)
                throw new Error("教材已由另一分頁修改，請重新載入。");
              const deck = {
                ...payload.deck,
                version: (old?.version || 0) + 1,
              };
              if (old) {
                state.history ??= {};
                state.history[uid] ??= {};
                const previous = (state.history[uid][deck.id] ??= []);
                previous.push(old);
                state.history[uid][deck.id] = previous.slice(-20);
              }
              if (i < 0) list.push(deck);
              else list[i] = deck;
              result = { deck };
            } else if (action === "create") {
              let code;
              do {
                code = String(randomInt(100000, 1000000));
              } while (
                state.rooms[code] &&
                state.rooms[code].expiresAt > Date.now()
              );
              state.rooms[code] = createRoom(payload.deck, code, uid);
              result = snapshot(state.rooms[code], uid);
            } else {
              const room = state.rooms[code];
              let tap = null, feedback = null;
              if (action === "join") joinRoom(room, uid, payload.studentId);
              else if (action === "submit") {
                const response = submitRoom(room, uid, payload);
                feedback = responseFeedback(room.deck.blocks.find(b => b.id === response.blockId), response);
              }
              else if (action === "vowelTap") {
                tap = tapVowel(room, uid, payload);
                feedback = tap.feedback || null;
                if (tap.complete) {
                  const response = room.responses[room.vowelProgress[uid].attemptId];
                  feedback = responseFeedback(room.deck.blocks.find(b => b.id === response?.blockId), response);
                }
              }
              else if(action==="rewardPlay")playReward(room,uid,payload);
              else if(action==="rewardFinish")finishReward(room,uid,payload);
              else if (action === "control")
                controlRoom(room, uid, payload.action, payload);
              else if (action !== "snapshot" && action !== "report")
                throw new Error("未知操作。");
              result = snapshot(room, uid);
              if (tap) result.tap = tap;
              if (feedback) result.feedback = feedback;
              if (action === "report") {
                if (room.teacher !== uid) throw new Error("需要教師權限。");
                result.report = report(room);
              }
            }
            await persist();
            return result;
          };
          const result = queue.then(task);
          queue = result.catch(() => {});
          res.end(JSON.stringify(await result));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: e.message }));
        }
      });
    },
  };
}
