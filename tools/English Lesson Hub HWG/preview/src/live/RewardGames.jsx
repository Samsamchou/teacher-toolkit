import React, { useEffect, useRef, useState } from "react";
import { REWARD_GAMES, SLOT_ITEMS } from "./rewards.mjs";
import {
  createDrop,
  advance,
  pegPosition,
  boardForTurn,
  W,
  H,
} from "./reward-physics.mjs";
import { api } from "./transport.mjs";
import "./rewards.css";

const animals = [
  ["Cat", "cat-dog", 0],
  ["Dog", "cat-dog", 1],
  ["Rabbit", "rabbit-panda", 0],
  ["Panda", "rabbit-panda", 1],
  ["Fox", "fox-penguin", 0],
  ["Penguin", "fox-penguin", 1],
];
function preferences() {
  try {
    return JSON.parse(localStorage.getItem("lh-reward-preferences")) || {};
  } catch {
    return {};
  }
}
function Court({ turn, progress, animal }) {
  const a = animals[animal],
    r = turn?.result,
    hit = r?.hit,
    pose = turn ? (progress < 1 ? 1 : hit ? 2 : 3) : 0;
  const shotX = { 1: 420, 2: 615, 3: 810 }[r?.shot] || 615;
  const origin = shotX - 35;
  const flight = Math.min(1, Math.max(0, (progress - 0.2) / 0.48));
  const ball = progress < 0.2
    ? { x: origin, y: 485 - 140 * (progress / 0.2) }
    : progress <= 0.68
      ? {
          x: (1 - flight) ** 2 * origin + 2 * (1 - flight) * flight * ((origin + 190) / 2) + flight ** 2 * (hit ? 190 : 230),
          y: (1 - flight) ** 2 * 345 + 2 * (1 - flight) * flight * -100 + flight ** 2 * 334,
        }
      : hit
        ? { x: 190 + ((progress - 0.68) / 0.32) * 45, y: 334 + ((progress - 0.68) / 0.32) * 230 }
        : { x: 230 + ((progress - 0.68) / 0.32) * 250, y: 334 + ((progress - 0.68) / 0.32) * 230 - 135 * Math.sin(((progress - 0.68) / 0.32) * Math.PI) };
  return (
    <div className="lh-reward-court" role="img" aria-label="來源專案球場畫面，單人投籃">
      <div className="lh-reward-court-bg" />
      <span className="lh-reward-court-pill">CLASSROOM CLUB · COURTSIDE</span>
      <svg viewBox="0 0 1280 720" aria-hidden="true">
        <g className={turn && hit && progress > 0.68 ? "lh-reward-net-hit" : ""}>
          <path d="M115 606 L133 261 Q132 238 151 238 L155 610Z" fill="#954bdd" stroke="white" strokeWidth="12" />
          <path d="M140 274 L229 274 L229 333 L140 333Z" fill="#1c143d" stroke="white" strokeWidth="9" />
          <path d="M169 292 H212 V320 H169Z" fill="none" stroke="#fdac65" strokeWidth="4" />
          <path className="lh-reward-net" d="M156 335 L170 385 Q188 398 207 385 L220 335 M159 344 L212 369 M162 358 L204 387 M216 344 L166 369 M212 358 L174 387 M178 337 L179 390 M200 337 L196 390" fill="none" stroke="white" strokeWidth="5" strokeLinejoin="round" />
          <rect x="147" y="324" width="84" height="15" rx="7" fill="#ff694a" stroke="white" strokeWidth="6" />
        </g>
        {turn && progress < 1 && (
          <g transform={`translate(${ball.x} ${ball.y}) rotate(${progress * 900})`}>
            <circle r="20" fill="#ff923e" stroke="#fff9df" strokeWidth="5" />
            <circle r="18" fill="none" stroke="#341640" strokeWidth="2.5" />
            <path d="M-18 0H18 M0-18V18 M-12-14Q10 0-12 14 M12-14Q-10 0 12 14" fill="none" stroke="#341640" strokeWidth="2.3" />
          </g>
        )}
      </svg>
      <span
        className={`lh-reward-animal ${turn && progress < 1 ? "is-shooting" : ""} ${turn && progress >= 1 && hit ? "is-celebrating" : ""}`}
        role="img"
        aria-label={a[0]}
        style={{
          left: `${(shotX / 1280) * 100}%`,
          backgroundImage: `url(/live-games/basketball/${a[1]}.webp)`,
          backgroundPosition: `${(pose * 100) / 3}% ${a[2] * 100}%`,
        }}
      />
      {turn && progress >= 1 && (
        <span className={`lh-reward-court-result ${hit ? "made" : "missed"}`}>
          {hit ? `+${r.points} · NICE SHOT!` : "SO CLOSE!"}
        </span>
      )}
    </div>
  );
}
function PegBoard({ turn, frame, zone }) {
  const board = boardForTurn(turn),
    ball =
      frame?.ball ||
      (turn?.done
        ? {
            x: ((turn.result.slotIndex + 0.5) * W) / board.slots.length,
            y: 806,
          }
        : { x: (((zone ?? 3) - 0.5) * W) / 5, y: 103 });
  return (
    <svg
      className="lh-reward-pegs"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Plink-oh! 落球盤"
    >
      <defs>
        <pattern id="lh-plink-dots" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#523fe0" opacity=".28" /></pattern>
        <linearGradient id="lh-plink-blue" x2=".8" y2="1"><stop stopColor="#67aafb" /><stop offset="1" stopColor="#428cfa" /></linearGradient>
        <linearGradient id="lh-plink-ball" cx="30%" cy="22%" r="78%"><stop stopColor="#fff5c5" /><stop offset=".45" stopColor="#ed427c" /><stop offset="1" stopColor="#210e52" /></linearGradient>
        <linearGradient id="lh-plink-beam" x2="0" y2="1"><stop stopColor="#e991ff" stopOpacity=".5" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#lh-plink-blue)" />
      <rect width={W} height={H} fill="url(#lh-plink-dots)" />
      {!turn && zone && <rect x={(zone - 1) * W / 5} y="90" width={W / 5} height="714" fill="url(#lh-plink-beam)" />}
      <path d="M0 260L49 330 0 400M0 440L49 510 0 580M780 260L731 330 780 400M780 440L731 510 780 580" fill="#8656f5" stroke="#6135d2" strokeWidth="8" />
      {board.pegs.map((p) => {
        const q = pegPosition(p, frame?.time || 0);
        return (
          <g key={p.id}>
            <circle cx={q.x} cy={q.y + 2} r={p.r} fill="#402696" />
            <circle cx={q.x} cy={q.y} r={p.r - 1} fill={frame?.hits?.includes(p.id) ? p.penalty ? "#ffd2d8" : "#fff0a5" : p.penalty ? "#f33856" : p.pink ? "#fa8dc9" : "#8255d5"} stroke={p.penalty ? "#9f183a" : "#62329e"} strokeWidth="3" />
            <circle cx={q.x - 3} cy={q.y - 3} r="3" fill="#e2b2ff" opacity=".7" />
          </g>
        );
      })}
      {board.slots.map((v, i) => (
        <g key={i}>
          <rect
            x={(i * W) / board.slots.length + 2}
            y="824"
            width={W / board.slots.length - 4}
            height="44"
            fill={["#1cf0cb", "#fb333f", "#bb29ef", "#ffbe18", "#46c9ee", "#62e435", "#ff78b6"][Math.floor(v / 10) % 7]}
            stroke="#281044"
            strokeWidth="5"
          />
          <text
            x={((i + 0.5) * W) / board.slots.length}
            y="858"
            textAnchor="middle"
            fill="white"
            stroke="#181234"
            strokeWidth="5"
            paintOrder="stroke"
            fontSize="44"
            fontWeight="1000"
          >
            {v}
          </text>
          {turn?.result.slotIndex === i && (frame?.done || turn?.done) &&
            <ellipse cx={((i + 0.5) * W) / board.slots.length} cy="810" rx={W / board.slots.length * .46} ry="42" fill="#ffe764" opacity=".58" className="lh-reward-slot-glow" />}
        </g>
      ))}
      {frame?.events?.filter((event) => event.points && event.type !== "landing" && frame.time - event.time < 0.85).map((event) => (
        <text key={event.id} x={event.x} y={event.y - 22 - (frame.time - event.time) * 48} textAnchor="middle" fill={event.points < 0 ? "#ffeb92" : "#ffffff"} stroke="#46145f" strokeWidth="4" paintOrder="stroke" fontSize="34" fontWeight="900" opacity={Math.max(0, 1 - (frame.time - event.time) / 0.85)}>{event.points > 0 ? "+" : ""}{event.points}</text>
      ))}
      <circle
        cx={ball.x}
        cy={ball.y}
        r="19"
        fill="url(#lh-plink-ball)"
        stroke="#371252"
        strokeWidth="4"
      />
      <ellipse cx={ball.x - 7} cy={ball.y - 8} rx="5" ry="8" fill="white" opacity=".75" />
    </svg>
  );
}
import { createSlotAudio } from './slot-audio.mjs';
export function RewardGames({ room, onRoom }) {
  const saved = useRef(preferences()),
    [muted, setMuted] = useState(saved.current.soundPreferenceVersion === 3
      ? saved.current.muted ?? true
      : ["plinkoh","slot"].includes(room.reward?.game) ? false : saved.current.muted ?? true),
    [reduced, setReduced] = useState(
      saved.current.reduced ??
        matchMedia("(prefers-reduced-motion: reduce)").matches,
    ),
    [animal, setAnimal] = useState(0);
  const [volume,setVolume]=useState(Number.isFinite(saved.current.volume)?Math.max(0,Math.min(1,saved.current.volume)):0.85);
  const [soundMessage,setSoundMessage]=useState("");
  const slotAudio=useRef(null);
  slotAudio.current ??= createSlotAudio(setSoundMessage);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0),
    [frame, setFrame] = useState(null),
    [zone, setZone] = useState(null),
    [animationDone, setAnimationDone] = useState(false);
  const guard = useRef(false),
    request = useRef(null),
    audio = useRef(null),
    mutedCurrent = useRef(muted),
    latest = useRef(room),
    callback = useRef(onRoom);
  mutedCurrent.current = muted;
  latest.current = room;
  callback.current = onRoom;
  const reward = room.reward,
    turn = reward.pending || reward.last,
    active = reward.pending;
  useEffect(() => {
    if (
      request.current &&
      (request.current.revision !== room.revision ||
        request.current.walletVersion !== reward.version)
    )
      request.current = null;
  }, [room.revision, reward.version]);
  useEffect(() => {
    try {
      localStorage.setItem(
        "lh-reward-preferences",
        JSON.stringify({ muted, reduced, volume, soundPreferenceVersion: 3 }),
      );
    } catch {}
  }, [muted, reduced, volume]);
  useEffect(()=>{slotAudio.current.volume(volume);if(muted)slotAudio.current.stop();},[volume,muted]);
  useEffect(
    () => () => {
      audio.current?.close().catch(() => {});
      slotAudio.current?.dispose();
    },
    [],
  );
  function sound(kind = "launch") {
    if (mutedCurrent.current) return;
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      audio.current ??= new C();
      void audio.current.resume().catch(() => {});
      const c = audio.current,
        o = c.createOscillator(),
        g = c.createGain();
      o.connect(g);
      g.connect(c.destination);
      o.type = kind === "penalty" ? "triangle" : "sine";
      o.frequency.value = { launch: 520, peg: 740, penalty: 270, landing: 880 }[kind] || 520;
      const duration = kind === "landing" ? 0.2 : 0.12;
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(kind === "penalty" ? 0.025 : 0.035, c.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
      o.start();
      o.stop(c.currentTime + duration + 0.01);
    } catch {}
  }
  async function finish(id) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    try {
      callback.current(
        await api("rewardFinish", latest.current.code, {
          turnId: id,
          revision: latest.current.revision,
        }),
      );
      setError("");
    } catch (e) {
      slotAudio.current.stop();
      setError(e.message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    setError("");
    setAnimationDone(false);
    setProgress(0);
    setFrame(null);
    if (!active) return;
    let handle,
      start,
      last,
      stopped = false;
    const sim =
      active.game === "plinkoh"
        ? createDrop(
             boardForTurn(active),
            active.result.zone,
            5,
            active.seed,
          )
        : null;
    const loop = (t) => {
      if (stopped) return;
      if (start === undefined) {
        start = t;
        last = t;
      }
      let done = false;
      if (sim) {
        let events = [];
        if (reduced) {
          while (!sim.done && !sim.failed) advance(sim, 0.25);
        } else events = advance(sim, (t - last) / 1000);
        if (!reduced) for (const event of events) {
          if (event.type === "peg" || event.type === "pink") sound(event.points < 0 ? "penalty" : "peg");
          else if (event.type === "landing") sound("landing");
        }
        if (reduced && sim.done) sound("landing");
        setFrame({
          ball: { ...sim.ball },
          time: sim.time,
          hits: [...sim.hit],
          collision: sim.hits.reduce((sum, hit) => sum + hit.points, 0),
          events: reduced ? [] : sim.events.slice(-16),
          done: sim.done,
        });
        done = sim.done || sim.failed;
      } else {
        const p = reduced ? 1 : Math.min(1, (t - start) / 2500);
        setProgress(p);
        done = p === 1;
      }
      last = t;
      if (done) {
        slotAudio.current.stop();
        setAnimationDone(true);
        void finish(active.id);
      } else handle = requestAnimationFrame(loop);
    };
    handle = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(handle);
      slotAudio.current.stop();
    };
  }, [active?.id, reduced]);
  async function play(extra = {}) {
    if (guard.current) return;
    guard.current = true;
    setBusy(true);
    setError("");
    if(reward.game === "slot"){setSoundMessage("");if(!muted)slotAudio.current.start(volume);}else sound();
    if (reward.game === "plinkoh" && Number.isInteger(extra.zone)) setZone(extra.zone);
    // Keep the same request after transport errors, including its original wallet version.
    request.current ??= {
      turnId: crypto.randomUUID(),
      revision: room.revision,
      blockId: room.block.id,
      walletVersion: reward.version,
      ...extra,
    };
    try {
      onRoom(await api("rewardPlay", room.code, request.current));
      request.current = null;
    } catch (e) {
      slotAudio.current.stop();
      setError(e.message);
    } finally {
      guard.current = false;
      setBusy(false);
    }
  }
  const locked = busy || !!active || reward.remaining <= 0;
  const displayedScore = reward.game === "plinkoh" && active?.result?.physicsVersion >= 2 && !animationDone
    ? reward.score - active.result.points + (frame?.collision ?? 0) + (frame?.done ? active.result.slot : 0)
    : reward.game === "slot" && active && !animationDone ? reward.score-active.result.points : reward.score;
  return (
    <section
      className={`lh-reward ${reduced ? "lh-reward-reduced" : ""}`}
      aria-label="單人課間遊戲"
      data-game={reward.game}
    >
      <div className="lh-reward-heading">
        <div>
          <small>YOUR TURN · 單人課間遊戲</small>
          <h2>{REWARD_GAMES[reward.game]}</h2>
        </div>
        <div className="lh-reward-scoreboard">
          {reward.game === 'slot' && <div className="lh-slot-award" aria-live="polite" key={turn?.id || 'ready'}><small>本次得分</small><strong>{turn && (!active || animationDone) ? `+${turn.result.points}` : '…'}</strong></div>}
          <div className="lh-reward-score"><span>回合總分</span><strong>{displayedScore}</strong></div>
        </div>
      </div>
      <p role="status">
        剩餘機會：{reward.remaining} 次
        {active ? " · 正在完成已扣除的這一次" : ""}
      </p>
      <div className="lh-row">
        <label>
          <input
            type="checkbox"
            checked={muted}
            onChange={(e) => setMuted(e.target.checked)}
          />
          靜音
        </label>
        <label>
          <input
            type="checkbox"
            checked={reduced}
            onChange={(e) => setReduced(e.target.checked)}
          />
          減少動畫
        </label>
        {reward.game === "slot" && <><label>音效音量 {Math.round(volume*100)}%<input aria-label="拉霸音效音量" type="range" min="0" max="1" step="0.05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><button disabled={muted || !!active} onClick={()=>{setSoundMessage("");slotAudio.current.start(volume,1800);}}>試聽音效</button></>}
      </div>
      {soundMessage && <p role="status">{soundMessage}</p>}
      {reward.game === "basketball" && (
        <>
          <Court turn={turn} progress={active ? progress : 1} animal={animal} />
          <label>
            選擇動物{" "}
            <select
              value={animal}
              disabled={locked}
              onChange={(e) => setAnimal(+e.target.value)}
            >
              {animals.map((a, i) => (
                <option key={a[0]} value={i}>
                  {a[0]}
                </option>
              ))}
            </select>
          </label>
          <div className="lh-reward-actions">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                disabled={locked}
                onClick={() => play({ shot: n })}
              >
                投籃 {n} 分 <small>命中率 {{ 1: 84, 2: 56, 3: 25 }[n]}%</small>
              </button>
            ))}
          </div>
        </>
      )}
      {reward.game === "plinkoh" && (
        <>
          <div className="lh-reward-plink-stage">
            <strong className="lh-reward-plink-logo">Plink-oh!</strong>
            <div className="lh-reward-plink-board">
              <PegBoard turn={turn} frame={frame} zone={zone} />
              <div className="lh-reward-plink-launch" role="group" aria-label="球盤上方落球區，點選後立即落球">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`落球區 ${n}`} aria-pressed={zone === n} disabled={locked} onClick={() => play({ zone: n })}>{n}</button>
                ))}
              </div>
              {active && <div className="lh-reward-plink-live-score" aria-live="off">碰柱分 {frame?.collision > 0 ? "+" : ""}{frame?.collision ?? 0}</div>}
            </div>
            <p className="lh-reward-plink-legend">選上方 1–5 即放球 · 紫柱 +1 · 紅柱 −1 · 落格另加分</p>
          </div>
        </>
      )}
      {reward.game === "slot" && (
        <>
          <div className="lh-reward-slot-machine">
          <h3>獎勵拉霸機</h3>
          <div className="lh-reward-slots" aria-label="拉霸圖案">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={active && progress < 0.6 + i * 0.2 ? "rolling" : "stopped"}
              >
                {active && progress < 0.6 + i * 0.2
                  ? SLOT_ITEMS[Math.floor(progress * 60 + i) % 6]
                  : SLOT_ITEMS[turn?.result.reels?.[i]] || "❓"}
              </span>
            ))}
          </div>
          <button
            className="lh-primary lh-reward-spin"
            disabled={locked}
            onClick={() => play()}
          >
            拉霸 SPIN
          </button>
          <p>三個相同 100 分 · 兩個相同 50 分 · 其他 10 分</p>
          </div>
        </>
      )}
      {reward.game !== "slot" && turn && (!active || animationDone) && (
        <p className="lh-reward-result">
          本次 {turn.result.points >= 0 ? "+" : ""}{turn.result.points} 分
          {turn.game === "plinkoh" && Number.isFinite(turn.result.collision) && Number.isFinite(turn.result.slot)
            ? `（碰柱 ${turn.result.collision >= 0 ? "+" : ""}${turn.result.collision}、落格 +${turn.result.slot}）`
            : ""}
        </p>
      )}
      {!active && reward.remaining === 0 && (
        <h3>機會已用完，請等待老師下一題。</h3>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            disabled={busy}
            onClick={() => (active ? finish(active.id) : play(reward.game === "plinkoh" ? { zone: zone ?? 3 } : {}))}
          >
            重試確認（不重複扣次數）
          </button>
        </div>
      )}
      <p className="lh-note">
        遊戲分數不影響學習成績。老師暫停或換頁時，遊戲會收起；未用機會留在本堂課。
      </p>
    </section>
  );
}
