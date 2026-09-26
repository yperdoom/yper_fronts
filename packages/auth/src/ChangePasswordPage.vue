<template>
  <AppShell :title="$t('account.changePassword')">
    <div class="card" :class="$style.card">
      <form class="card-body stack" @submit.prevent="submit">
        <div class="field">
          <label for="current-password">{{ $t('account.currentPassword') }}</label>
          <input id="current-password" v-model="currentPassword" type="password" required autocomplete="current-password" />
        </div>
        <div class="field">
          <label for="new-password">{{ $t('account.newPassword') }}</label>
          <input id="new-password" v-model="newPassword" type="password" required autocomplete="new-password" />
        </div>
        <div class="field">
          <label for="confirm-password">{{ $t('account.confirmPassword') }}</label>
          <input id="confirm-password" v-model="confirmPassword" type="password" required autocomplete="new-password" />
        </div>

        <p v-if="error" class="alert alert-error">{{ error }}</p>
        <p v-if="success" class="alert alert-success">{{ $t('account.success') }}</p>

        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? $t('common.saving') : $t('account.changePassword') }}
        </button>
      </form>
    </div>
  </AppShell>
</template>

<script>
import { AppShell, SHELL_KEY } from '@yper/ui';
import { translateApiError } from './translateApiError.js';

const MIN_PASSWORD_LENGTH = 6;

export default {
  name: 'ChangePasswordPage',
  components: { AppShell },
  inject: {
    shell: { from: SHELL_KEY },
  },
  data() {
    return {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      error: '',
      success: false,
      saving: false,
    };
  },
  methods: {
    async submit() {
      this.error = '';
      this.success = false;

      if (this.newPassword.length < MIN_PASSWORD_LENGTH) {
        this.error = this.$t('users.errors.passwordTooShort');
        return;
      }
      if (this.newPassword !== this.confirmPassword) {
        this.error = this.$t('account.errors.mismatch');
        return;
      }

      this.saving = true;
      try {
        await this.shell.api.auth.changePassword(this.currentPassword, this.newPassword);
        this.success = true;
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      } catch (err) {
        this.error = translateApiError(this.$t, err);
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style module>
.card {
  max-width: 420px;
}
</style>
