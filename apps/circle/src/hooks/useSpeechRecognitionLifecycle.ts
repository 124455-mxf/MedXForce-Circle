import { useEffect, useRef } from 'react';
import {
  stopSpeechRecognition,
  type BrowserSpeechRecognition,
} from '../lib/speechRecognitionUtils';

export function useSpeechRecognitionLifecycle() {
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  useEffect(() => {
    return () => stopSpeechRecognition(recognitionRef);
  }, []);

  return recognitionRef;
}
