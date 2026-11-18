import React, { useState } from 'react';
import { RewardGames } from '../live/RewardGames.jsx';

// Reuses the classroom game UI; plays and finishes go to the assignment service,
// which decides every result and returns the student's full snapshot.
const ACTIONS = { rewardPlay: 'assignmentRewardPlay', rewardFinish: 'assignmentRewardFinish' };

// Browsers only play sound after a tap; the first tap on the game page plays a short chime.
function chime() {
  try {
    const C = window.AudioContext || window.webkitAudioContext, c = new C(), at = c.currentTime + 0.01;
    [660, 880].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = f; g.gain.setValueAtTime(0.0001, at + i * 0.12); g.gain.exponentialRampToValueAtTime(0.12, at + i * 0.12 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + i * 0.12 + 0.25); o.connect(g).connect(c.destination); o.start(at + i * 0.12); o.stop(at + i * 0.12 + 0.3); });
    setTimeout(() => c.close().catch(() => {}), 800);
  } catch {}
}
const heardKey = 'lh-assignment-sound-tapped';
const wasTapped = () => { try { return sessionStorage.getItem(heardKey) === '1'; } catch { return false; } };

export const hasRewardTurns = view => Boolean(view && (view.pending || (view.eligible && view.remaining > 0)));

// Full-screen game page: status bar on top, the game fills the rest, navigation at the bottom.
export function AssignmentGamePage({ snapshot, code, api, onSnapshot, onNext, nextLabel, onBack, backLabel, busy, onSwitch }) {
  const view = snapshot.reward, [options, setOptions] = useState(false), [tapped, setTapped] = useState(wasTapped);
  const unlock = () => { if (tapped) return; setTapped(true); try { sessionStorage.setItem(heardKey, '1'); } catch {} chime(); };
  const room = { code, revision: snapshot.run.revision, block: { id: view.blockId }, reward: view };
  const call = (action, roomCode, payload) => api(ACTIONS[action], roomCode, payload);
  const exam = snapshot.assignment.mode === 'exam', done = !view.pending && view.remaining <= 0;
  const turn = view.last && !view.pending ? view.last.result?.points : null;
  return <main className="as-game-page" data-game={view.game} data-options={options || undefined} aria-label="課間遊戲頁" onPointerDownCapture={unlock}>
    {!tapped && <button className="as-sound-hint" onClick={unlock}>🔊 點一下開啟聲音</button>}
    <header className="as-game-bar">
      <b>🎮 {view.gameName}</b>
      <span>{snapshot.run.studentId} · {exam ? '交卷後遊戲' : `第 ${snapshot.run.index + 1} 題`}</span>
      <span>剩餘機會 <b>{view.remaining}</b></span>
      <span>遊戲總分 <b>{view.score}</b></span>
      <button className="as-game-sound" aria-expanded={options} onClick={() => setOptions(v => !v)}>{options ? '收起設定' : '♫ 聲音'}</button>
      {onSwitch && <button className="as-switch-student" disabled={busy || !!view.pending} onClick={onSwitch}>換學號</button>}
    </header>
    <div className="as-game-stage">
      <RewardGames key={view.blockId} room={room} onRoom={onSnapshot} call={call} soundOn note="" doneText={exam ? '遊戲機會已全部用完。' : '這一題的機會已用完。'} />
    </div>
    <footer className="as-game-nav">
      <span>{done ? `機會用完了${turn != null ? `，上一次 ${turn >= 0 ? '+' : ''}${turn} 分` : ''}。遊戲分數不計入英語成績。` : '遊戲分數不計入英語成績。'}</span>
      {onBack && <button disabled={busy || !!view.pending} onClick={onBack}>{backLabel}</button>}
      {onNext && <button className={done ? 'lh-primary' : 'as-game-forfeit'} disabled={busy || !!view.pending} onClick={onNext}>{done ? nextLabel : `放棄剩餘機會，${nextLabel}`}</button>}
    </footer>
  </main>;
}
