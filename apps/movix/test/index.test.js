import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const html = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'index.html'),
  'utf-8',
);

function runThemeScript() {
  const head = html.slice(0, html.indexOf('</head>'));
  const match = head.match(/<script>([\s\S]*?)<\/script>/);
  new Function(match[1])();
}

function systemPrefers(dark) {
  vi.stubGlobal('matchMedia', (query) => ({ matches: query === '(prefers-color-scheme: dark)' && dark }));
}

describe('index.html', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('script inline aplica o tema salvo em movix_theme antes do app', () => {
    systemPrefers(true);
    localStorage.setItem('movix_theme', 'light');

    runThemeScript();

    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('script inline segue o sistema sem tema salvo', () => {
    systemPrefers(true);

    runThemeScript();

    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
