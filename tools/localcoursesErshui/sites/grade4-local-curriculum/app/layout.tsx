import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "4年級上學期 在地課程",
    template: "%s｜4年級上學期 在地課程",
  },
  description:
    "二水國小四年級在地課程數位學習網站，從二水出發認識鐵道、練習閱讀模擬車票。",
  icons: {
    icon: "/favicon.svg",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "4年級上學期 在地課程",
    description: "從二水出發，展開兒童友善的鐵道學習之旅。",
    type: "website",
    images: [
      {
        url: "/assets/social-card.webp",
        width: 1200,
        height: 630,
        alt: "4年級上學期在地課程，二水鐵道學習之旅",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
