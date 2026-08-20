/**
 * Text-to-Speech service using Web Speech API.
 */

export function speak(text: string, lang: string = "en"): void {
  if ("speechSynthesis" in window) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

export function stop(): void {
  if ("speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}

export function isSupported(): boolean {
  return "speechSynthesis" in window;
}
