#!/bin/bash

# HighPoint HouseKeep - Firebase Deployment Script
# This script deploys the entire application to Firebase App Hosting

set -e

echo "🚀 HighPoint HouseKeep - Firebase Deployment"
echo "=============================================="
echo ""

# Check Firebase CLI
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check authentication
echo "🔐 Checking Firebase authentication..."
if ! firebase projects:list > /dev/null 2>&1; then
    echo "⚠️  Not authenticated with Firebase"
    echo "Run: firebase login"
    echo "Then run this script again"
    exit 1
fi

echo "✅ Firebase authenticated"
echo ""

# Build the app
echo "🔨 Building Next.js application..."
npm run build
echo "✅ Build complete"
echo ""

# Deploy functions
echo "⚙️  Deploying Cloud Functions..."
firebase deploy --only functions
echo "✅ Functions deployed"
echo ""

# Deploy Firestore rules
echo "🔒 Deploying Firestore security rules..."
firebase deploy --only firestore:rules
echo "✅ Firestore rules deployed"
echo ""

# Deploy hosting
echo "🏠 Deploying to Firebase Hosting..."
firebase deploy --only hosting
echo "✅ Hosting deployed"
echo ""

# Summary
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "📍 Your app is now live at:"
echo "   https://highpoints-work.web.app"
echo ""
echo "Or with custom domain:"
echo "   https://highpoints.work"
echo ""
echo "📊 Monitor your app:"
echo "   Firebase Console: https://console.firebase.google.com"
echo ""
echo "🔗 Next Steps:"
echo "   1. Verify deployment: https://highpoints-work.web.app/login"
echo "   2. Set up custom domain (optional)"
echo "   3. Configure notification emails"
echo "   4. Set up automated scheduling"
echo ""
echo "Happy deploying! 🎉"
