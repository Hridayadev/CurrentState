import type { Metadata, Viewport } from 'next';
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
  applicationName: 'CurrentState',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CurrentState',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#04080f' },
    { media: '(prefers-color-scheme: light)', color: '#f4f7fb' },
  ],
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
        <script
          dangerouslySetInnerHTML={{
            __html:
              process.env.NODE_ENV === 'production'
                ? `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});}`
                : '',
          }}
        />
        <QueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
