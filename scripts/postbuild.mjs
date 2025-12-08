import { readdirSync, statSync, copyFileSync } from 'fs';
import { join } from 'path';

const buildPath = join(process.cwd(), 'build');
const files = readdirSync(buildPath)
  .filter((f) => f.startsWith('cspark-sdk-') && f.endsWith('.tgz') && f !== 'cspark-sdk-latest.tgz')
  .sort((a, b) => statSync(join(buildPath, b)).mtime - statSync(join(buildPath, a)).mtime);

if (files.length > 0) {
  copyFileSync(join(buildPath, files[0]), join(buildPath, 'cspark-sdk-latest.tgz'));
  console.log(`✓ Created cspark-sdk-latest.tgz from ${files[0]}`);
}
