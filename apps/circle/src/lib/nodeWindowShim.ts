/** Node-only: heic2any (pulled via @medxforce/shared) expects a browser Worker. */
const g = globalThis as typeof globalThis & {
  window?: typeof globalThis;
  Worker?: unknown;
};

if (g.window == null) g.window = g;
if (typeof g.Worker === 'undefined') {
  g.Worker = class {
    terminate() {}
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
  };
}
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:icu-brief-test';
}
