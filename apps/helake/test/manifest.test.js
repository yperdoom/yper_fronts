import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(APP_DIR, 'public');

function readManifest() {
  const raw = fs.readFileSync(path.join(PUBLIC_DIR, 'manifest.webmanifest'), 'utf-8');
  return JSON.parse(raw);
}

describe('manifest', () => {
  it('nome e nome curto sao Helake', () => {
    const manifest = readManifest();
    expect(manifest.name).toBe('Helake');
    expect(manifest.short_name).toBe('Helake');
  });

  it('start_url e "/" e display e "standalone"', () => {
    const manifest = readManifest();
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
  });

  it('theme_color e #7229a8', () => {
    const manifest = readManifest();
    expect(manifest.theme_color).toBe('#7229a8');
  });

  it('icones 192x192 e 512x512 existem como arquivos em public/', () => {
    const manifest = readManifest();
    const icon192 = manifest.icons.find((icon) => icon.sizes === '192x192');
    const icon512 = manifest.icons.find((icon) => icon.sizes === '512x512' && icon.purpose === 'any');

    expect(icon192).toBeTruthy();
    expect(icon512).toBeTruthy();
    expect(fs.existsSync(path.join(PUBLIC_DIR, icon192.src.replace(/^\//, '')))).toBe(true);
    expect(fs.existsSync(path.join(PUBLIC_DIR, icon512.src.replace(/^\//, '')))).toBe(true);
  });

  it('index.html referencia o manifest', () => {
    const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf-8');
    expect(html).toMatch(/<link rel="manifest" href="\/manifest\.webmanifest"/);
  });
});
