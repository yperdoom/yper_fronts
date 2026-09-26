<template>
  <AppShell :title="$t('settings.title')" />
</template>

<script>
import { AppShell } from '@yper/ui';

export default {
  name: 'Settings',
  components: { AppShell },
};
</script>
