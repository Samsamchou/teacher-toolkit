import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand" aria-label="回到四年級上學期在地課程首頁">
        <span className="brand__mark" aria-hidden="true">
          水
        </span>
        <span>
          <strong>4年級上學期 在地課程</strong>
          <small>ER SHUI LOCAL CURRICULUM</small>
        </span>
      </Link>
      <nav aria-label="主要導覽">
        <Link href="/">單元首頁</Link>
        <Link href="/units/train-tickets">購票練習</Link>
        <Link href="/teacher" className="teacher-link">
          <span aria-hidden="true">🔐</span> 教師後台
        </Link>
      </nav>
    </header>
  );
}
