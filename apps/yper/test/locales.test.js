import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLocales } from '@yper/test-utils';

import appPtBR from '../src/locales/pt-BR.json';

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
});
