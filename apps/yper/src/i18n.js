import { createAppI18n } from '@yper/i18n';
import ptBR from './locales/pt-BR.json';
import enUS from './locales/en-US.json';

export const i18n = createAppI18n({ app: 'yper', messages: { 'pt-BR': ptBR, 'en-US': enUS } });
