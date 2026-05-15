import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'work.highpoints.app',
  appName: 'High Point Ops',
  webDir: 'www',
  server: {
    url: 'https://highpoints.work/app',
    cleartext: false
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
