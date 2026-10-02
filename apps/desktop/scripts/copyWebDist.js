import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceDir = path.resolve(__dirname, '../../web/dist');
const targetDir = path.resolve(__dirname, '../dist');

if (!fs.existsSync(sourceDir)) {
  console.error(`[CodeShelf Build] Source web dist not found at: ${sourceDir}. Building codeshelf-web first is required.`);
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });
console.log(`[CodeShelf Build] Successfully copied web dist to ${targetDir}`);
