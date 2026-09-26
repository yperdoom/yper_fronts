<template>
  <AppShell :title="$t('customers.title')" />
</template>

<script>
import { AppShell } from '@yper/ui';

export default {
  name: 'Customers',
  components: { AppShell },
};
</script>
