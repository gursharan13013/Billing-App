import fs from 'fs';
import path from 'path';

const dir = 'components';
const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const replaced = content.replace(/pt-\[max\(env\(safe-area-inset-top\),32px\)\]/g, 'pt-[max(env(safe-area-inset-top),48px)]');
    if (content !== replaced) {
      fs.writeFileSync(filePath, replaced);
      console.log('Updated ' + filePath);
    }
  }
}
