import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Production Bundle Mock Code Elimination', () => {
  it('confirms dist/ contains zero mock code or MOCK DATA strings', () => {
    const distAssetsPath = resolve(__dirname, '../dist/assets');
    if (!existsSync(distAssetsPath)) {
      // If dist has not been generated yet, skip or pass until build runs
      return;
    }

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
