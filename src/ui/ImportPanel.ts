import type {
  ParseResult,
  ParseWorkerRequest,
  ParseWorkerResponse,
} from '../utils/types';
import { createParseWorker } from '../workers/createParseWorker';
import { query } from './dom';

export interface ImportPanelOptions {
  onImported: (result: ParseResult) => void;
  /** When set, shows a way back to the existing chart. */
  onCancel?: () => void;
}

export function renderImportPanel(
  container: HTMLElement,
  options: ImportPanelOptions
): void {
  container.innerHTML = `
    <section class="import-panel">
      <div class="drop-zone">
        <p class="drop-title">Drop a RuuviTag CSV export here</p>
        <p class="drop-hint">or</p>
        <label class="button">
          Choose CSV file
          <input
            class="file-input visually-hidden"
            type="file"
            accept=".csv,text/csv,text/comma-separated-values"
          />
        </label>
      </div>
      <div class="import-progress" hidden>
        <div class="progress-track"><div class="progress-bar"></div></div>
        <p class="progress-label">Reading file</p>
      </div>
      <p class="import-error" hidden></p>
      ${
        options.onCancel !== undefined
          ? '<button type="button" class="text-button cancel-button">Keep current data</button>'
          : ''
      }
    </section>
  `;

  const dropZone = query<HTMLElement>(container, '.drop-zone');
  const fileInput = query<HTMLInputElement>(container, '.file-input');
  const progress = query<HTMLElement>(container, '.import-progress');
  const progressBar = query<HTMLElement>(container, '.progress-bar');
  const progressLabel = query<HTMLElement>(container, '.progress-label');
  const errorEl = query<HTMLElement>(container, '.import-error');

  if (options.onCancel !== undefined) {
    const onCancel = options.onCancel;
    query<HTMLButtonElement>(container, '.cancel-button').addEventListener(
      'click',
      () => onCancel()
    );
  }

  function setProgress(fraction: number, label: string): void {
    progress.hidden = false;
    progressBar.style.width = `${Math.round(fraction * 100)}%`;
    progressLabel.textContent = label;
  }

  function showError(message: string): void {
    progress.hidden = true;
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  function parseInWorker(text: string): void {
    const worker = createParseWorker();
    worker.onmessage = (event: MessageEvent<ParseWorkerResponse>): void => {
      const message = event.data;
      if (message.type === 'progress') {
        setProgress(message.fraction, 'Parsing');
      } else if (message.type === 'done') {
        worker.terminate();
        if (message.result.readings.length === 0) {
          showError('No readings were found in that file.');
        } else {
          options.onImported(message.result);
        }
      } else {
        worker.terminate();
        showError(message.message);
      }
    };
    worker.onerror = (): void => {
      worker.terminate();
      showError('Something went wrong while parsing the file.');
    };
    const request: ParseWorkerRequest = { type: 'parse', text };
    worker.postMessage(request);
  }

  function handleFile(file: File): void {
    errorEl.hidden = true;
    setProgress(0, 'Reading file');
    file
      .text()
      .then((text) => parseInWorker(text))
      .catch(() => showError('Could not read that file.'));
  }

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('drop-zone-active');
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drop-zone-active');
  });
  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('drop-zone-active');
    const file = event.dataTransfer?.files[0];
    if (file !== undefined) handleFile(file);
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file !== undefined) handleFile(file);
  });
}
