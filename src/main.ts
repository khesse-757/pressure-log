import './styles/main.css';
import { startApp } from './ui/App';

const root = document.getElementById('app');
if (root instanceof HTMLElement) {
  root.innerHTML = `
    <header class="app-header">
      <span class="app-title">Pressure Log</span>
      <button type="button" class="help-button" aria-label="Help">?</button>
    </header>
    <main class="app-main" id="view-root"></main>
  `;
  const view = document.getElementById('view-root');
  if (view instanceof HTMLElement) {
    void startApp(view);
  }
}
