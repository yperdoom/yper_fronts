<template>
  <AppShell :title="$t('settings.title')">
    <form :class="$style.wrap" @submit.prevent="save">
      <div :class="$style.grid">
        <section class="card">
          <div class="card-head">
            <h2><span class="material-symbols-outlined">person</span> {{ $t('settings.sections.profile') }}</h2>
          </div>
          <div class="card-body form-grid">
            <div class="field full">
              <label for="ownerName">{{ $t('settings.form.ownerName') }}</label>
              <input id="ownerName" v-model="form.ownerName" type="text" />
            </div>
            <div class="field full">
              <label for="whatsapp">{{ $t('settings.form.whatsapp') }}</label>
              <input id="whatsapp" v-model="form.whatsapp" type="text" :placeholder="$t('settings.form.whatsappPlaceholder')" />
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2><span class="material-symbols-outlined">storefront</span> {{ $t('settings.sections.business') }}</h2>
          </div>
          <div class="card-body form-grid">
            <div class="field full">
              <label for="businessName">{{ $t('settings.form.businessName') }}</label>
              <input id="businessName" v-model="form.businessName" type="text" />
            </div>
            <div class="field full">
              <label for="currency">{{ $t('settings.form.currency') }}</label>
              <select id="currency" v-model="form.currency">
                <option value="BRL">{{ $t('settings.currencyOptions.BRL') }}</option>
                <option value="USD">{{ $t('settings.currencyOptions.USD') }}</option>
              </select>
            </div>
            <div class="field full">
              <label for="defaultMargin">{{ $t('settings.form.defaultMargin') }}</label>
              <input id="defaultMargin" v-model.number="form.defaultMargin" type="number" min="0" max="100" />
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2><span class="material-symbols-outlined">gas_meter</span> {{ $t('settings.sections.infrastructure') }}</h2>
          </div>
          <div class="card-body form-grid">
            <div class="field">
              <label for="gas">{{ $t('settings.form.gas') }}</label>
              <input id="gas" v-model.number="form.gas" type="number" min="0" step="0.01" />
            </div>
            <div class="field">
              <label for="electricity">{{ $t('settings.form.electricity') }}</label>
              <input id="electricity" v-model.number="form.electricity" type="number" min="0" step="0.01" />
            </div>
            <div class="field">
              <label for="water">{{ $t('settings.form.water') }}</label>
              <input id="water" v-model.number="form.water" type="number" min="0" step="0.01" />
            </div>
            <div class="field">
              <label for="other">{{ $t('settings.form.other') }}</label>
              <input id="other" v-model.number="form.other" type="number" min="0" step="0.01" />
            </div>
            <div class="field full">
              <label for="monthlyHours">{{ $t('settings.form.monthlyHours') }}</label>
              <input id="monthlyHours" v-model.number="form.monthlyHours" type="number" min="1" />
            </div>
            <div class="field full">
              <label for="defaultInfraPercentage">{{ $t('settings.form.defaultInfraPercentage') }}</label>
              <input id="defaultInfraPercentage" v-model.number="form.defaultInfraPercentage" type="number" min="0" max="100" />
            </div>
          </div>
        </section>
      </div>

      <div class="row">
        <p v-if="saved" class="alert alert-success">{{ $t('settings.savedMessage') }}</p>
        <div class="spacer"></div>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? $t('common.saving') : $t('common.save') }}
        </button>
      </div>
    </form>
  </AppShell>
</template>

<script>
import { AppShell } from '@yper/ui';
import { api } from '@/api';
import { errorMessage } from '@yper/i18n';

const DEFAULT = {
  businessName: '', ownerName: '', whatsapp: '', currency: 'BRL',
  gas: 0, electricity: 0, water: 0, other: 0,
  monthlyHours: 160, defaultInfraPercentage: 15, defaultMargin: 50,
};

export default {
  name: 'Settings',
  components: { AppShell },
  data() {
    return { form: { ...DEFAULT }, loading: false, saved: false };
  },
  async mounted() {
    this.loading = true;
    try {
      const { settings } = await api.get('/settings');
      this.form = { ...DEFAULT, ...settings };
    } catch (err) {
      alert(errorMessage(this.$t, err));
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async save() {
      this.loading = true;
      this.saved = false;
      try {
        await api.put('/settings', this.form);
        this.saved = true;
        setTimeout(() => {
          this.saved = false;
        }, 3000);
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style module>
.wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}
</style>
