<template>
  <AppShell :title="$t('ingredients.title')" />
</template>

<script>
import { AppShell } from '@yper/ui';

export default {
  name: 'Ingredients',
  components: { AppShell },
};
</script>
