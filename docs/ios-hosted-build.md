# iOS Hosted Build

This workspace cannot install Xcode on Kali/Linux. The iOS build must run on
macOS. The GitHub Actions workflow in `.github/workflows/ios-build.yml` uses
GitHub-hosted macOS runners for that.

## Unsigned Simulator Build

Push this workspace to GitHub, then run the `iOS hosted build` workflow. The
default `simulator-build` job runs:

```bash
npm ci
npm run sync:ios
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO clean build
```

This proves Xcode can compile the iOS project without needing Apple signing.

## Signed App Store Archive

To enable the signed archive job, set repository variable:

```text
IOS_SIGNED_ARCHIVE=true
```

Add these repository secrets:

```text
IOS_DISTRIBUTION_CERT_P12_BASE64
IOS_DISTRIBUTION_CERT_PASSWORD
IOS_PROVISIONING_PROFILE_BASE64
IOS_BUILD_KEYCHAIN_PASSWORD
IOS_EXPORT_OPTIONS_PLIST_BASE64
```

The provisioning profile must be for bundle ID `work.highpoints.app`. The export
options plist should match the intended distribution method, usually `app-store`.

Example export options:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>stripSwiftSymbols</key>
  <true/>
  <key>uploadBitcode</key>
  <false/>
</dict>
</plist>
```
