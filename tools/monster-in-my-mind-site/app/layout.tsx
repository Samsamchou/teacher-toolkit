import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Monster in My Mind',
  description: 'English × SEL × Art × AI for Taiwanese upper elementary students.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  )
}
