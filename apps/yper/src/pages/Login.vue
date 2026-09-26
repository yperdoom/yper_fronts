<template>
  <LoginPage :tagline="$t('app.tagline')" />
</template>

<script>
import { LoginPage } from '@yper/auth';

export default {
  name: 'Login',
  components: { LoginPage },
};
</script>
