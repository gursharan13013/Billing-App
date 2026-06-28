import fs from 'fs';
import path from 'path';
import https from 'https';

const jarPath = path.join('android', 'gradle', 'wrapper', 'gradle-wrapper.jar');
const gradlewPath = path.join('android', 'gradlew');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: status code ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function heal() {
  console.log("\n=========================================================");
  console.log("🛠️  EazyBill - Gradle Wrapper Integrity Self-Healer 🛠️");
  console.log("=========================================================\n");
  
  // Make gradlew executable
  if (fs.existsSync(gradlewPath)) {
    try {
      fs.chmodSync(gradlewPath, 0o755);
      console.log("✅ Fixed executable permissions for android/gradlew");
    } catch (e) {
      console.warn("⚠️ Unable to set chmod on gradlew (this is normal on Windows):", e.message);
    }
  }

  let needsDownload = process.argv.includes('--force');
  
  if (!fs.existsSync(jarPath)) {
    console.log("❌ gradle-wrapper.jar is missing.");
    needsDownload = true;
  } else if (needsDownload) {
    console.log("🔄 Force-heal requested. Intentionally re-downloading clean gradle-wrapper.jar...");
  } else {
    try {
      // 1. Check if valid ZIP magic bytes: 50 4b 03 04
      const fd = fs.openSync(jarPath, 'r');
      const buffer = Buffer.alloc(4);
      fs.readSync(fd, buffer, 0, 4, 0);
      fs.closeSync(fd);
      
      const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
      if (!isZip) {
        console.log("⚠️ gradle-wrapper.jar is corrupted (invalid ZIP signature).");
        needsDownload = true;
      } else {
        // 2. Check for CRLF corruption ratio in the binary
        const content = fs.readFileSync(jarPath);
        let lfCount = 0;
        let crlfCount = 0;
        for (let i = 0; i < content.length; i++) {
          if (content[i] === 0x0A) {
            lfCount++;
            if (i > 0 && content[i - 1] === 0x0D) {
              crlfCount++;
            }
          }
        }
        const crlfRatio = lfCount > 0 ? (crlfCount / lfCount) : 0;
        
        // In clean binaries, LF is random so CRLF ratio is extremely low (around 0.4%).
        // A conversion tool corrupts the file making nearly 100% of LFs preceded by CR.
        if (crlfRatio > 0.5) {
          console.log(`⚠️ gradle-wrapper.jar is corrupted due to CRLF line ending translation (CRLF ratio: ${(crlfRatio * 100).toFixed(1)}%).`);
          needsDownload = true;
        } else {
          console.log("✅ gradle-wrapper.jar signature and binary integrity verified.");
        }
      }
    } catch (e) {
      console.log("⚠️ Error inspecting gradle-wrapper.jar:", e.message);
      needsDownload = true;
    }
  }

  if (needsDownload) {
    const dir = path.dirname(jarPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Attempt download
    const urls = [
      'https://raw.githubusercontent.com/gradle/gradle/v8.14.3/gradle/wrapper/gradle-wrapper.jar',
      'https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar',
      'https://raw.githubusercontent.com/gradle/gradle/master/gradle/wrapper/gradle-wrapper.jar'
    ];
    
    let success = false;
    for (const url of urls) {
      try {
        console.log(`📡 Downloading clean gradle-wrapper.jar from official Gradle repo...`);
        await downloadFile(url, jarPath);
        
        // Quick verification of downloaded file
        const fd = fs.openSync(jarPath, 'r');
        const buffer = Buffer.alloc(4);
        fs.readSync(fd, buffer, 0, 4, 0);
        fs.closeSync(fd);
        if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
          console.log("🎉 Successfully downloaded and verified clean gradle-wrapper.jar!");
          success = true;
          break;
        } else {
          console.warn("⚠️ Downloaded file signature was invalid. Trying next source...");
        }
      } catch (e) {
        console.warn(`⚠️ Failed to download from official source: ${e.message}. Trying next source...`);
      }
    }
    
    if (!success) {
      console.error("\n❌ [ERROR] Could not automatically download gradle-wrapper.jar.");
      console.error("Please download it manually from: https://github.com/gradle/gradle/raw/master/gradle/wrapper/gradle-wrapper.jar");
      console.error("And place it in: android/gradle/wrapper/gradle-wrapper.jar\n");
      process.exit(1);
    }
  }
  
  console.log("✨ Gradle alignment check finished. Ready to build!\n");
}

heal();
