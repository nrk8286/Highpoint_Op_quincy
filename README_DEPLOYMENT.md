# 🚀 Deploy HighPoint HouseKeep to Firebase App Hosting

## 5-Minute Quick Start

### Step 1: Get Firebase Credentials
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select project: `studio-4409581980-2dc9f`
3. Click ⚙️ **Settings** → **Project Settings**
4. Find **Your apps** section
5. Copy your Firebase config

### Step 2: Create `.env.local` File
Copy `.env.example` to `.env.local` and fill in your Firebase config:
```bash
cp .env.example .env.local
# Edit .env.local and paste your Firebase credentials
```

### Step 3: Deploy
```bash
# One-time: Authenticate with Firebase
firebase login

# Then deploy
./deploy.sh
```

**That's it!** Your app is now live. 🎉

---

## What You Get

### ✅ Full-Featured Application
- ✓ Login & authentication
- ✓ Real-time notifications
- ✓ Compliance dashboards
- ✓ Advanced reporting
- ✓ Offline support
- ✓ Photo evidence tracking
- ✓ Automated scheduling
- ✓ Audit trails

### ✅ Backend Services (Cloud Functions)
- User management
- Notifications & alerts
- Compliance scoring
- Report generation
- Automated scheduling
- Deficiency tracking

### ✅ Database (Firestore)
- User profiles
- Inspections
- Deficiencies
- Notifications
- Audit logs

### ✅ Hosting
- Firebase App Hosting (powered by Cloud Run)
- Global CDN
- SSL/TLS certificates
- Custom domain support

---

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         highpoints.work                 │
│   (Firebase Hosting + App Hosting)      │
└──────────────────┬──────────────────────┘
                   │
        ┌──────────┼──────────┐
        │          │          │
    ┌───▼─┐   ┌───▼─┐   ┌───▼─┐
    │Next.│   │Cloud│   │Fire│
    │ JS  │   │Func.│   │base│
    │(UI) │   │Back.│   │Data│
    └─────┘   └─────┘   └─────┘
```

---

## Features by Component

### Frontend (Next.js)
- Dashboard pages
- Inspection forms
- Photo capture
- Reports
- Notifications UI
- Offline mode

### Backend (Cloud Functions)
- Compliance scoring
- Automated alerts
- Report generation
- Scheduled tasks
- User role management

### Database (Firestore)
- Real-time sync
- Security rules
- Audit logging
- Data backup

---

## After Deployment

### 1. Test Your App
```bash
# Login page
https://highpoints-work.web.app/login

# Try demo account
Email: admin@example.com
Password: (set during first login)
```

### 2. Create Admin Account
1. Sign up at `/login`
2. Use Firebase Console to set role to "Admin"

### 3. Test Features
- Create an inspection
- Add deficiencies
- Generate a report
- Test offline mode

### 4. Monitor Performance
Firebase Console → Performance → Real-time dashboard

---

## Custom Domain Setup (Optional)

To use `highpoints.work` instead of `highpoints-work.web.app`:

1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Enter domain: `highpoints.work`
4. Update DNS records (Firebase will provide)
5. Wait for SSL certificate (usually 24 hours)

---

## Troubleshooting

### "Cannot find module" Errors
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### "Authentication required"
```bash
firebase logout
firebase login
```

### Routes returning 404
1. Check Cloud Functions are deployed: `firebase functions:list`
2. Check logs: `firebase functions:log`
3. Verify `Dockerfile` is in root directory

### Offline features not working
1. Check Service Worker: DevTools → Application → Service Workers
2. Verify `.well-known/assetlinks.json` exists
3. Check browser console for errors

---

## Performance & Scaling

### Built-in Auto-Scaling
- Cloud Functions: Auto-scales from 0 to unlimited
- Firestore: Auto-scales with demand
- Cloud Storage: Unlimited

### Estimated Costs (Free Tier Included)
- Cloud Functions: 2M invocations/month free
- Firestore: 1GB storage, 50k reads/day free
- Cloud Hosting: 5GB/month bandwidth free

See [Firebase Pricing](https://firebase.google.com/pricing) for details.

---

## Next Steps

- [ ] Set up environment variables in `.env.local`
- [ ] Run `firebase login`
- [ ] Run `./deploy.sh`
- [ ] Test app at `https://highpoints-work.web.app/login`
- [ ] Configure notifications (optional)
- [ ] Set up custom domain (optional)
- [ ] Create admin accounts
- [ ] Start using the app! 🚀

---

## Additional Resources

- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Firebase Console](https://console.firebase.google.com)

---

**Ready? Run `./deploy.sh` to go live! 🚀**
