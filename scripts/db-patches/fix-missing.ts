import fs from 'fs';
import path from 'path';

const dir = 'components';
const files = fs.readdirSync(dir);
for (const file of files) {
  if (file.endsWith('.tsx')) {
    const filePath = path.join(dir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Simple regex to add the pt- class inside className="..." of <header
    const regex = /(<header[^>]*className=["'])([^"']*?)(["'][^>]*>)/g;
    
    content = content.replace(regex, (match, prefix, classNames, suffix) => {
        if (!classNames.includes('safe-area-inset-top')) {
            modified = true;
            return prefix + classNames + ' pt-[max(env(safe-area-inset-top),48px)]' + suffix;
        }
        return match;
    });
    
    if (modified) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed ' + filePath);
    }
  }
}
