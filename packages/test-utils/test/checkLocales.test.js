import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLocales } from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, 'fixtures', 'locales-src');

const messages = {
  clean: { title: 'Titulo limpo' },
  bad: { email: 'fale @ conosco' },
};

describe('checkLocales', () => {
  const result = checkLocales({ srcDir: SRC_DIR, messages });

  it('detecta chave usada no template que nao existe nas mensagens', () => {
    expect(result.missingKeys.some((item) => item.detail === 'missing.title')).toBe(true);
  });

  it('detecta mensagem que nao compila (@ sem escape)', () => {
    expect(result.uncompiled.some((item) => item.file === 'bad.email')).toBe(true);
  });

  it('detecta texto fixo deixado no template fora de $t()', () => {
    expect(result.templateLeaks.some((item) => item.file === path.join('pages', 'HardcodedText.vue'))).toBe(true);
  });

  it('detecta atributo estatico placeholder/title/label', () => {
    expect(result.staticAttrs.some((item) => item.file === path.join('pages', 'StaticAttr.vue'))).toBe(true);
  });

  it('nao aponta nenhum problema para o arquivo limpo', () => {
    const flaggedFiles = [...result.missingKeys, ...result.templateLeaks, ...result.staticAttrs].map(
      (item) => item.file,
    );

    expect(flaggedFiles).not.toContain(path.join('pages', 'Clean.vue'));
  });
});
