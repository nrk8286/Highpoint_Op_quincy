# Release Checklist

## Before Submission

- Create `https://highpoints.work/privacy` or update the metadata to the final privacy-policy URL.
- Create Apple and Google app records for `work.highpoints.app`.
- Decide whether this is public, unlisted, private, or managed distribution.
- Add reviewer/demo credentials in both store consoles.
- Capture screenshots on:
  - Android phone
  - Android tablet if tablet distribution is enabled
  - iPhone 6.7"
  - iPhone 6.5" or 5.5" if requested by App Store Connect
  - iPad if iPad support remains enabled
- Confirm production login flow works without Cloudflare Access blocking the app shell.
- Confirm staff data shown in screenshots is demo/sanitized.

## Android

- Generate upload keystore.
- Add signing config locally or through Android Studio.
- Build release App Bundle: `npm run build:android`.
- Upload `android/app/build/outputs/bundle/release/app-release.aab`.
- Complete Play Console Data Safety using `store/google-play.md`.

## iOS

- Run on macOS with Xcode and CocoaPods.
- Run `npm run sync:ios`.
- Open `ios/App/App.xcworkspace`.
- Set Apple Team.
- Confirm bundle ID `work.highpoints.app`.
- Archive and upload through Xcode Organizer.
- Complete App Privacy using `store/apple-app-store.md`.

