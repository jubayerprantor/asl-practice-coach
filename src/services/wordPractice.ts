export interface WordPracticeItem {
  id: string;
  word: string;
  category: string;
  hint?: string;
}

/**
 * Standard beginner vocabulary words composed strictly of validated static ASL letters.
 * (Zero dynamic J or Z letters).
 */
export const PRACTICE_WORDS: readonly WordPracticeItem[] = [
  { id: 'cat', word: 'CAT', category: 'Animals', hint: 'A popular feline pet' },
  { id: 'dog', word: 'DOG', category: 'Animals', hint: 'Man’s best friend' },
  { id: 'sun', word: 'SUN', category: 'Nature', hint: 'The star at the center of our solar system' },
  { id: 'cup', word: 'CUP', category: 'Objects', hint: 'Drinking vessel' },
  { id: 'bed', word: 'BED', category: 'Objects', hint: 'Piece of furniture for sleep' },
  { id: 'hat', word: 'HAT', category: 'Clothing', hint: 'Headwear' },
  { id: 'red', word: 'RED', category: 'Colors', hint: 'Primary color of roses' },
  { id: 'man', word: 'MAN', category: 'People', hint: 'Adult human male' },
  { id: 'pig', word: 'PIG', category: 'Animals', hint: 'Farm animal' },
  { id: 'fish', word: 'FISH', category: 'Animals', hint: 'Aquatic creature' },
  { id: 'hand', word: 'HAND', category: 'Body', hint: 'What you use to sign!' },
  { id: 'bird', word: 'BIRD', category: 'Animals', hint: 'Feathered creature' },
] as const;

export interface WordPracticeState {
  wordIndex: number;
  letterIndex: number;
  isWordComplete: boolean;
  completedWordsCount: number;
}

export function createInitialWordState(): WordPracticeState {
  return {
    wordIndex: 0,
    letterIndex: 0,
    isWordComplete: false,
    completedWordsCount: 0,
  };
}

export function advanceWordState(
  state: WordPracticeState,
  words: readonly WordPracticeItem[] = PRACTICE_WORDS
): WordPracticeState {
  const currentWordItem = words[state.wordIndex];
  if (!currentWordItem) return state;

  const currentWord = currentWordItem.word;

  if (state.letterIndex + 1 < currentWord.length) {
    // Advance to next letter in current word
    return {
      ...state,
      letterIndex: state.letterIndex + 1,
      isWordComplete: false,
    };
  }

  // Word complete!
  return {
    ...state,
    isWordComplete: true,
    completedWordsCount: state.completedWordsCount + 1,
  };
}

export function nextWordState(
  state: WordPracticeState,
  words: readonly WordPracticeItem[] = PRACTICE_WORDS
): WordPracticeState {
  const nextWordIdx = (state.wordIndex + 1) % words.length;
  return {
    wordIndex: nextWordIdx,
    letterIndex: 0,
    isWordComplete: false,
    completedWordsCount: state.completedWordsCount,
  };
}
