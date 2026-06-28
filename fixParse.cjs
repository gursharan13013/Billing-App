const fs = require('fs');
const execSync = require('child_process').execSync;

const output = execSync('grep -rn "new Date(e.target.value)" .', {encoding: 'utf8'});
const lines = output.split('\n');
const fileSet = new Set();
lines.forEach(line => {
  if (line.includes(':')) {
    const file = line.split(':')[0];
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fileSet.add(file);
    }
  }
});

fileSet.forEach(f => {
  if (fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/new Date\(e\.target\.value\)/g, "Date.fromLocalDateString(e.target.value)");
    fs.writeFileSync(f, content);
  }
});
