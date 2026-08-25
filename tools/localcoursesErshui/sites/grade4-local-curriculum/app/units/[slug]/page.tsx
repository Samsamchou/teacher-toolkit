import Link from "next/link";
import siteContent from "@/content/site-content.json";
import { SiteHeader } from "@/app/components/SiteHeader";

const icons: Record<string, string> = {
  roundhouse: "🏛️",
  "railway-reading": "📚",
  "narrow-gauge": "🚃",
};

export default async function UnitPlaceholder({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const unit = siteContent.units.find((item) => item.slug === slug);

  return (
    <main className="site-shell">
      <SiteHeader />
      <div className="page-wrap placeholder-page">
        <section className="placeholder-card">
          <div className="big-icon" aria-hidden="true">
            {icons[slug] ?? "🚉"}
          </div>
          <span className="eyebrow">UNIT PREVIEW</span>
          <h1>{unit?.displayName ?? "在地課程單元"}</h1>
          <p>
            {unit?.description ??
              "這個單元的數位教材正在準備中，老師仍可依原在地課程教案進行活動。"}
          </p>
          <p className="notice">這裡不會放入尚未確認的練習或地方資料。</p>
          <Link href="/" className="card-link">
            回到單元首頁 <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    </main>
  );
}
