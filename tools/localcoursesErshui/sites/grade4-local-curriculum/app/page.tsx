import Link from "next/link";
import Image from "next/image";
import siteContent from "@/content/site-content.json";
import { SiteHeader } from "./components/SiteHeader";

const cardDecorations: Record<string, { badge: string; image: string }> = {
  "unit.roundhouse": {
    badge: "ROUNDHOUSE",
    image: "/assets/home-roundhouse.webp",
  },
  "unit.train-tickets": {
    badge: "LET'S GO!",
    image: "/assets/home-jiji-train.webp",
  },
  "unit.railway-reading": {
    badge: "READ & FIND",
    image: "/assets/home-railway-reading.webp",
  },
  "unit.narrow-gauge": {
    badge: "THEN & NOW",
    image: "/assets/home-narrow-gauge.webp",
  },
};

export default function Home() {
  return (
    <main className="site-shell">
      <SiteHeader />
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero__copy">
          <span className="eyebrow">ER · SHUI · RAILWAY ADVENTURE</span>
          <h1 id="home-title">
            從二水出發，
            <span>搭上我們的在地學習列車！</span>
          </h1>
          <p>
            四個主題、四種任務。觀察、閱讀、比較，再用簡單英語分享你發現的鐵道故事。
          </p>
          <div className="hero-pills" aria-label="學習方式">
            <span>👀 Observe</span>
            <span>💬 Speak</span>
            <span>🧭 Explore</span>
          </div>
        </div>
        <div className="hero-ticket" aria-label="今日學習車票">
          <div className="hero-ticket__rail" aria-hidden="true">
            <span>🚂</span>
          </div>
          <div>
            <small>TODAY&apos;S LEARNING TICKET</small>
            <strong>二水 Ershui</strong>
            <span className="ticket-arrow">→</span>
            <strong>在地新發現</strong>
          </div>
          <p>Check from · to · date · train · time</p>
        </div>
      </section>

      <section className="unit-section" aria-labelledby="units-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">CHOOSE A UNIT</span>
            <h2 id="units-title">選一個單元，開始探索</h2>
          </div>
          <p>本網站使用模擬教材，不可作為真實乘車或訂票資訊。</p>
        </div>
        <div className="unit-grid">
          {siteContent.units.map((unit, index) => {
            const decoration = cardDecorations[unit.id];
            const active = unit.status === "specified";
            return (
              <article
                className={`unit-card unit-card--${index + 1}`}
                key={unit.id}
              >
                <div className="unit-card__image">
                  <Image
                    src={decoration.image}
                    alt=""
                    width={1600}
                    height={900}
                    sizes="(max-width: 900px) 100vw, 50vw"
                    unoptimized
                  />
                  <span className="unit-card__number">0{index + 1}</span>
                  <span className="unit-card__badge">{decoration.badge}</span>
                </div>
                <div className="unit-card__body">
                  <h3>{unit.displayName}</h3>
                  <p>{unit.description}</p>
                  <Link
                    href={unit.route}
                    className={active ? "card-link" : "card-link card-link--soft"}
                    aria-label={`${unit.displayName}：${active ? "開始學習" : "查看單元預告"}`}
                  >
                    {active ? "開始學習 Start" : "查看單元預告"}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="site-footer">
        <p>二水國小四年級在地課程 · Learning from our hometown</p>
        <p>學生不需登入；教師資料僅供課程紀錄使用。</p>
      </footer>
    </main>
  );
}
