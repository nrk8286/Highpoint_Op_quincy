# Store Submission Pack

This folder contains draft metadata and review notes for submitting High Point Ops to Google Play and Apple App Store.

## Required Account Items

- Apple Developer Program account.
- App Store Connect app record for bundle ID `work.highpoints.app`.
- Google Play Console app record for package `work.highpoints.app`.
- Production signing credentials:
  - Android upload keystore.
  - Apple signing certificate and provisioning profile.
- Public privacy policy URL. Recommended: `https://highpoints.work/privacy`.

## Review Positioning

High Point Ops should be submitted as a private/authenticated operations tool for facility staff, not as a public marketing website. The app requires staff credentials and provides role-based operational workflows for maintenance, housekeeping, nursing, culinary, activities, compliance, inventory, reporting, and scheduling.

## Native Shell

The native apps load the production operations hub at:

`https://highpoints.work/app`

The packaged `www/index.html` is only a local fallback shell.

