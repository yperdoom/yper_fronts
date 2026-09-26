import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;
const THEMED_TOKENS = [
  '--bg',
  '--surface',
  '--surface-2',
  '--border',
  '--text',
  '--text-muted',
  '--success',
  '--success-soft',
  '--warning',
  '--warning-soft',
  '--danger',
  '--danger-soft',
  '--shadow',
  '--shadow-md',
  '--shadow-lg',
  '--overlay',
];

function srcDirs() {
  return ['apps', 'packages'].flatMap((group) =>
    fs
      .readdirSync(path.join(ROOT, group))
      .map((name) => path.join(ROOT, group, name, 'src'))
      .filter((dir) => fs.existsSync(dir)),
  );
}

function vueFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((entry) => entry.endsWith('.vue'))
    .map((entry) => path.join(dir, entry));
}

function tokensIn(css, selector) {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return [];
  const block = css.slice(start, css.indexOf('}', start));
  return [...block.matchAll(/(--[\w-]+)\s*:/g)].map((match) => match[1]);
}

describe('cores', () => {
  it('nenhum .vue em apps/*/src e packages/*/src tem cor literal: so tokens', () => {
    const offenders = [];
    for (const dir of srcDirs()) {
      for (const file of vueFiles(dir)) {
        fs.readFileSync(file, 'utf-8')
          .split('\n')
          .forEach((line, index) => {
            if (COLOR_LITERAL.test(line)) offenders.push(`${path.relative(ROOT, file)}:${index + 1}`);
          });
      }
    }
    expect(offenders).toEqual([]);
  });

  it('base.css redefine os tokens de pagina no tema escuro e mantem a sidebar', () => {
    const css = fs.readFileSync(path.join(ROOT, 'packages/ui/src/styles/base.css'), 'utf-8');
    const lightTokens = tokensIn(css, ':root');
    const darkTokens = tokensIn(css, ':root[data-theme="dark"]');

    for (const token of THEMED_TOKENS) {
      expect(lightTokens).toContain(token);
      expect(darkTokens).toContain(token);
    }
    expect(darkTokens.filter((token) => token.startsWith('--sidebar'))).toEqual([]);
  });

  it.each(['helake', 'movix', 'yper'])('theme.css do %s define --accent-soft para o tema escuro', (app) => {
    const css = fs.readFileSync(path.join(ROOT, 'apps', app, 'src/theme.css'), 'utf-8');

    expect(tokensIn(css, ':root[data-theme="dark"]')).toContain('--accent-soft');
  });
});
