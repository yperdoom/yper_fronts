import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAppI18n } from '@yper/i18n';

import appPtBR from '../src/locales/pt-BR.json';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, '..', 'src');
const PAGES_DIR = path.join(SRC_DIR, 'pages');

function listVueFiles(dir) {
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((entry) => entry.endsWith('.vue'))
    .map((entry) => path.join(dir, entry));
}

function flattenKeys(obj, prefix = '') {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function extractUsedKeys(source) {
  const keys = new Set();
  const patterns = [/\$t\(\s*['"]([^'"]+)['"]/g, /(?<![\w$])t\(\s*['"]([^'"]+)['"]/g];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      keys.add(match[1]);
    }
  }
  return keys;
}

function extractTemplate(source) {
  const match = source.match(/<template>([\s\S]*)<\/template>/);
  return match ? match[1] : '';
}

describe('locales', () => {
  const vueFiles = listVueFiles(SRC_DIR);
  const i18n = createAppI18n({ messages: { 'pt-BR': appPtBR } });

  it('todas as chaves $t()/t() usadas em src/**/*.vue existem em pt-BR', () => {
    const missing = [];
    for (const file of vueFiles) {
      const source = fs.readFileSync(file, 'utf-8');
      for (const key of extractUsedKeys(source)) {
        if (!i18n.global.te(key, 'pt-BR')) {
          missing.push(`${key} (${path.relative(SRC_DIR, file)})`);
        }
      }
    }
    expect(missing).toEqual([]);
  });

  it('toda mensagem do pt-BR.json do app compila e traduz', () => {
    const failing = [];
    for (const key of flattenKeys(appPtBR)) {
      let translated;
      try {
        translated = i18n.global.t(key);
      } catch (err) {
        failing.push(`${key}: ${err.message}`);
        continue;
      }
      if (translated === key) failing.push(key);
    }
    expect(failing).toEqual([]);
  });

  it('nenhuma pagina tem texto em pt-BR fora de $t()/atributos dinamicos', () => {
    const pageFiles = listVueFiles(PAGES_DIR);
    const violations = [];

    for (const file of pageFiles) {
      const source = fs.readFileSync(file, 'utf-8');
      const template = extractTemplate(source);

      const staticAttrMatches = [];
      for (const match of template.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
        const [full, name, value] = match;
        if (name.startsWith(':')) continue;
        if (/(^|-)(placeholder|title|label)$/.test(name) && /[A-Za-zÀ-ÿ]/.test(value)) {
          staticAttrMatches.push(full);
        }
      }
      if (staticAttrMatches.length) {
        violations.push(`${path.relative(PAGES_DIR, file)}: static attr(s) ${staticAttrMatches.join(', ')}`);
      }

      const stripped = template
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<span[^>]*class="[^"]*material-symbols-outlined[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
        .replace(/\{\{[\s\S]*?\}\}/g, '')
        .replace(/<(?:[^"'>]|"[^"]*"|'[^']*')*>/g, '')
        .replace(/\s+/g, '');

      if (stripped.length > 0) {
        violations.push(`${path.relative(PAGES_DIR, file)}: leftover text "${stripped}"`);
      }
    }

    expect(violations).toEqual([]);
  });
});
