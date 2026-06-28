#!/bin/bash
set -e

# Run the dynamic gradle healer
node scripts/heal-gradle.js

echo "Building Web App..."
npm run build

echo "Syncing Capacitor plugins and assets..."
npx cap sync android

echo "Building Android APK..."
cd android

./gradlew assembleDebug

echo "APK build complete!"
echo "You can find your APK at: android/app/build/outputs/apk/debug/app-debug.apk"
