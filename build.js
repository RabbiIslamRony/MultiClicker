// ================================================================
//  MULTICLICKER EXTENSION — BUILD SCRIPT
//  Packages the extension into a .zip ready for:
//    - Chrome Web Store upload
//    - Manual "Load unpacked" sharing
//
//  Run from project root:
//    node build.js
//  Or:
//    npm run build
// ================================================================

const fs   = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

// ── Paths ─────────────────────────────────────────────────────────
const EXT_DIR  = __dirname;                          // project root (all extension files here)
const DIST_DIR = path.join(__dirname, 'dist');       // dist/
const ZIP_PATH = path.join(__dirname, 'multiclicker-extension.zip');

// ── Files included in the build (relative to extension/) ─────────
const BUILD_FILES = [
  'manifest.json',
  'background.js',
  'default-config.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'settings.html',
  'settings.css',
  'settings.js',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
];

// ── Terminal helpers ──────────────────────────────────────────────
const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
};
const ok   = msg => console.log(`  ${c.green}✔${c.reset}  ${msg}`);
const fail = msg => { console.log(`  ${c.red}✘${c.reset}  ${msg}`); process.exit(1); };
const info = msg => console.log(`  ${c.cyan}→${c.reset}  ${msg}`);
const warn = msg => console.log(`  ${c.yellow}!${c.reset}  ${msg}`);
const hr   = ()  => console.log(c.grey + '─'.repeat(56) + c.reset);

// ── Step 1: Check icons exist, generate if missing ────────────────
function ensureIcons() {
  const missing = ['icon16.png', 'icon48.png', 'icon128.png']
    .filter(f => !fs.existsSync(path.join(EXT_DIR, 'icons', f)));

  if (missing.length === 0) {
    ok('Icons found.');
    return;
  }

  warn(`Icons missing (${missing.join(', ')}) — generating…`);
  const result = spawnSync('node', [path.join(EXT_DIR, 'icons', 'generate-icons.js')], {
    stdio: 'inherit',
    cwd: EXT_DIR,
  });
  if (result.status !== 0) fail('Icon generation failed. Check generate-icons.js.');
  ok('Icons generated.');
}

// ── Step 2: Validate all required files exist ────────────────────
function validateFiles() {
  const missing = BUILD_FILES.filter(f => !fs.existsSync(path.join(EXT_DIR, f)));
  if (missing.length > 0) {
    fail(`Missing required files:\n${missing.map(f => `       • extension/${f}`).join('\n')}`);
  }
  ok(`All ${BUILD_FILES.length} files present.`);
}

// ── Step 3: Copy files into dist/ ────────────────────────────────
function copyToDist() {
  // Clean dist/
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(DIST_DIR, 'icons'), { recursive: true });

  for (const file of BUILD_FILES) {
    const src  = path.join(EXT_DIR, file);
    const dest = path.join(DIST_DIR, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
  ok(`Copied to ${c.grey}dist/${c.reset}`);
}

// ── Step 4: Zip dist/ → multiclicker-extension.zip ───────────────
function createZip() {
  if (fs.existsSync(ZIP_PATH)) fs.unlinkSync(ZIP_PATH);

  // Use PowerShell on Windows, zip on macOS/Linux
  if (process.platform === 'win32') {
    const ps = `Compress-Archive -Path "${DIST_DIR}\\*" -DestinationPath "${ZIP_PATH}" -Force`;
    const result = spawnSync('powershell', ['-NoProfile', '-Command', ps], { stdio: 'inherit' });
    if (result.status !== 0) fail('PowerShell Compress-Archive failed.');
  } else {
    const result = spawnSync('zip', ['-r', ZIP_PATH, '.'], { cwd: DIST_DIR, stdio: 'inherit' });
    if (result.status !== 0) fail('zip command failed. Make sure zip is installed.');
  }

  const sizeKB = (fs.statSync(ZIP_PATH).size / 1024).toFixed(1);
  ok(`${c.bold}multiclicker-extension.zip${c.reset} created  ${c.grey}(${sizeKB} KB)${c.reset}`);
}

// ── Main ──────────────────────────────────────────────────────────
console.log();
console.log(`${c.bold}  MultiClicker — Extension Build${c.reset}`);
hr();

info('Checking icons…');
ensureIcons();

info('Validating files…');
validateFiles();

info('Copying to dist/…');
copyToDist();

info('Creating zip…');
createZip();

console.log();
hr();
console.log(`\n  ${c.bold}${c.green}Build complete!${c.reset}\n`);
console.log(`  ${c.bold}multiclicker-extension.zip${c.reset}`);
console.log(`  ${c.grey}Located at: ${ZIP_PATH}${c.reset}\n`);
console.log('  To install manually:');
console.log(`  ${c.cyan}1.${c.reset} Extract the zip`);
console.log(`  ${c.cyan}2.${c.reset} Open chrome://extensions → Enable Developer mode`);
console.log(`  ${c.cyan}3.${c.reset} Click "Load unpacked" → select the extracted folder\n`);
console.log('  To publish on Chrome Web Store:');
console.log(`  ${c.cyan}→${c.reset}  Upload the .zip directly at developer.chrome.com/webstore\n`);
