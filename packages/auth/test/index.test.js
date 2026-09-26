import { describe, it, expect } from 'vitest';
import * as auth from '../src/index.js';

describe('@yper/auth', () => {
  it('exporta paginas e guard; mensagens de erro da api vem prontas, sem traducao local', () => {
    expect(Object.keys(auth).sort()).toEqual(
      ['ChangePasswordPage', 'LoginPage', 'UsersPage', 'createAuthGuard'].sort(),
    );
  });
});
