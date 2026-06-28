#!/bin/bash
set -e

echo "Building Web App..."
npm run build

echo "Syncing Capacitor plugins and assets..."
npx cap sync android

echo "Building Android APK..."
cd android
./gradlew assembleDebug

echo "APK build complete!"
echo "You can find your APK at: android/app/build/outputs/apk/debug/app-debug.apk"
