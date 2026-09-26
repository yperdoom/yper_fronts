<template>
  <AppShell :title="$t('profile.pageTitle')">
    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

    <form v-else :class="$style.wrap" @submit.prevent="save">
      <section class="card">
        <div class="card-head">
          <h2>{{ $t('profile.title') }}</h2>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field">
              <label for="birthDate">{{ $t('profile.form.birthDate') }}</label>
              <input id="birthDate" v-model="form.birthDate" type="date" />
            </div>
            <div class="field">
              <label for="heightCm">{{ $t('profile.form.height') }}</label>
              <input id="heightCm" v-model.number="form.heightCm" type="number" step="0.1" min="0" />
            </div>
            <div class="field">
              <label for="goal">{{ $t('profile.form.goal') }}</label>
              <select id="goal" v-model="form.goal">
                <option value="cut">{{ $t('profile.goals.cut') }}</option>
                <option value="maintain">{{ $t('profile.goals.maintain') }}</option>
                <option value="bulk">{{ $t('profile.goals.bulk') }}</option>
              </select>
            </div>
            <div class="field">
              <label for="workoutDays">{{ $t('profile.form.workoutDays') }}</label>
              <input id="workoutDays" v-model.number="form.workoutDaysPerWeek" type="number" min="0" max="7" />
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>{{ $t('profile.dailyGoals.title') }}</h2>
          <span class="badge" :class="macroCalories > 0 && Math.abs(macroCalories - form.dailyCalories) > 50 ? 'badge-warn' : 'badge-ok'">
            {{ $t('profile.dailyGoals.macroCaloriesBadge', { value: number(macroCalories) }) }}
          </span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field">
              <label for="dailyCalories">{{ $t('profile.dailyGoals.calories') }}</label>
              <input id="dailyCalories" v-model.number="form.dailyCalories" type="number" min="0" />
            </div>
            <div class="field">
              <label for="proteinTarget">{{ $t('profile.dailyGoals.protein') }}</label>
              <input id="proteinTarget" v-model.number="form.proteinTarget" type="number" min="0" />
            </div>
            <div class="field">
              <label for="carbsTarget">{{ $t('profile.dailyGoals.carbs') }}</label>
              <input id="carbsTarget" v-model.number="form.carbsTarget" type="number" min="0" />
            </div>
            <div class="field">
              <label for="fatTarget">{{ $t('profile.dailyGoals.fat') }}</label>
              <input id="fatTarget" v-model.number="form.fatTarget" type="number" min="0" />
            </div>
          </div>

          <p class="muted" :class="$style.note">
            {{ $t('profile.dailyGoals.note') }}
          </p>
        </div>
      </section>

      <div class="row">
        <p v-if="saved" class="alert alert-success">{{ $t('profile.savedMessage') }}</p>
        <div class="spacer"></div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? $t('common.saving') : $t('common.save') }}
        </button>
      </div>
    </form>
  </AppShell>
</template>

<script>
import { AppShell } from '@yper/ui';
import { api } from '@/api';
import { number, toDateInput, errorMessage } from '@yper/i18n';

const DEFAULT = {
  birthDate: '',
  heightCm: 0,
  goal: 'maintain',
  dailyCalories: 2000,
  proteinTarget: 150,
  carbsTarget: 200,
  fatTarget: 60,
  workoutDaysPerWeek: 4,
};

export default {
  name: 'Profile',
  components: { AppShell },
  data() {
    return {
      form: { ...DEFAULT },
      loading: true,
      saving: false,
      saved: false,
    };
  },
  computed: {
    macroCalories() {
      return this.form.proteinTarget * 4 + this.form.carbsTarget * 4 + this.form.fatTarget * 9;
    },
  },
  async mounted() {
    try {
      const { profile } = await api.get('/profile');
      this.form = {
        ...Object.fromEntries(Object.keys(DEFAULT).map((key) => [key, profile[key] ?? DEFAULT[key]])),
        birthDate: profile.birthDate ? toDateInput(profile.birthDate) : '',
      };
    } catch (err) {
      alert(errorMessage(this.$t, err));
    } finally {
      this.loading = false;
    }
  },
  methods: {
    number,
    async save() {
      this.saving = true;
      this.saved = false;
      try {
        const body = { ...this.form };
        if (!body.birthDate) body.birthDate = null;
        await api.put('/profile', body);
        this.saved = true;
        setTimeout(() => { this.saved = false; }, 3000);
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
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
  max-width: 720px;
}

.note {
  margin: 14px 0 0;
  font-size: 0.82rem;
}
</style>
