import type { MutableRefObject } from 'react';

export type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: unknown) => void) | null;
};

export function getSpeechRecognitionConstructor():
  | (new () => BrowserSpeechRecognition)
  | null {
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function stopSpeechRecognition(
  recognitionRef: MutableRefObject<BrowserSpeechRecognition | null>,
): void {
  const instance = recognitionRef.current;
  if (!instance) return;
  try {
    instance.onend = null;
    instance.onresult = null;
    instance.onerror = null;
    instance.stop();
  } catch {
    // Browser may throw if already stopped.
  }
  recognitionRef.current = null;
}

export async function probeMicrophonePermission(): Promise<boolean> {
  if (!navigator.mediaDevices?.getUserMedia) return false;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

function mergeDictationText(base: string, spoken: string): string {
  const trimmedSpoken = spoken.trim();
  if (!trimmedSpoken) return base;
  const trimmedBase = base.trimEnd();
  if (!trimmedBase) return trimmedSpoken;
  return `${trimmedBase} ${trimmedSpoken}`;
}

type SpeechResultEvent = {
  resultIndex: number;
  results: Array<{ isFinal: boolean; 0: { transcript: string } }>;
};

export function appendSpeechResults(
  event: unknown,
  baseText: string,
  committedTranscript: string,
): { nextText: string; committedTranscript: string } {
  const e = event as SpeechResultEvent;
  let committed = committedTranscript;
  let interim = '';
  for (let i = e.resultIndex; i < e.results.length; i++) {
    const result = e.results[i];
    const transcript = result[0]?.transcript ?? '';
    if (result.isFinal) {
      committed += transcript;
    } else {
      interim += transcript;
    }
  }
  return {
    committedTranscript: committed,
    nextText: mergeDictationText(baseText, committed + interim),
  };
}
