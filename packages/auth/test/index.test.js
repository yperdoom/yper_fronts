import { describe, it, expect } from 'vitest';
import * as auth from '../src/index.js';

describe('@yper/auth', () => {
  it('exporta paginas, guard e traducao de erros da api', () => {
    expect(Object.keys(auth).sort()).toEqual(
      ['ChangePasswordPage', 'LoginPage', 'UsersPage', 'createAuthGuard', 'translateApiError'].sort(),
    );
  });
});
