import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process';

function getLatestMtime(dir: string): number {
  let latest = 0;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      latest = Math.max(latest, getLatestMtime(full));
    } else {
      latest = Math.max(latest, stat.mtimeMs);
    }
  }
  return latest;
}

describe('Production Bundle Mock Code Elimination', () => {
  it('confirms dist/ contains zero mock code or MOCK DATA strings', () => {
    const distAssetsPath = resolve(__dirname, '../dist/assets');
    const srcPath = resolve(__dirname, '../src');

    // If dist is absent or older than src, build it first so scan is always valid
    if (!existsSync(distAssetsPath) || getLatestMtime(srcPath) > getLatestMtime(distAssetsPath)) {
      execSync('npx vite build --mode production', {
        stdio: 'pipe',
        env: { ...process.env, NODE_ENV: 'production' },
      });
    }

    expect(existsSync(distAssetsPath)).toBe(true);

    const files = readdirSync(distAssetsPath).filter((f) => f.endsWith('.js'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const fullPath = resolve(distAssetsPath, file);
      const content = readFileSync(fullPath, 'utf8');

      // Rule 3: Mock code must never ship in dist/
      expect(content).not.toContain('MockLandmarkSource');
      expect(content).not.toContain('MOCK DATA');
    }
  });
});
