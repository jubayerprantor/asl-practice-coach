import { describe, expect, it } from 'vitest';
import { ENGINE_READY } from '../src/engine';

describe('Step 1 Scaffold Sanity Check', () => {
  it('loads the pure engine module cleanly', () => {
    expect(ENGINE_READY).toBe(true);
  });
});
