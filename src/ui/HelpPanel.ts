import { HELP_SECTIONS, HELP_TITLE } from './helpContent';
import { attachSwipeBack } from './swipeBack';

export interface HelpPanelOptions {
  onBack: () => void;
}

export function renderHelpPanel(
  container: HTMLElement,
  options: HelpPanelOptions
): void {
  container.innerHTML = '';
  const panel = document.createElement('div');
  panel.className = 'help-panel';

  const back = document.createElement('button');
  back.type = 'button';
  back.className = 'text-button help-back';
  back.textContent = 'Back';
  back.addEventListener('click', () => options.onBack());
  panel.append(back);

  const title = document.createElement('h1');
  title.className = 'help-title';
  title.textContent = HELP_TITLE;
  panel.append(title);

  for (const section of HELP_SECTIONS) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'help-section';

    const heading = document.createElement('h2');
    heading.textContent = section.heading;
    sectionEl.append(heading);

    for (const paragraph of section.paragraphs) {
      const p = document.createElement('p');
      p.textContent = paragraph;
      sectionEl.append(p);
    }

    if (section.items !== undefined) {
      const list = document.createElement('ul');
      for (const item of section.items) {
        const li = document.createElement('li');
        li.textContent = item;
        list.append(li);
      }
      sectionEl.append(list);
    }

    panel.append(sectionEl);
  }

  container.append(panel);
  attachSwipeBack(container, options.onBack);
}
