import React from 'react';
import { RewardGames } from '../live/RewardGames.jsx';

// Reuses the classroom game UI; plays and finishes go to the assignment service,
// which decides every result and returns the student's full snapshot.
const ACTIONS = { rewardPlay: 'assignmentRewardPlay', rewardFinish: 'assignmentRewardFinish' };

export function AssignmentReward({ snapshot, code, api, onSnapshot, title }) {
  const view = snapshot?.reward;
  if (!view || (!view.eligible && !view.pending && !view.last)) return null;
  const room = { code, revision: snapshot.run.revision, block: { id: view.blockId }, reward: view };
  const call = (action, roomCode, payload) => api(ACTIONS[action], roomCode, payload);
  return <section className="as-reward-game" aria-label="課間遊戲">
    {title && <h3>{title}</h3>}
    <p className="as-reward-game-note">遊戲分數只是好玩，不會改變英語成績。{view.remaining > 0 ? `還有 ${view.remaining} 次機會。` : view.pending ? '' : '這次的機會已用完。'}</p>
    <RewardGames key={view.blockId} room={room} onRoom={onSnapshot} call={call} note="" doneText={snapshot.assignment.mode === 'exam' ? '遊戲機會已全部用完。' : '這一題的機會已用完，可以前往下一題。'} />
  </section>;
}
