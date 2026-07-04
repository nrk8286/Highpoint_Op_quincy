import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'work.highpoints.app',
  appName: 'High Point Ops',
  webDir: 'www',
  server: {
    url: 'https://highpoints.work/next/login',
    cleartext: false,
    allowNavigation: [
      'highpoints.work',
      '*.highpoints.work',
      'identitytoolkit.googleapis.com',
      'firestore.googleapis.com',
      'securetoken.googleapis.com',
      'studio-4409581980-2dc9f.firebaseapp.com',
      '*.firebaseapp.com',
      '*.googleapis.com'
    ]
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0b0a12',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0b0a12',
      overlaysWebView: false
    }
  },
  android: {
    backgroundColor: '#0b0a12'
  },
  ios: {
    scheme: 'HighPointOps',
    contentInset: 'automatic'
  }
};

export default config;
