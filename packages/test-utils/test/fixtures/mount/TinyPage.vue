<template>
  <AppShell title="Tiny">
    <p>{{ $t('tiny.title') }}</p>
  </AppShell>
</template>

<script>
import { AppShell, SHELL_KEY } from '@yper/ui';

export default {
  name: 'TinyPage',
  components: { AppShell },
  inject: { shell: { from: SHELL_KEY } },
  async mounted() {
    await this.shell.api.api.get('/tiny');
  },
};
</script>
