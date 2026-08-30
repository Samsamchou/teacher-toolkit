import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { SEMESTER } from "../data/semester";
import { useAppData } from "../state/AppDataContext";
import { InlineNotice } from "./Common";
import { IncidentPage } from "./IncidentPage";
import { RecordsPage } from "./RecordsPage";
import { SchedulePage } from "./SchedulePage";
import { SettingsPage } from "./SettingsPage";
import { SubmissionPage } from "./SubmissionPage";

export type TabId = "schedule" | "submissions" | "incidents" | "records" | "settings";

const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: "schedule", label: "本週課表", icon: "▦" },
  { id: "submissions", label: "作業繳交", icon: "✓" },
  { id: "incidents", label: "課堂情況", icon: "✎" },
  { id: "records", label: "後臺紀錄", icon: "▤" },
  { id: "settings", label: "設定", icon: "⚙" },
];

export function Dashboard() {
  const { mode, privateDevice, signOutTeacher } = useAuth();
  const { ready, error } = useAppData();
  const [tab, setTab] = useState<TabId>("schedule");

  return (
    <div className="dashboard-shell">
      <a className="skip-link" href="#main-content">跳到主要內容</a>
      <aside className="sidebar" aria-label="教師後臺導覽">
        <div className="sidebar__brand">
          <span className="brand__mark" aria-hidden="true">好</span>
          <span><strong>英語作業與課堂紀錄</strong><small>教師工作臺</small></span>
        </div>
        <nav className="sidebar__nav">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={tab === item.id ? "is-active" : ""}
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
            >
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar__semester">
          <span>目前學期</span>
          <strong>{SEMESTER.label}</strong>
          <small>{SEMESTER.startDate.replaceAll("-", "/")}–{SEMESTER.endDate.replaceAll("-", "/")}</small>
        </div>
        <button className="sidebar__signout" type="button" onClick={() => void signOutTeacher()}>
          <span aria-hidden="true">↪</span> 安全登出
        </button>
      </aside>

      <div className="dashboard-main">
        <header className="mobile-header">
          <div className="sidebar__brand">
            <span className="brand__mark" aria-hidden="true">好</span>
            <span><strong>英語作業與課堂紀錄</strong><small>教師工作臺</small></span>
          </div>
          <button className="button button--ghost button--small" type="button" onClick={() => void signOutTeacher()}>登出</button>
        </header>
        <nav className="mobile-tabs" aria-label="教師後臺導覽">
          {TABS.map((item) => (
            <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>
              <span aria-hidden="true">{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="dashboard-statusbar">
          <span className={`mode-pill mode-pill--${mode}`}>
            <i aria-hidden="true" /> {mode === "demo" ? "本機展示" : "Firebase"}
          </span>
          <span>{privateDevice ? "私人裝置・保留 7 天" : "共用裝置・閒置 30 分鐘登出"}</span>
        </div>

        {mode === "demo" ? (
          <div className="demo-dashboard-warning">
            <strong>展示模式：</strong>任意 6 位數皆可登入，資料只存此瀏覽器；不是正式安全環境，請勿輸入真實學生紀錄。
          </div>
        ) : null}
        {error ? <div className="content-wrap"><InlineNotice tone="danger" title="資料載入失敗">{error}</InlineNotice></div> : null}

        <main id="main-content" className="dashboard-content" tabIndex={-1}>
          {!ready ? (
            <div className="loading-state" role="status"><span aria-hidden="true" />正在準備教師工作臺…</div>
          ) : (
            <>
              {tab === "schedule" ? <SchedulePage /> : null}
              {tab === "submissions" ? <SubmissionPage onGoSchedule={() => setTab("schedule")} /> : null}
              {tab === "incidents" ? <IncidentPage /> : null}
              {tab === "records" ? <RecordsPage /> : null}
              {tab === "settings" ? <SettingsPage /> : null}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
