import { useState } from 'react'
import MonsterApp from './MonsterApp'
import RoutinesApp from './routines/RoutinesApp'
import RoutinesTeacher from './routines/RoutinesTeacher'
import SafariApp from './safari/SafariApp'
import SafariTeacher from './safari/SafariTeacher'
import { TeacherPortal } from './components/TeacherPortal'
import { Gallery } from './components/Gallery'
import { localPreview } from './services/firebase'
import { SpeechProvider } from './components/Speech'
// World Routines Trip at /world-routines: hidden from the home page 2026-11-19, shown since 2026-11-21 (teacher: all ten stations live). Set to false to hide the tile again.
const SHOW_ROUTINES_TILE = true
export function ClassActivities() {
  const [path] = useState(() => typeof window === 'undefined' ? '/' : window.location.pathname)
  const monster = path === '/festivals/monster-in-my-mind' || path === '/festivals/monster-in-my-mind/'
  const banner=localPreview?<div className="preview-banner">本機流程預覽 · 示範圖片與分數 · 不呼叫 AI、不保存到雲端 · 教師示範碼 000000</div>:null
  if (path === '/world-routines/teacher' || path === '/world-routines/teacher/') return <>{banner}<RoutinesTeacher /></>
  if (path === '/world-routines' || path === '/world-routines/') return <>{banner}<RoutinesApp /></>
  // he/she trip (2026-11-24): own progress and teacher records; same games, art and cards as /world-routines.
  if (path === '/world-routines-he-she/teacher' || path === '/world-routines-he-she/teacher/') return <>{banner}<RoutinesTeacher variant="hs" /></>
  if (path === '/world-routines-he-she' || path === '/world-routines-he-she/') return <>{banner}<RoutinesApp variant="hs" /></>
  // Safari Count (HWG5 U4, 2026-11-24): home tile since 2026-11-26. 11/25: student ID login, server checks, teacher records at /safari-count/teacher.
  if (path === '/safari-count/teacher' || path === '/safari-count/teacher/') return <>{banner}<SafariTeacher /></>
  if (path === '/safari-count' || path === '/safari-count/') return <>{banner}<SafariApp /></>
  if (path === '/teacher') return <>{banner}<SpeechProvider><TeacherPortal /></SpeechProvider></>
  if (path === '/gallery') return <>{banner}<SpeechProvider><Gallery /></SpeechProvider></>
  return <>
    {banner}
    <nav className="class-navigation" aria-label="Class Activities">
      <a href="/">✦ Class Activities</a>
      {monster && <a href="/festivals">festivals</a>}
      <a href="/teacher">Teacher / 教師</a>
    </nav>
    {monster ? <MonsterApp /> : <main id="main-content" className="activity-landing">
      <span className="hero-kicker">LEARN · PLAY · CREATE</span>
      <h1>{path.startsWith('/festivals') ? 'festivals' : 'Class Activities'}</h1>
      <p>{path.startsWith('/festivals') ? 'Pick an activity. / 選一個活動。' : 'Let’s learn together! / 一起學習吧！'}</p>
      <div className="activity-tiles">
        <a className="activity-tile" href={path.startsWith('/festivals') ? '/festivals/monster-in-my-mind' : '/festivals'}>
          <span aria-hidden="true">{path.startsWith('/festivals') ? '👾' : '🎉'}</span>
          <strong>{path.startsWith('/festivals') ? 'Monster in My Mind' : 'festivals'}</strong>
          <small>{path.startsWith('/festivals') ? 'Feel it. Say it. Create it. / 感受、表達、創作' : '節慶活動'}</small>
          <b aria-hidden="true">→</b>
        </a>
        {SHOW_ROUTINES_TILE && !path.startsWith('/festivals') && <a className="activity-tile" href="/world-routines">
          <span aria-hidden="true">🌍</span>
          <strong>World Routines Trip</strong>
          <small>What time do you …? / 世界作息之旅</small>
          <em className="tile-grade">六年級 HWG7 U04</em>
          <b aria-hidden="true">→</b>
        </a>}
        {/* 2026-11-26 teacher (RDQ home-tiles): he/she trip and Safari Count get home tiles. */}
        {!path.startsWith('/festivals') && <a className="activity-tile" href="/world-routines-he-she">
          <span aria-hidden="true">👫</span>
          <strong>World Routines Trip: He/She</strong>
          <small>What time does he/she …? / 世界作息之旅 he/she 版</small>
          <em className="tile-grade">六年級 HWG7 U04</em>
          <b aria-hidden="true">→</b>
        </a>}
        {!path.startsWith('/festivals') && <a className="activity-tile" href="/safari-count">
          <span aria-hidden="true">🦒</span>
          <strong>Safari Count</strong>
          <small>How many … are there? / 數數動物園</small>
          <em className="tile-grade">五年級 HWG5 U4</em>
          <b aria-hidden="true">→</b>
        </a>}
        {path.startsWith('/festivals') && <a className="activity-tile" href="/festivals/write-a-thankful-card/">
          <span aria-hidden="true">🦃</span>
          <strong>Write a Thankful Card</strong>
          <small>Listen, pick, and write. / 聽、選、寫感恩卡</small>
          <b aria-hidden="true">→</b>
        </a>}
      </div>
      {!path.startsWith('/festivals') && <nav className="teacher-links" aria-label="Teacher pages / 老師頁">
        <span>Teacher / 老師頁</span>
        <a href="/world-routines/teacher">🌍 World Routines（I 版）</a>
        <a href="/world-routines-he-she/teacher">👫 World Routines（he/she 版）</a>
        <a href="/safari-count/teacher">🦒 Safari Count</a>
      </nav>}
    </main>}
  </>
}
