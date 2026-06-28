const { execSync } = require('child_process');
try {
  // Get the commit hash before my changes. Let's just checkout the file from HEAD~1 or similar.
  // Actually, let's just use git log to find the right commit.
  const log = execSync('git log -n 5 --oneline').toString();
  console.log("Git log:\n", log);
  
  // Let's see the diff of the last commit
  const diff = execSync('git diff HEAD~1 components/NearbyShopsScreen.tsx').toString();
  console.log("Diff:\n", diff.substring(0, 1000));
} catch (e) {
  console.error(e.toString());
}
