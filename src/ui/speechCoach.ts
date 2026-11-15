/**
 * Optional, accessible Web Speech API wrapper.
 * - Off by default (controlled by caller).
 * - Debounced so identical hints do not repeat within `cooldownMs`.
 */
export class DebouncedSpeechCoach {
  private lastSpokenText = '';
  private lastSpokenAtMs = 0;

  constructor(private readonly cooldownMs = 4000) {}

  isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      typeof SpeechSynthesisUtterance !== 'undefined'
    );
  }

  speak(text: string, enabled: boolean, nowMs = Date.now()): void {
    if (!enabled || !text.trim() || !this.isSupported()) {
      return;
    }

    const isSameMessage = text === this.lastSpokenText;
    if (isSameMessage && nowMs - this.lastSpokenAtMs < this.cooldownMs) {
      return;
    }

    // Avoid interrupting an utterance mid-sentence unless the message changed
    if (window.speechSynthesis.speaking && isSameMessage) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    this.lastSpokenText = text;
    this.lastSpokenAtMs = nowMs;
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }

  reset(): void {
    this.lastSpokenText = '';
    this.lastSpokenAtMs = 0;
    this.stop();
  }
}
