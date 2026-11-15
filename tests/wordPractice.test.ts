import { describe, expect, it } from 'vitest';
import {
  advanceWordState,
  createInitialWordState,
  nextWordState,
  PRACTICE_WORDS,
} from '../src/services/wordPractice';
import referenceJson from '../src/packs/asl/reference.json';

describe('Word Practice Service', () => {
  it('all vocabulary words contain only validated static signs in the active reference pack', () => {
    const availableSigns = new Set(Object.keys(referenceJson.signs));

    for (const item of PRACTICE_WORDS) {
      expect(item.word.length).toBeGreaterThanOrEqual(3);
      for (const char of item.word) {
        expect(
          availableSigns.has(char),
          `Character '${char}' in word '${item.word}' must exist in reference.json`
        ).toBe(true);
        expect(char).not.toBe('J');
        expect(char).not.toBe('Z');
      }
    }
  });

  it('correctly tracks sequential letter progress through a word', () => {
    let state = createInitialWordState();
    expect(state.wordIndex).toBe(0);
    expect(state.letterIndex).toBe(0);
    expect(state.isWordComplete).toBe(false);

    // CAT has 3 letters: C (idx 0), A (idx 1), T (idx 2)
    state = advanceWordState(state);
    expect(state.letterIndex).toBe(1);
    expect(state.isWordComplete).toBe(false);

    state = advanceWordState(state);
    expect(state.letterIndex).toBe(2);
    expect(state.isWordComplete).toBe(false);

    state = advanceWordState(state);
    expect(state.isWordComplete).toBe(true);
    expect(state.completedWordsCount).toBe(1);

    // Advance to next word (DOG)
    state = nextWordState(state);
    expect(state.wordIndex).toBe(1);
    expect(state.letterIndex).toBe(0);
    expect(state.isWordComplete).toBe(false);
  });
});
