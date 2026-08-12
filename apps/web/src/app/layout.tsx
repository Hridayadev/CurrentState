import type { Metadata } from 'next';
import './globals.css';
import { QueryProvider } from '@/components/common/query-provider';
import { AuthProvider } from '@/features/auth/auth-provider';

export const metadata: Metadata = {
  title: {
    default: 'CurrentState — Track your state with clarity',
    template: '%s · CurrentState',
  },
  description:
    'A partner-oriented productivity tracker that keeps personal activity history private while sharing the right state with a trusted room partner.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('currentstate-theme');var d;if(t==='light'||t==='dark'){d=t;}else{d=(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches)?'light':'dark';}document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme='dark';}})();`,
          }}
        />
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
