import fs from 'fs';
import path from 'path';

const dir = 'components';
const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('<header') && !line.includes('safe-area-inset')) {
         console.log(file + ':' + (index + 1) + ' ' + line.trim());
      }
    });
  }
}
