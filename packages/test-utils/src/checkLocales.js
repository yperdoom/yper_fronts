import fs from 'node:fs';
import path from 'node:path';
import { createAppI18n } from '@yper/i18n';

/**
 * Verifica o uso de i18n nos arquivos .vue de `srcDir` (recursivo) contra o
 * objeto `messages` (locale pt-BR):
 * - missingKeys: chaves usadas via $t()/t() que nao existem em `messages`.
 * - uncompiled: chaves de `messages` que nao compilam ou nao traduzem (t(key) === key).
 * - templateLeaks: texto fixo deixado no template fora de $t()/interpolacao.
 * - staticAttrs: atributos placeholder/title/label com texto fixo (deveriam usar :attr="$t(...)").
 *
 * Cada array retorna itens `{ file, detail }` (para `uncompiled`, `file` e a
 * propria chave da mensagem, ja que o problema nao esta em um arquivo).
 */
export function checkLocales({ srcDir, messages = {} }) {
  const vueFiles = listVueFiles(srcDir);
  const i18n = createAppI18n({ messages: { 'pt-BR': messages } });

  const missingKeys = [];
  for (const file of vueFiles) {
    const source = fs.readFileSync(file, 'utf-8');
    const relFile = path.relative(srcDir, file);
    for (const key of extractUsedKeys(source)) {
      if (!i18n.global.te(key, 'pt-BR')) {
        missingKeys.push({ file: relFile, detail: key });
      }
    }
  }

  const uncompiled = [];
  for (const key of flattenKeys(messages)) {
    let translated;
    try {
      translated = i18n.global.t(key);
    } catch (err) {
      uncompiled.push({ file: key, detail: err.message });
      continue;
    }
    if (translated === key) {
      uncompiled.push({ file: key, detail: 'nao traduzido (retorna a propria chave)' });
    }
  }

  const templateLeaks = [];
  const staticAttrs = [];
  for (const file of vueFiles) {
    const source = fs.readFileSync(file, 'utf-8');
    const template = extractTemplate(source);
    const relFile = path.relative(srcDir, file);

    const staticAttrMatches = [];
    for (const match of template.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
      const [full, name, value] = match;
      if (name.startsWith(':')) continue;
      if (/(^|-)(placeholder|title|label)$/.test(name) && /[A-Za-zÀ-ÿ]/.test(value)) {
        staticAttrMatches.push(full);
      }
    }
    for (const attr of staticAttrMatches) {
      staticAttrs.push({ file: relFile, detail: attr });
    }

    const stripped = template
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<span[^>]*class="[^"]*material-symbols-outlined[^"]*"[^>]*>[\s\S]*?<\/span>/g, '')
      .replace(/\{\{[\s\S]*?\}\}/g, '')
      .replace(/<(?:[^"'>]|"[^"]*"|'[^']*')*>/g, '')
      .replace(/\s+/g, '');

    if (stripped.length > 0) {
      templateLeaks.push({ file: relFile, detail: stripped });
    }
  }

  return { missingKeys, uncompiled, templateLeaks, staticAttrs };
}

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
