<template>
  <AppShell :title="$t('orders.title')" />
</template>

<script>
import { AppShell } from '@yper/ui';

export default {
  name: 'Orders',
  components: { AppShell },
};
</script>
