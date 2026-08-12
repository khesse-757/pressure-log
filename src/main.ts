import './styles/main.css';

function renderShell(root: HTMLElement): void {
  root.innerHTML = `
    <header class="app-header">
      <span class="app-title">Pressure Log</span>
    </header>
    <main class="app-main" id="view-root"></main>
  `;
}

const root = document.getElementById('app');
if (root instanceof HTMLElement) {
  renderShell(root);
}
