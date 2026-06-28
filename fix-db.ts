import * as fs from 'fs';
import * as path from 'path';

function run() {
  const sqliteServicePath = path.join(process.cwd(), 'services', 'sqliteService.ts');
  const content = fs.readFileSync(sqliteServicePath, 'utf8');

  // We want to replace SQLocal implementation with Dexie.
  // Wait, I can extract all the method signatures from sqliteService.
  const methodRegex = /([a-zA-Z0-9_]+):\s*async\s*\(([^)]*)\)(?:\s*:\s*Promise<[^>]+>)?\s*=>\s*\{/g;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
      console.log(match[1]);
  }
}
run();
