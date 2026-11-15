import { describe, expect, it } from 'vitest';
import {
  getLanguagePack,
  listAvailableLanguagePacks,
  toSignPackBundle,
} from '../src/packs/packRegistry';

describe('Multi-Language Pack Registry (/src/packs/packRegistry.ts)', () => {
  it('discovers the signer-reviewed ASL pack at runtime without hardcoded imports in UI', () => {
    const packs = listAvailableLanguagePacks();
    expect(packs.length).toBe(1);
    expect(packs[0].id).toBe('asl');
    expect(packs[0].reviewedByFluentSigner).toBe(true);

    const loaded = getLanguagePack('asl');
    expect(loaded.thresholds.language).toBe('asl');
    expect(loaded.feedback.language).toBe('asl');
    expect(loaded.curriculum.language).toBe('asl');

    const bundle = toSignPackBundle(loaded);
    expect(bundle.config.holdTimer.defaultHoldMs).toBeGreaterThan(0);
  });
});
