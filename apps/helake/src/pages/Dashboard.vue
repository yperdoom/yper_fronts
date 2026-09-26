<template>
  <AppShell :title="$t('dashboard.title')" />
</template>

<script>
import { AppShell } from '@yper/ui';

export default {
  name: 'Dashboard',
  components: { AppShell },
};
</script>
