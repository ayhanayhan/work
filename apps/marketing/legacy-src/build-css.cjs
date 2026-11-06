/**
 * Ticarti v2 CSS build. Generates the single production stylesheet from
 * ordered, editable, semantic source sections. Node + postcss required.
 * Usage: npm run build:css
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const input = path.join(root, 'src/styles');
const manifest = JSON.parse(fs.readFileSync(path.join(input, 'manifest.json'), 'utf8'));
let output = '';
for (const name of manifest.files) {
  const filename = path.join(input, name);
  if (!fs.existsSync(filename)) throw Error(`Missing CSS module: ${name}`);
  output += fs.readFileSync(filename, 'utf8').trimEnd() + '\n\n';
}
fs.writeFileSync(path.join(root, 'assets/css/style.css'), output);
try {
  require('postcss').parse(output);
} catch (error) {
  throw Error(`CSS invalid: ${error.message}`);
}
console.log(`Built ${manifest.files.length} CSS sources, ${Buffer.byteLength(output)} bytes`);
