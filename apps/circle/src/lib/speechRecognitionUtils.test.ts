import assert from 'node:assert/strict';
import {
  isFatalSpeechRecognitionError,
  isTransientSpeechRecognitionError,
  shouldRestartDictation,
  speechLangFromPreferences,
} from './speechRecognitionUtils';

assert.equal(speechLangFromPreferences('German'), 'de-DE');
assert.equal(speechLangFromPreferences('Spanish'), 'es-ES');
assert.equal(speechLangFromPreferences('Polish'), 'pl-PL');
assert.equal(speechLangFromPreferences('English'), 'en-US');
assert.equal(speechLangFromPreferences(undefined), 'en-US');

assert.equal(shouldRestartDictation(true, null), true);
assert.equal(shouldRestartDictation(true, 'no-speech'), true);
assert.equal(shouldRestartDictation(true, 'aborted'), true);
assert.equal(shouldRestartDictation(false, null), false);
assert.equal(shouldRestartDictation(true, 'not-allowed'), false);
assert.equal(isTransientSpeechRecognitionError('no-speech'), true);
assert.equal(isFatalSpeechRecognitionError('not-allowed'), true);
