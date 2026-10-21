/**
 * Regenerates data/storyData.js from data/storyData.json.
 * The JSON file is the single source of truth; the JS mirror lets the
 * app run by simply opening index.html without a local server.
 *
 * Usage: node tools/embed-data.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(process.cwd());
const jsonPath = path.join(root, 'data', 'storyData.json');
const jsPath = path.join(root, 'data', 'storyData.js');

const raw = await readFile(jsonPath, 'utf8');
const data = JSON.parse(raw);
const output = [
  '/* AUTO-GENERATED FILE — do not edit directly.',
  '   Edit data/storyData.json then run: node tools/embed-data.mjs */',
  'window.DALUM_AWIT_DATA = ' + JSON.stringify(data, null, 2) + ';',
  ''
].join('\n');

await writeFile(jsPath, output, 'utf8');
console.log('Wrote ' + path.relative(root, jsPath) + ' (' + Math.round(output.length / 1024) + ' KB)');
