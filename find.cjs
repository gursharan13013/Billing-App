const fs = require('fs');
const path = require('path');

function findFiles(dir, filename) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      file = path.resolve(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) {
        results = results.concat(findFiles(file, filename));
      } else if (file.endsWith(filename)) {
        results.push(file);
      }
    });
  } catch (e) {}
  return results;
}

console.log(findFiles('/.gemini', 'overview.txt'));
