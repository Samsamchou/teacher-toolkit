import { Loader2, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  PULLS_PER_ROUND,
  SYMBOLS,
  prizeName,
  randomPull,
  scorePull,
} from "./questionSets.js";
import "./slot.css";

const SYMBOL_IDS = SYMBOLS.map((symbol) => symbol.id);
const symbolSrc = (id) => `/slot/${id}.webp`;
const STRIP_LENGTH = 26; // symbols scrolled past on each spin
const REEL_TIMES = [1500, 2050, 2650]; // ms until each reel stops

const randomSymbol = () => SYMBOL_IDS[Math.floor(Math.random() * SYMBOL_IDS.length)];

// ---------------------------------------------------------------- sounds ----
// All sounds are synthesized with Web Audio, so no audio files are needed.
function createSounds(enabled) {
  let context = null;
  const ctx = () => {
    if (!enabled) return null;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!context) context = new AudioContextClass();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  };
  const tone = (frequency, start, length, { type = "square", volume = 0.12, slideTo } = {}) => {
    const c = ctx();
    if (!c) return;
    const at = c.currentTime + start;
    const oscillator = c.createOscillator();
    const gain = c.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, at + length);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain).connect(c.destination);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
  };
  return {
    unlock: () => ctx(),
    ratchet: () => [0, 0.05, 0.1, 0.15].forEach((t, i) => tone(180 + i * 40, t, 0.04, { volume: 0.08 })),
    tick: () => tone(900 + Math.random() * 300, 0, 0.03, { type: "triangle", volume: 0.05 }),
    stop: () => tone(140, 0, 0.16, { type: "sawtooth", volume: 0.14, slideTo: 70 }),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.2, { type: "triangle", volume: 0.16 })),
    jackpot: () => {
      [523, 659, 784, 1047, 784, 1047, 1319, 1568].forEach((f, i) =>
        tone(f, i * 0.11, 0.26, { type: "square", volume: 0.1 }),
      );
      for (let i = 0; i < 14; i += 1) tone(1800 + Math.random() * 900, 0.9 + i * 0.07, 0.08, { type: "sine", volume: 0.07 });
    },
    small: () => tone(660, 0, 0.18, { type: "triangle", volume: 0.1 }),
    close: () => context?.close().catch(() => {}),
  };
}

// ----------------------------------------------------------------- reel -----
function Reel({ spinId, symbol, index, finalSymbol, onStopped }) {
  // strip holds the symbols shown; the reel scrolls so `targetIndex` lands in
  // the middle row (the payline).
  const [strip, setStrip] = useState(() => [randomSymbol(), finalSymbol, randomSymbol()]);
  const [offset, setOffset] = useState(0); // index of the top visible cell
  const [animate, setAnimate] = useState(false);
  const [blur, setBlur] = useState(false);
  const stripRef = useRef(strip);
  stripRef.current = strip;

  useEffect(() => {
    if (!spinId) return undefined;
    const current = stripRef.current;
    const middle = current[offset + 1] ?? current[1];
    const top = current[offset] ?? current[0];
    const fresh = [top, middle];
    for (let i = 0; i < STRIP_LENGTH; i += 1) fresh.push(randomSymbol());
    fresh.push(symbol, randomSymbol());
    setAnimate(false);
    setOffset(0);
    setStrip(fresh);
    const duration = REEL_TIMES[index];
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        setAnimate(true);
        setBlur(true);
        setOffset(fresh.length - 3);
      });
    });
    const blurTimer = window.setTimeout(() => setBlur(false), duration - 380);
    const stopTimer = window.setTimeout(() => onStopped(index), duration);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(blurTimer);
      window.clearTimeout(stopTimer);
    };
    // offset is read only at spin start on purpose
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinId]);

  return (
    <div className="slot-reel">
      <div
        className={`slot-strip ${blur ? "blurred" : ""}`}
        style={{
          height: `${(strip.length * 100) / 3}%`,
          transform: `translateY(calc(-100% * ${offset} / ${strip.length}))`,
          transition: animate
            ? `transform ${REEL_TIMES[index]}ms cubic-bezier(0.12, 0.62, 0.18, 1.04)`
            : "none",
        }}
      >
        {strip.map((id, i) => (
          <div className="slot-cell" key={i} style={{ height: `calc(100% / ${strip.length})` }}>
            <img src={symbolSrc(id)} alt="" draggable="false" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- lever -----
function Lever({ disabled, onPull, sounds }) {
  const [pull, setPull] = useState(0); // 0 = up, 1 = fully down
  const [springing, setSpringing] = useState(false);
  const drag = useRef(null);
  const trackRef = useRef(null);
  const travel = () => (trackRef.current?.getBoundingClientRect().height || 240) * 0.56;

  const release = useCallback(
    (fire) => {
      setSpringing(true);
      setPull(0);
      if (fire) onPull();
      window.setTimeout(() => setSpringing(false), 520);
    },
    [onPull],
  );

  const autoPull = () => {
    if (disabled) return;
    sounds.unlock();
    sounds.ratchet();
    setSpringing(true);
    setPull(1);
    window.setTimeout(() => release(true), 260);
  };

  const onPointerDown = (event) => {
    if (disabled) return;
    event.preventDefault();
    sounds.unlock();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { startY: event.clientY, moved: false, lastStep: 0 };
    setSpringing(false);
  };
  const onPointerMove = (event) => {
    if (!drag.current) return;
    const amount = Math.max(0, Math.min(1, (event.clientY - drag.current.startY) / travel()));
    if (amount > 0.04) drag.current.moved = true;
    const step = Math.floor(amount * 5);
    if (step > drag.current.lastStep) {
      drag.current.lastStep = step;
      sounds.tick();
    }
    setPull(amount);
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    const { moved } = drag.current;
    drag.current = null;
    if (!moved) {
      autoPull();
      return;
    }
    release(pull > 0.55);
  };

  // The knob travels down; the rod is drawn from the pivot to the knob, so it
  // shrinks and then flips below the pivot like a real handle seen head-on.
  const knobCenter = 8 + pull * 56; // % of the lever track
  const pivot = 38;
  const springStyle = springing ? "all 480ms cubic-bezier(0.34, 1.7, 0.5, 1)" : "none";
  return (
    <div className={`slot-lever ${disabled ? "disabled" : ""}`} ref={trackRef}>
      <div className="lever-slot" />
      <div
        className="lever-rod"
        style={{
          top: `${Math.min(knobCenter, pivot)}%`,
          height: `${Math.max(1, Math.abs(pivot - knobCenter))}%`,
          transition: springStyle,
        }}
      />
      <div className="lever-pivot" style={{ top: `${pivot}%` }} />
      <button
        type="button"
        className="lever-knob"
        aria-label="拉下拉桿"
        disabled={disabled}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={(event) => (event.key === "Enter" || event.key === " ") && autoPull()}
        style={{
          top: `${knobCenter}%`,
          transform: `translate(-50%, -50%) scale(${1 + pull * 0.3})`,
          transition: springStyle,
        }}
      />
      {!disabled && pull === 0 && <span className="lever-hint">往下拉！</span>}
    </div>
  );
}

// ---------------------------------------------------------- effects ---------
function CoinShower({ count = 42 }) {
  return (
    <div className="coin-shower" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i
          key={i}
          style={{
            left: `${(i * 37) % 100}%`,
            animationDelay: `${(i % 14) * 0.09}s`,
            animationDuration: `${1.4 + (i % 5) * 0.22}s`,
            "--drift": `${((i * 53) % 60) - 30}px`,
          }}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------ machine -------
export default function SlotMachine({
  roundNumber,
  totalRounds,
  correctCount,
  currentScore,
  final,
  saving,
  soundOn,
  onComplete,
}) {
  const sounds = useRef(null);
  if (!sounds.current) sounds.current = createSounds(soundOn);
  const [pulls, setPulls] = useState([]); // [{symbols, points}]
  const [spin, setSpin] = useState(null); // {id, symbols}
  const [stopped, setStopped] = useState(0);
  const [celebration, setCelebration] = useState(null);
  const tickTimer = useRef(null);
  const stoppedRef = useRef(0);
  const spinning = Boolean(spin) && stopped < 3;
  const done = pulls.length === PULLS_PER_ROUND && !spinning;
  const roundScore = pulls.reduce((sum, pull) => sum + pull.points, 0);

  useEffect(() => {
    const current = sounds.current;
    return () => {
      window.clearInterval(tickTimer.current);
      current.close();
    };
  }, []);

  const startSpin = useCallback(() => {
    if (spinning || pulls.length >= PULLS_PER_ROUND) return;
    const symbols = randomPull();
    setCelebration(null);
    stoppedRef.current = 0;
    setStopped(0);
    setSpin({ id: Date.now(), symbols });
    window.clearInterval(tickTimer.current);
    tickTimer.current = window.setInterval(() => sounds.current.tick(), 85);
  }, [pulls.length, spinning]);

  const reelStopped = useCallback(() => {
    sounds.current.stop();
    stoppedRef.current += 1;
    setStopped(stoppedRef.current);
    if (stoppedRef.current !== 3 || !spin) return;
    window.clearInterval(tickTimer.current);
    const points = scorePull(spin.symbols);
    setPulls((list) => [...list, { symbols: spin.symbols, points }]);
    setCelebration({ points, key: spin.id });
    if (points >= 200) sounds.current.jackpot();
    else if (points >= 50) sounds.current.win();
    else sounds.current.small();
  }, [spin]);

  const level = celebration
    ? celebration.points >= 500
      ? "mega"
      : celebration.points >= 200
        ? "big"
        : celebration.points >= 50
          ? "win"
          : "small"
    : "";

  return (
    <div className="slot-reward-overlay" role="dialog" aria-modal="true">
      <section className={`slot-stage ${spinning ? "is-spinning" : ""} ${level}`}>
        <header className="slot-stage-heading">
          <Trophy size={30} />
          <div>
            <p>
              第 {roundNumber}／{totalRounds} 回拉霸・已答對 {correctCount} 題
            </p>
            <h2>{final ? "全部完成！最後一回拉霸" : "答對獎勵！拉 3 次拉桿"}</h2>
          </div>
        </header>

        <div className="slot-marquee" aria-hidden="true">
          <span>LUCKY</span>
          <span className="marquee-star">★</span>
          <span>LETTERS</span>
        </div>

        <div className="slot-rig">
          <div className="slot-cabinet">
            <img className="cabinet-art" src="/slot/cabinet.webp" alt="" draggable="false" />
            <div className="slot-window">
              {[0, 1, 2].map((index) => (
                <Reel
                  key={index}
                  index={index}
                  spinId={spin?.id || 0}
                  symbol={spin?.symbols[index]}
                  finalSymbol={SYMBOL_IDS[(index * 2) % SYMBOL_IDS.length]}
                  onStopped={reelStopped}
                />
              ))}
              <div className="payline" />
              <div className="window-glass" />
            </div>
            <div className="cabinet-sweep" aria-hidden="true" />
          </div>
          <Lever disabled={spinning || done || saving} onPull={startSpin} sounds={sounds.current} />
        </div>

        {celebration && !spinning && (
          <div className={`prize-banner ${level}`} key={celebration.key}>
            <strong>{prizeName(celebration.points)}</strong>
            <span>+{celebration.points}</span>
          </div>
        )}
        {celebration && !spinning && celebration.points >= 200 && (
          <>
            <div className="jackpot-flash" key={`flash-${celebration.key}`} />
            <CoinShower key={`coins-${celebration.key}`} count={celebration.points >= 500 ? 70 : 42} />
          </>
        )}

        <div className="slot-scoreboard">
          <div className="pull-chips">
            {Array.from({ length: PULLS_PER_ROUND }, (_, i) => (
              <span key={i} className={pulls[i] ? (pulls[i].points >= 50 ? "chip won" : "chip used") : "chip"}>
                <small>第 {i + 1} 拉</small>
                <strong>{pulls[i] ? `+${pulls[i].points}` : "—"}</strong>
              </span>
            ))}
          </div>
          <div className="score-totals">
            <span>
              <small>本回得分</small>
              <strong>{roundScore}</strong>
            </span>
            <span>
              <small>總分</small>
              <strong>{currentScore + roundScore}</strong>
            </span>
          </div>
          {done ? (
            <button
              className="slot-continue"
              type="button"
              disabled={saving}
              onClick={() => onComplete(roundScore)}
            >
              {saving ? <Loader2 className="spin" /> : null}
              {saving ? "儲存成績中…" : final ? "查看完成成績" : "繼續下一題"}
            </button>
          ) : (
            <p className="slot-tip">
              {spinning ? "轉輪轉動中…" : `往下拉拉桿，或點一下紅色球（還剩 ${PULLS_PER_ROUND - pulls.length} 拉）`}
            </p>
          )}
        </div>
        <p className="paytable">三個 7 = 500・三個相同 = 200・兩個相同 = 50・其他 = 10</p>
      </section>
    </div>
  );
}
