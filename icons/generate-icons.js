// ================================================================
//  CACHE CLEARER — ICON GENERATOR
//  Generates icon16.png, icon48.png, icon128.png using puppeteer.
//  Run: node extension/icons/generate-icons.js
//       (from the project root, d:\Cache Clear file\)
// ================================================================

const path = require('path');
const fs   = require('fs');

// Try to load puppeteer from the parent project or globally
let puppeteer;
try {
  puppeteer = require(path.join(__dirname, '..', '..', 'node_modules', 'puppeteer'));
} catch {
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('puppeteer not found. Run "npm install" in the project root first.');
    process.exit(1);
  }
}

const SIZES   = [16, 48, 128];
const OUT_DIR = __dirname; // extension/icons/

// ── Build the HTML template for a given icon size ─────────────────
function buildIconHTML(size) {
  const fontSize = Math.round(size * 0.62);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html, body {
    width: ${size}px;
    height: ${size}px;
    overflow: hidden;
    background: #4f46e5;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  span {
    font-size: ${fontSize}px;
    line-height: 1;
    /* Make the emoji look crisp at small sizes */
    -webkit-font-smoothing: antialiased;
  }
</style>
</head>
<body>
  <span>&#9889;</span>
</body>
</html>`;
}

(async () => {
  // Find real Chrome since puppeteer's bundled Chromium may not be downloaded
  const chromeCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `C:\\Users\\${process.env.USERNAME}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  const { existsSync } = require('fs');
  const executablePath = chromeCandidates.find(p => existsSync(p));
  if (!executablePath) throw new Error('Chrome not found. Install Chrome or set executablePath manually.');

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const size of SIZES) {
    const page = await browser.newPage();
    await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 });

    const html = buildIconHTML(size);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outPath = path.join(OUT_DIR, `icon${size}.png`);
    await page.screenshot({ path: outPath, type: 'png', omitBackground: false });
    await page.close();

    console.log(`  Generated: ${outPath}`);
  }

  await browser.close();
  console.log('\n  Icons generated successfully.');
})().catch(err => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
