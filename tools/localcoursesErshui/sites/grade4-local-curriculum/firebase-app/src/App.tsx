import { lazy, Suspense, useEffect, useState } from "react";

const StudentPractice = lazy(() =>
  import("./StudentPractice").then((module) => ({
    default: module.StudentPractice,
  })),
);
const RailwayReading = lazy(() =>
  import("./RailwayReading").then((module) => ({
    default: module.RailwayReading,
  })),
);
const TeacherDashboard = lazy(() =>
  import("./TeacherDashboard").then((module) => ({
    default: module.TeacherDashboard,
  })),
);

const units = [
  {
    slug: "roundhouse",
    badge: "ROUNDHOUSE",
    title: "扇形車庫",
    description: "從扇形軌道、轉車臺與車庫門認識鐵道文化。",
    image: "/assets/home-roundhouse.webp",
    active: false,
  },
  {
    slug: "train-tickets",
    badge: "LET’S GO!",
    title: "坐火車趣集集",
    description: "從二水出發，使用真實車次練習查詢與核對行程。",
    image: "/assets/home-jiji-train.webp",
    active: true,
  },
  {
    slug: "railway-reading",
    badge: "READ & FIND",
    title: "閱覽鐵道風華",
    description: "閱讀山線、海線與鐵路故事，認識沿線景觀。",
    image: "/assets/home-railway-reading.webp",
    active: true,
  },
  {
    slug: "narrow-gauge",
    badge: "THEN & NOW",
    title: "介紹五分車與認識小火車鐵道",
    description: "比較五分車、窄軌與一般火車的運輸特色。",
    image: "/assets/home-narrow-gauge.webp",
    active: false,
  },
];

function useRoute() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);
  function navigate(nextPath: string) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return { path, navigate };
}

export default function App() {
  const { path, navigate } = useRoute();
  if (path === "/teacher") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <TeacherDashboard onHome={() => navigate("/")} />
      </Suspense>
    );
  }
  if (path === "/units/train-tickets") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <StudentPractice onHome={() => navigate("/")} />
      </Suspense>
    );
  }
  if (path === "/units/railway-reading") {
    return (
      <Suspense fallback={<RouteLoading />}>
        <RailwayReading onHome={() => navigate("/")} />
      </Suspense>
    );
  }
  if (path.startsWith("/units/")) {
    const slug = path.split("/").filter(Boolean).at(-1);
    const unit = units.find((item) => item.slug === slug);
    return (
      <main className="placeholder-shell">
        <button type="button" className="ghost-button" onClick={() => navigate("/")}>
          ← 回課程首頁
        </button>
        <section>
          <span>🚉</span>
          <h1>{unit?.title ?? "在地課程"}</h1>
          <p>這個單元的數位教材正在準備中。</p>
        </section>
      </main>
    );
  }
  return <Home onNavigate={navigate} />;
}

function RouteLoading() {
  return (
    <main className="placeholder-shell">
      <section>
        <span>🚆</span>
        <h1>教材載入中…</h1>
      </section>
    </main>
  );
}

function Home({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <main className="home-shell">
      <header className="site-header">
        <button type="button" className="brand" onClick={() => onNavigate("/")}>
          <span aria-hidden="true">🚆</span>
          <div>
            <strong>二水鐵道小學堂</strong>
            <small>ERHSUI RAILWAY CLASS</small>
          </div>
        </button>
        <button
          type="button"
          className="teacher-entry"
          onClick={() => onNavigate("/teacher")}
        >
          🔐 教師後台
        </button>
      </header>

      <section className="home-hero">
        <div className="hero-copy">
          <span className="eyebrow">ER · SHUI · RAILWAY ADVENTURE</span>
          <h1>
            從二水出發，
            <strong>搭上我們的在地學習列車！</strong>
          </h1>
          <p>
            觀察、閱讀、比較，再用簡單英語分享你發現的鐵道故事。
          </p>
          <div className="hero-pills">
            <span>👀 Observe</span>
            <span>💬 Speak</span>
            <span>🧭 Explore</span>
          </div>
          <button
            type="button"
            className="hero-button"
            onClick={() => onNavigate("/units/train-tickets")}
          >
            前往「坐火車趣集集」 <span>→</span>
          </button>
        </div>
        <div className="hero-art">
          <img src="/assets/home-jiji-train.webp" alt="老師帶著學生觀察行駛在二水田野間的火車" />
          <div className="floating-ticket">
            <small>TODAY’S LEARNING TICKET</small>
            <strong>二水 Ershui → 在地新發現</strong>
            <span>Check from · to · date · train · time</span>
          </div>
        </div>
      </section>

      <section className="unit-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CHOOSE A UNIT</span>
            <h2>選一個單元，開始探索</h2>
          </div>
          <p>購票活動使用真實車次資料，但不會完成真實訂票。</p>
        </div>
        <div className="unit-grid">
          {units.map((unit, index) => (
            <article className={`unit-card unit-card--${index + 1}`} key={unit.slug}>
              <div className="unit-image">
                <img src={unit.image} alt="" />
                <span className="unit-number">0{index + 1}</span>
                <span className="unit-badge">{unit.badge}</span>
              </div>
              <div className="unit-body">
                <h3>{unit.title}</h3>
                <p>{unit.description}</p>
                <button
                  type="button"
                  className={unit.active ? "card-button" : "card-button soft"}
                  onClick={() => onNavigate(`/units/${unit.slug}`)}
                >
                  {unit.active ? "開始學習 Start" : "查看單元預告"}
                  <span>→</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="site-footer">
        <p>二水國小四年級在地課程 · Learning from our hometown</p>
        <p>學生只需輸入學號；請勿輸入姓名、電話或付款資料。</p>
      </footer>
    </main>
  );
}
