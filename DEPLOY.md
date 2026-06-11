# 🚀 HighPoint HouseKeep - Firebase App Hosting Deployment Guide

## Quick Start

### Step 1: Authenticate with Firebase (One-time setup)
```bash
firebase login
```
This will open a browser window. Sign in with your Google account that has access to the Firebase project.

### Step 2: Deploy Everything
```bash
# Deploy Cloud Functions
firebase deploy --only functions

# Deploy Firestore Rules
firebase deploy --only firestore:rules

# Deploy to Firebase App Hosting
firebase deploy --only hosting
```

Or deploy everything at once:
```bash
firebase deploy
```

---

## What Gets Deployed

### 🔧 Cloud Functions (Backend)
- User authentication & role management
- Real-time notifications & alerts
- Automated compliance scoring
- Report generation
- Scheduled inspection triggers
- Deficiency tracking & audit logs

**Location:** `functions/src/index.ts`

### 🏠 Hosting (Frontend)
- Next.js application
- All dashboard pages
- Login page
- Responsive UI

**Location:** `.next/standalone/*`

### 📊 Firestore Database
- User profiles
- Inspections & deficiencies
- Notifications
- Audit logs
- Compliance scores

**Rules:** `firestore.rules`

### 🔐 Security Rules
- Firestore access control
- User authorization

**Location:** `firestore.rules`

---

## Environment Setup

### Required Environment Variables
Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=studio-4409581980-2dc9f.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=studio-4409581980-2dc9f
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=studio-4409581980-2dc9f.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

Get these values from:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: `studio-4409581980-2dc9f`
3. Click ⚙️ Settings → Project Settings
4. Copy the config values

---

## Features Deployed

✅ **Real-time Notifications**
- User notifications center
- Critical alerts system
- Email notifications

✅ **Compliance Metrics**
- Compliance scoring dashboard
- Score trending
- Deficiency tracking

✅ **Advanced Reporting**
- PDF report generation
- Custom date ranges
- Email delivery

✅ **Offline Support**
- Service Worker caching
- Offline inspections
- Auto-sync on reconnect

✅ **Cloud Functions**
- Automated scheduling
- Compliance calculations
- User management

---

## Deployment Checklist

- [ ] Firebase CLI installed: `firebase --version`
- [ ] Authenticated: `firebase login`
- [ ] Environment variables set in `.env.local`
- [ ] Built locally: `npm run build`
- [ ] No errors in build output

---

## Post-Deployment

### 1. Verify Deployment
```bash
firebase hosting:channel:list
firebase functions:list
```

### 2. Test the App
Visit: https://highpoints-work.web.app (or your custom domain)

### 3. Verify Routes
- Home: https://highpoints-work.web.app/
- Login: https://highpoints-work.web.app/login
- Dashboard: https://highpoints-work.web.app/dashboard

### 4. Check Cloud Functions
1. Go to Firebase Console → Functions
2. Verify all functions are deployed
3. Check logs for any errors

### 5. Monitor Real-time Database
Firebase Console → Firestore Database → Check data coming in

---

## Troubleshooting

### Error: "Cannot find module 'firebase-functions'"
**Solution:** Run `cd functions && npm install && cd ..`

### Error: "Deployment failed"
**Solution:** Check Firebase credentials and project ID in `.firebaserc`

### Routes returning 404
**Solution:** Ensure Cloud Functions are deployed and properly configured

### Service Worker not caching
**Solution:** Check browser DevTools → Application → Service Workers

---

## Custom Domain Setup

To use `highpoints.work` instead of `highpoints-work.web.app`:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter: `highpoints.work`
4. Follow DNS setup instructions
5. Wait for SSL certificate (usually 24 hours)

---

## Monitoring & Logs

### View Logs
```bash
firebase functions:log
```

### Monitor Performance
Firebase Console → Performance → Real-time monitoring

### Check Error Logs
Firebase Console → Functions → Logs

---

## Rollback (if needed)
```bash
firebase hosting:releases:list
firebase hosting:rollback <release-id>
```

---

## Support
For issues, check:
1. Firebase Console Error Messages
2. Cloud Functions Logs
3. Browser Console (DevTools)
4. Service Worker Status (DevTools → Application)

---

**Deployment Completed! 🎉**

Your HighPoint HouseKeep app is now live with all advanced features:
- Real-time notifications
- Compliance metrics dashboard
- Advanced reporting
- Offline support
- Cloud Functions backend
- Automated scheduling
