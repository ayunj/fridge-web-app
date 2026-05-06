import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '나의 냉장고',
  description: '1인용 냉장고 · 레시피 관리 앱',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Dodum&family=IBM+Plex+Mono:wght@400;500&family=Noto+Sans+KR:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <style>{`
          html, body, button, input {
            font-family: 'Gowun Dodum', 'Noto Sans KR', system-ui, sans-serif;
          }
          .font-mono {
            font-family: 'IBM Plex Mono', ui-monospace, monospace;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
