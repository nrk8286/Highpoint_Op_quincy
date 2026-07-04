# High Point Ops Mobile

Native store packaging for the HighPoints operations app.

## App Identity

- App name: `High Point Ops`
- Bundle/package ID: `work.highpoints.app`
- Version: `1.0.0`
- Production app URL: `https://highpoints.work/app`

## Build Targets

- Android: Capacitor Android project, ready for Android Studio / Google Play App Bundle generation.
- iOS: Capacitor iOS project, ready for Xcode archive on macOS.

## Commands

```bash
npm install
npm run sync
npm run build:android
npm run build:android:apk
```

## Android Production Pretrial

Use the signed release APK for direct pretrial installs and the signed AAB for
Google Play internal testing.

```bash
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 npm run sync:android
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 npm run build:android:apk
JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64 npm run build:android
```

Artifacts:

- Direct install APK: `android/app/build/outputs/apk/release/app-release.apk`
- Play Console bundle: `android/app/build/outputs/bundle/release/app-release.aab`

iOS archive requires macOS with Xcode:

```bash
npm run sync:ios
npm run open:ios
```

## Store Readiness Notes

This package wraps the live HighPoints web app in native Android/iOS shells and includes install icons, splash resources, bundle IDs, and store metadata drafts. Apple review can reject apps that are only a website in a WebView, so keep the app positioned as an authenticated operations tool for facility staff and add native integrations over time where useful.
