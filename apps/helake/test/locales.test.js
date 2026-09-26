import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLocales, flattenKeys } from '@yper/test-utils';
import { createAppI18n } from '@yper/i18n';

import appPtBR from '../src/locales/pt-BR.json';
import appEnUS from '../src/locales/en-US.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'src');

describe('locales', () => {
  const { missingKeys, uncompiled, templateLeaks, staticAttrs } = checkLocales({
    srcDir: SRC_DIR,
    messages: appPtBR,
  });

  it('todas as chaves $t()/t() usadas em src/**/*.vue existem em pt-BR', () => {
    expect(missingKeys).toEqual([]);
  });

  it('toda mensagem do pt-BR.json do app compila e traduz', () => {
    expect(uncompiled).toEqual([]);
  });

  it('nenhuma pagina tem texto em pt-BR fora de $t()/atributos dinamicos', () => {
    expect(templateLeaks).toEqual([]);
    expect(staticAttrs).toEqual([]);
  });

  it('pt-BR e en-US tem o mesmo conjunto de chaves', () => {
    const ptKeys = flattenKeys(appPtBR).sort();
    const enKeys = flattenKeys(appEnUS).sort();
    expect(enKeys).toEqual(ptKeys);
  });

  it('toda mensagem do en-US.json do app compila e traduz', () => {
    const i18n = createAppI18n({ messages: { 'en-US': appEnUS }, locale: 'en-US' });
    for (const key of flattenKeys(appEnUS)) {
      expect(i18n.global.t(key)).not.toBe(key);
    }
  });
});
