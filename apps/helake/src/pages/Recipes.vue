<template>
  <AppShell :title="$t('recipes.title')" />
</template>

<script>
import { AppShell } from '@yper/ui';

export default {
  name: 'Recipes',
  components: { AppShell },
};
</script>
