import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkLocales } from '@yper/test-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('locales', () => {
  const { missingKeys, templateLeaks, staticAttrs } = checkLocales({ srcDir: path.join(__dirname, '..', 'src') });

  it('todas as chaves usadas nas paginas existem nas mensagens comuns', () => {
    expect(missingKeys).toEqual([]);
  });

  it('nenhuma pagina tem texto fixo fora de $t()', () => {
    expect(templateLeaks).toEqual([]);
    expect(staticAttrs).toEqual([]);
  });
});
