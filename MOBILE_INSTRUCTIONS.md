# EazyBill Android Build Guide 📱

This guide covers how to successfully run, build, and debug your **EazyBill** app on a real Android device or emulator from your local computer.

---

## 🚀 Quick Start (Local Machine)

When you download your project from Google AI Studio, follow these 3 steps in order to get the latest web code built and synced to Android:

### Step 1: Install Dependencies
Run this in the root folder of the project. We have configured `.npmrc` to handle peer conflicts automatically:
```bash
npm install
```

### Step 2: Build and Sync Web Assets
This compiles your latest UI and copies it cleanly into the native Android application assets:
```bash
npm run build:android
```
*(This is equivalent to running: `npm run build && npx cap sync android`)*

### Step 3: Compile the Android App
There are two ways to compile and run your app:

#### Option A: Using Android Studio (Recommended)
1. Open Android Studio.
2. Select **Open an existing project** and choose the `android` folder of this project directory.
3. Wait for Android Studio to sync the Gradle project.
4. Click **Run** (`▶`) to boot the latest version on your emulator or physical Android phone!

#### Option B: Compling the APK via Terminal
To build a debug APK purely from your terminal:
```bash
# Set execute permissions on gradle wrapper (needed on Mac/Linux)
chmod +x android/gradlew

# Build the debug APK
npm run build:apk
```
Your compiled APK will be located at:
📂 `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🛠️ Troubleshooting Common Errors

### 1. "After downloading, the app is showing the old design"
* **Why**: The compiled web assets folder (`dist/` and `android/app/src/main/assets/public/`) has been git-ignored. This is standard so old build files don't clutter your code.
* **Fix**: Make sure you run `npm run build:android` on your local machine before building the APK or launching in Android Studio.

### 2. `zsh: permission denied: ./gradlew`
* **Why**: The executable bit is lost during zip-downloading on macOS/Linux.
* **Fix**: Grant execution rights by running:
  ```bash
  chmod +x android/gradlew
  ```

### 3. `Error: Invalid or corrupt jarfile ... gradle-wrapper.jar`
* **Why**: This occurs if the helper binary `gradle-wrapper.jar` got corrupted during zip extraction, or line endings were modified as a text file.
* **Fix**: **You don't need compilation scripts or manuals anymore!** We have engineered an intelligent **Auto-Healer** right inside `android/gradlew` and your Node scripts.
  Simply run:
  ```bash
  cd android && ./gradlew assembleDebug
  ```
  The wrapper script will automatically detect the corruption, fetch a clean, official binary clone from Gradle's repository using `curl`, verify its ZIP checksum/signature, instantly heal the file on-the-fly, and proceed to build your APK seamlessly!

---

Happy coding! If you've got questions about custom endpoints, native plugins, or custom app configurations, feel free to ask!
