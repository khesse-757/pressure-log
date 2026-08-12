import { parseCsv } from '../data/parseCsv';
import type { ParseWorkerRequest, ParseWorkerResponse } from '../utils/types';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(message: ParseWorkerResponse): void {
  ctx.postMessage(message);
}

ctx.onmessage = (event: MessageEvent<ParseWorkerRequest>): void => {
  if (event.data.type !== 'parse') return;
  try {
    const result = parseCsv(event.data.text, {
      onProgress: (fraction) => post({ type: 'progress', fraction }),
    });
    post({ type: 'done', result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not parse the file.';
    post({ type: 'error', message });
  }
};
