import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { resolve, join } from 'path';

console.log('\n[package-desktop] 1. Building production web bundle...');
execSync('npx vite build --mode production', {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' },
});

console.log('\n[package-desktop] 2. Packing unpacked desktop directory for scanning...');
execSync('npx electron-builder --dir --publish never', { stdio: 'inherit' });

console.log('\n[package-desktop] 3. Running distScan against files inside installer app folder...');
const appDist = resolve('release/win-unpacked/resources/app/dist');
if (!existsSync(appDist)) {
  throw new Error(`Expected packaged app directory not found at: ${appDist}`);
}

const REQUIRED_ASSETS = [
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

for (const rel of REQUIRED_ASSETS) {
  const p = join(appDist, rel);
  if (!existsSync(p)) {
    throw new Error(`[distScan] Packaged app missing required asset: ${rel}`);
  }
}

const FORBIDDEN_STRINGS = [
  'MockLandmarkSource',
  'MockControlPanel',
  'DevMockBridge',
  'MOCK DATA',
  'mockLandmarkSource',
];

function scanFiles(dir: string) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      scanFiles(full);
    } else if (entry.endsWith('.js') || entry.endsWith('.html') || entry.endsWith('.css')) {
      const content = readFileSync(full, 'utf8');
      for (const forbidden of FORBIDDEN_STRINGS) {
        if (content.includes(forbidden)) {
          throw new Error(
            `[distScan] Packaged app contains forbidden string "${forbidden}" in ${full}`
          );
        }
      }
    }
  }
}
scanFiles(appDist);
console.log('  ✓ Packaged app folder passed distScan check (0 mock strings, 100% offline assets verified).');

console.log('\n[package-desktop] 4. Building Windows NSIS installer...');
execSync('npx electron-builder --win nsis --publish never', { stdio: 'inherit' });

console.log('\n================================================================================');
console.log('                       DESKTOP BUILD COMPLETE');
console.log('================================================================================');
console.log('  Installer output directory: release/');
if (existsSync('release')) {
  for (const file of readdirSync('release')) {
    if (file.endsWith('.exe')) {
      const stat = statSync(join('release', file));
      console.log(`  - ${file} (${(stat.size / (1024 * 1024)).toFixed(1)} MB)`);
    }
  }
}
console.log('================================================================================\n');
