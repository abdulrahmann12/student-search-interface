import './globals.css';

export const metadata = {
  title: 'Student Registration Reconciliation',
  description:
    'Compare semester intersection workbooks against paper registration forms and export a reconciliation report.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}