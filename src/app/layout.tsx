import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { FirebaseClientProvider } from '@/firebase';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';
import { ServiceWorkerRegistration } from '@/components/service-worker-registration';

export const metadata: Metadata = {
  title: 'HighPoint HouseKeep | Facility Management Software',
  description: 'All-in-one solution to streamline housekeeping, maintenance, and compliance for modern facilities. Offline-first inspections, real-time compliance scoring, photo evidence, and audit-ready reporting.',
  keywords: ['facility management', 'housekeeping software', 'maintenance management', 'compliance reporting', 'inspections', 'offline-first'],
  metadataBase: new URL('https://highpoints.work'),
  openGraph: {
    title: 'HighPoint HouseKeep | Facility Management',
    description: 'Complete facility management platform with offline inspections',
    url: 'https://highpoints.work',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#1a1a2e" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="font-body antialiased">
        <FirebaseClientProvider>
          <ServiceWorkerRegistration />
          {children}
          <Toaster />
          <FirebaseErrorListener />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
