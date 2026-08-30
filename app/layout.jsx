import './globals.css';
import NoticeBanner from './_components/NoticeBanner';

export const metadata = {
  title: '스탬프 투어',
  description: '학교 행사용 QR 스탬프 투어',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <meta name="theme-color" content="#B5651D" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0" />
      </head>
      <body>
        <NoticeBanner />
        {children}
      </body>
    </html>
  );
}
