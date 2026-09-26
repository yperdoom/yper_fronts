<template>
  <div :class="$style.wrap">
    <div :class="$style.card">
      <div :class="$style.brand">
        <!-- O card e branco, entao o logotipo entra inteiro. Sem o arquivo, vira texto. -->
        <img
          v-if="!wordmarkFailed"
          :src="wordmarkUrl"
          :alt="shell.appName"
          :class="$style.wordmark"
          @error="wordmarkFailed = true"
        />
        <h1 v-else :class="$style.title">{{ shell.appName }}</h1>
        <p :class="$style.subtitle">{{ tagline }}</p>
      </div>

      <form :class="$style.form" @submit.prevent="submit">
        <div v-if="needsSetup" class="alert alert-success">
          {{ $t('login.setupNotice') }}
        </div>

        <div v-if="needsSetup" class="field">
          <label for="name">{{ $t('login.name') }}</label>
          <input id="name" v-model="name" type="text" autocomplete="name" />
        </div>

        <div class="field">
          <label for="email">{{ $t('login.email') }}</label>
          <input
            id="email"
            v-model="email"
            type="email"
            required
            autocomplete="email"
            :placeholder="$t('login.emailPlaceholder')"
          />
        </div>

        <div class="field">
          <label for="password">{{ $t('login.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            :autocomplete="needsSetup ? 'new-password' : 'current-password'"
            placeholder="••••••••"
          />
        </div>

        <p v-if="error" class="alert alert-error">{{ error }}</p>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">
          {{ loading ? $t('login.wait') : needsSetup ? $t('login.createAccount') : $t('login.submit') }}
        </button>

        <p :class="$style.hint">{{ $t('login.hibernateHint') }}</p>
      </form>
    </div>
  </div>
</template>

<script>
import { SHELL_KEY } from '@yper/ui';
import { errorMessage } from '@yper/i18n';

export default {
  name: 'LoginPage',
  inject: {
    shell: { from: SHELL_KEY },
  },
  props: {
    tagline: { type: String, default: '' },
    homePath: { type: String, default: '/home' },
  },
  data() {
    return {
      name: '',
      email: '',
      password: '',
      error: '',
      loading: false,
      needsSetup: false,
      wordmarkFailed: false,
      wordmarkUrl: '/wordmark.png',
    };
  },
  async mounted() {
    // Se a base ainda nao tem nenhum usuario, a tela vira cadastro.
    try {
      const { initialized } = await this.shell.api.auth.status();
      this.needsSetup = initialized === false;
    } catch {
      // Sem resposta da API, segue como login normal.
    }
  },
  methods: {
    async submit() {
      this.error = '';
      this.loading = true;
      try {
        if (this.needsSetup) {
          await this.shell.api.auth.setup(this.name, this.email, this.password);
        } else {
          await this.shell.api.auth.login(this.email, this.password);
        }
        this.$router.push(this.$route.query.redirect || this.homePath);
      } catch (err) {
        this.error = errorMessage(this.$t, err);
        if (err.status === 403 && this.needsSetup) this.needsSetup = false;
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style module>
.wrap {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 20px;
  background:
    radial-gradient(900px 500px at 12% -10%, var(--accent-soft), transparent 60%),
    var(--bg);
}

.card {
  width: 100%;
  max-width: 388px;
  padding: 30px 28px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-md);
}

.brand {
  text-align: center;
  margin-bottom: 22px;
}

.wordmark {
  height: 50px;
  width: auto;
  max-width: 100%;
  object-fit: contain;
  margin-bottom: 6px;
}

.title {
  font-size: 1.5rem;
  letter-spacing: -0.02em;
}

.subtitle {
  margin: 4px 0 0;
  color: var(--text-muted);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.78rem;
  text-align: center;
}
</style>
