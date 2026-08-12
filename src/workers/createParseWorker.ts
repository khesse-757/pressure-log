/** Creates the parse worker via the URL pattern Vite bundles
 * natively. Callers post a ParseWorkerRequest and listen for
 * ParseWorkerResponse messages. */
export function createParseWorker(): Worker {
  return new Worker(new URL('./parse.worker.ts', import.meta.url), {
    type: 'module',
  });
}
