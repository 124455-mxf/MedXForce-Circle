/** After a hosting deploy, a tab can keep an old hashed bundle. Missing chunks are rewritten to HTML. */

const RELOAD_AT_KEY = 'circle-stale-chunk-reload-at';
const RELOAD_COOLDOWN_MS = 15_000;

function reloadOnceForStaleChunk() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_AT_KEY) || '0');
    if (Number.isFinite(last) && Date.now() - last < RELOAD_COOLDOWN_MS) return;
    sessionStorage.setItem(RELOAD_AT_KEY, String(Date.now()));
  } catch {
    /* private mode — still reload */
  }
  window.location.reload();
}

export function installCircleStaleChunkReload() {
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    reloadOnceForStaleChunk();
  });
}
