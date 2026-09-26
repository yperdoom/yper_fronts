import { describe, it, expect } from 'vitest';
import { createAppI18n } from '@yper/i18n';
import { translateApiError } from '../src/translateApiError.js';

const { t } = createAppI18n({ locale: 'pt-BR' }).global;

describe('translateApiError', () => {
  it.each([
    ['Email and password are required', 'E-mail e senha são obrigatórios.'],
    ['Password must have at least 6 characters', 'A senha precisa ter pelo menos 6 caracteres.'],
    ['Validation failed', 'Dados inválidos. Confira os campos.'],
    ['Duplicate value', 'Já existe um usuário com este e-mail.'],
    ['You cannot demote or deactivate yourself', 'Você não pode rebaixar nem desativar a si mesmo.'],
    ['You cannot delete yourself', 'Você não pode remover a si mesmo.'],
    ['Not found', 'Usuário não encontrado.'],
    ['Admin only', 'Apenas administradores podem fazer isso.'],
    ['Current password is required', 'Informe a senha atual.'],
    ['Current password is incorrect', 'Senha atual incorreta.'],
  ])('traduz a mensagem da api "%s"', (message, expected) => {
    expect(translateApiError(t, { code: 'HTTP', message })).toBe(expected);
  });

  it('mensagem desconhecida da api passa sem traducao', () => {
    expect(translateApiError(t, { code: 'HTTP', message: 'Something else' })).toBe('Something else');
  });

  it('erros com code conhecido seguem o errorMessage', () => {
    expect(translateApiError(t, { code: 'NETWORK' })).toBe('Não foi possível falar com o servidor. Tente de novo.');
  });
});
