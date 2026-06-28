const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.git') && !file.includes('android')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('.');

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  let newContent = content;
  newContent = newContent.replace(/new Date\(([a-zA-Z0-9_\.]+)date\)/g, "Date.fromLocalDateString($1date)");
  newContent = newContent.replace(/new Date\(([a-zA-Z0-9_\.]+)\.date\)/g, "Date.fromLocalDateString($1.date)");
  
  if (content !== newContent) {
    fs.writeFileSync(f, newContent);
    console.log("Updated", f);
  }
});
