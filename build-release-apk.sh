#!/bin/bash
set -e

# Run the dynamic gradle healer
node scripts/heal-gradle.js

echo "Building Web App..."
npm run build

echo "Syncing Capacitor plugins and assets..."
npx cap sync android

echo "Building Android Release APK..."
cd android

./gradlew assembleRelease

echo "APK build complete!"
echo "Note: Release APKs usually need to be signed before they can be installed on a device."
echo "You can find your APK at: android/app/build/outputs/apk/release/app-release-unsigned.apk"
