import { describe, it, expect } from 'vitest';
import { NAV } from '../src/nav.js';
import { routes } from '../src/router.js';
import ptBR from '../src/locales/pt-BR.json';

function getKey(obj, path) {
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

describe('nav', () => {
  it('todo labelKey existe em pt-BR.json', () => {
    for (const item of NAV) {
      expect(getKey(ptBR, item.labelKey)).toBeTruthy();
    }
  });

  it('todo "to" aponta para uma rota registrada', () => {
    const paths = routes.map((route) => route.path);
    for (const item of NAV) {
      expect(paths).toContain(item.to);
    }
  });
});
