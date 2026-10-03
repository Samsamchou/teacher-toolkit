import React, { useState } from 'react';

/** Decorative only: no classroom state, scoring or persistent student data. */
export default function SpaceTheme({ student, live }) {
  const [still, setStill] = useState(false);
  return <>
    <div className={`lh-space-scene${still ? ' is-still' : ''}`} aria-hidden="true">
      <div className="lh-space-stars" />
      <div className="lh-space-art" />
    </div>
    <section className="lh-space-banner" aria-label="太空學院">
      <div><span className="lh-space-kicker">ENGLISH SPACE ACADEMY</span>
        <h1>{student ? '準備探索英語宇宙！' : live ? '太空課堂・指揮中心' : '太空學院・任務準備站'}</h1>
        <p>{student ? '一起觀察、思考，完成今天的學習任務。' : live ? '帶領全班探索，讓每一次回答都成為新發現。' : '編排教材、設計挑戰，準備下一趟學習旅程。'}</p>
      </div>
      <button type="button" aria-pressed={still} onClick={() => setStill(!still)}>{still ? '靜態背景：開啟' : '切換靜態背景'}</button>
    </section>
  </>;
}
