'use client';

import { ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { isFirebaseConfigured } from './config';

function MissingFirebaseConfig() {
  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl rounded-lg border border-destructive/50 bg-card p-8 text-card-foreground shadow-lg">
        <h1 className="text-2xl font-bold text-destructive">Firebase Not Configured</h1>
        <p className="mt-4 text-muted-foreground">
          Your Firebase environment variables are missing or incomplete. To run the application, you need to configure your Firebase project details.
        </p>
        <p className="mt-4 text-muted-foreground">
          Please create a file named <code>.env.local</code> in the root directory of your project and add the following content, replacing the placeholder values with your actual Firebase project credentials:
        </p>
        <pre className="mt-6 overflow-x-auto rounded-md bg-muted p-4 text-sm font-code">
          <code>
            NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key<br />
            NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain<br />
            NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id<br />
            NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket<br />
            NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id<br />
            NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
          </code>
        </pre>
        <p className="mt-6 text-muted-foreground">
          You can find these values in your Firebase project settings in the Firebase Console. After creating the <code>.env.local</code> file, you must restart your development server for the changes to take effect.
        </p>
      </div>
    </div>
  )
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
    if (!isFirebaseConfigured) {
        return <MissingFirebaseConfig />;
    }
  return <FirebaseProvider>{children}</FirebaseProvider>;
}
