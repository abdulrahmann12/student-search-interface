import AppHeader from '@/src/components/AppHeader';
import AppProviders from '@/src/components/AppProviders';
import './globals.css';

export const metadata = {
  title: 'Student Registration Reconciliation',
  description:
    'Compare semester intersection workbooks against paper registration forms and export a reconciliation report.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          <AppHeader />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}