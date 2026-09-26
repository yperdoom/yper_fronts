import { errorMessage } from '@yper/i18n';

// A api responde em ingles; as mensagens conhecidas viram chaves de i18n.
const API_ERRORS = Object.freeze({
  'Email and password are required': 'users.errors.emailPasswordRequired',
  'Password must have at least 6 characters': 'users.errors.passwordTooShort',
  'Validation failed': 'users.errors.validationFailed',
  'Duplicate value': 'users.errors.duplicateEmail',
  'You cannot demote or deactivate yourself': 'users.errors.selfDemote',
  'You cannot delete yourself': 'users.errors.selfDelete',
  'Not found': 'users.errors.notFound',
  'Admin only': 'users.errors.adminOnly',
  'Current password is required': 'account.errors.currentRequired',
  'Current password is incorrect': 'account.errors.currentIncorrect',
});

export function translateApiError(t, err) {
  const key = err?.code === 'HTTP' && API_ERRORS[err.message];
  return key ? t(key) : errorMessage(t, err);
}
