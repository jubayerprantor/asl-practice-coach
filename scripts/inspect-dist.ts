import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { resolve, join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const REQUIRED_FILES = [
  'index.html',
  'mediapipe/hand_landmarker.task',
  'mediapipe/wasm/vision_wasm_internal.wasm',
  'mediapipe/wasm/vision_wasm_internal.js',
  'mediapipe/wasm/vision_wasm_module_internal.wasm',
  'mediapipe/wasm/vision_wasm_module_internal.js',
  'mediapipe/wasm/vision_wasm_nosimd_internal.wasm',
  'mediapipe/wasm/vision_wasm_nosimd_internal.js',
  'fonts/Inter-Regular.woff2',
  'fonts/Inter-Medium.woff2',
  'fonts/Inter-SemiBold.woff2',
  'fonts/Inter-Bold.woff2',
];

const ALLOWLISTED_URL_PREFIXES = [
  'http://www.w3.org/',
  'https://www.w3.org/',
  'https://reactjs.org/',
  'https://github.com/',
  'http://kripken.github.io/',
  'http://unicode.org/',
  'http://en.wikipedia.org/',
  'https://www.ietf.org/',
  'https://tools.ietf.org/',
  'http://pubs.opengroup.org/',
  'https://developer.mozilla.org/',
  'http://server.com', // Emscripten stack frame fallback string
  'https://webkit.org/',
  'https://bugzil.la/',
  'https://www.khronos.org/',
];

const FORBIDDEN_MOCK_STRINGS = [
  'MockLandmarkSource',
  'MOCK DATA',
  'MockControlPanel',
  'DevMockBridge',
];

function walk(dir: string): string[] {
  let files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files = files.concat(walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

export function inspectDist(): boolean {
  console.log('\n[inspect-dist] Starting dist/ bundle verification...');
  const distPath = resolve(__dirname, '../dist');

  if (!existsSync(distPath)) {
    console.error('FAIL: dist/ directory does not exist. Run "vite build" first.');
    return false;
  }

  let allPassed = true;

  // 1. Required Asset Verification
  console.log('\n1. Checking required offline assets in dist/:');
  for (const file of REQUIRED_FILES) {
    const full = resolve(distPath, file);
    if (existsSync(full)) {
      const sizeKB = (statSync(full).size / 1024).toFixed(1);
      console.log(`  ✓ ${file} (${sizeKB} KB)`);
    } else {
      console.error(`  ✗ MISSING: ${file}`);
      allPassed = false;
    }
  }

  // 2. URL Scan & Allowlist Check
  console.log('\n2. Scanning dist/ for external URLs (http:// or https://):');
  const allFiles = walk(distPath);
  const textExtensions = new Set(['.html', '.js', '.css', '.json']);
  const urlRegex = /https?:\/\/[^\s"'`<>]+/g;
  const matchesByUrl = new Map<string, string[]>();

  for (const file of allFiles) {
    if (textExtensions.has(extname(file))) {
      const content = readFileSync(file, 'utf8');
      const matches = content.match(urlRegex) || [];
      for (const url of matches) {
        if (!matchesByUrl.has(url)) {
          matchesByUrl.set(url, []);
        }
        matchesByUrl.get(url)!.push(file.replace(distPath, 'dist'));
      }
    }
  }

  let urlViolations = 0;
  for (const [url, fileList] of matchesByUrl.entries()) {
    const isAllowlisted = ALLOWLISTED_URL_PREFIXES.some((prefix) => url.startsWith(prefix));
    const status = isAllowlisted ? '[ALLOWLISTED]' : '[VIOLATION - NOT ALLOWED]';
    console.log(`  ${status.padEnd(26)} ${url}`);

    if (!isAllowlisted) {
      console.error(`     Found in: ${fileList.join(', ')}`);
      urlViolations++;
      allPassed = false;
    }
  }

  if (urlViolations === 0) {
    console.log(`  ✓ All ${matchesByUrl.size} detected URLs match the authorized offline allowlist.`);
  } else {
    console.error(`  ✗ ${urlViolations} unauthorized external URLs found in production bundle.`);
  }

  // 3. Mock Code Elimination Scan
  console.log('\n3. Scanning bundle for forbidden dev/mock strings:');
  let mockViolations = 0;
  for (const file of allFiles) {
    if (file.endsWith('.js') || file.endsWith('.html')) {
      const content = readFileSync(file, 'utf8');
      for (const mockStr of FORBIDDEN_MOCK_STRINGS) {
        if (content.includes(mockStr)) {
          console.error(`  ✗ FORBIDDEN MOCK STRING "${mockStr}" found in ${file.replace(distPath, 'dist')}`);
          mockViolations++;
          allPassed = false;
        }
      }
    }
  }

  if (mockViolations === 0) {
    console.log('  ✓ Zero mock strings or mock components present in dist/.');
  } else {
    console.error(`  ✗ ${mockViolations} forbidden mock strings found in production bundle.`);
  }

  return allPassed;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const success = inspectDist();
  process.exit(success ? 0 : 1);
}
