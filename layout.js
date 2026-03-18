import './globals.css';

export const metadata = {
  title: 'Rassrochka Pro',
  description: 'Серьёзный учёт рассрочек на Supabase + Vercel',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
