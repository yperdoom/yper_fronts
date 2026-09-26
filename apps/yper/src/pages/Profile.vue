<template>
  <AppShell title="Metas">
    <div v-if="loading" class="loading">Carregando...</div>

    <form v-else :class="$style.wrap" @submit.prevent="save">
      <section class="card">
        <div class="card-head">
          <h2>Perfil</h2>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field">
              <label for="birthDate">Nascimento</label>
              <input id="birthDate" v-model="form.birthDate" type="date" />
            </div>
            <div class="field">
              <label for="heightCm">Altura (cm)</label>
              <input id="heightCm" v-model.number="form.heightCm" type="number" step="0.1" min="0" />
            </div>
            <div class="field">
              <label for="goal">Objetivo</label>
              <select id="goal" v-model="form.goal">
                <option value="cut">Perder gordura</option>
                <option value="maintain">Manter</option>
                <option value="bulk">Ganhar massa</option>
              </select>
            </div>
            <div class="field">
              <label for="workoutDays">Treinos por semana</label>
              <input id="workoutDays" v-model.number="form.workoutDaysPerWeek" type="number" min="0" max="7" />
            </div>
          </div>
        </div>
      </section>

      <section class="card">
        <div class="card-head">
          <h2>Metas diárias</h2>
          <span class="badge" :class="macroCalories > 0 && Math.abs(macroCalories - form.dailyCalories) > 50 ? 'badge-warn' : 'badge-ok'">
            macros somam {{ number(macroCalories) }} kcal
          </span>
        </div>
        <div class="card-body">
          <div class="form-grid">
            <div class="field">
              <label for="dailyCalories">Calorias</label>
              <input id="dailyCalories" v-model.number="form.dailyCalories" type="number" min="0" />
            </div>
            <div class="field">
              <label for="proteinTarget">Proteína (g)</label>
              <input id="proteinTarget" v-model.number="form.proteinTarget" type="number" min="0" />
            </div>
            <div class="field">
              <label for="carbsTarget">Carboidrato (g)</label>
              <input id="carbsTarget" v-model.number="form.carbsTarget" type="number" min="0" />
            </div>
            <div class="field">
              <label for="fatTarget">Gordura (g)</label>
              <input id="fatTarget" v-model.number="form.fatTarget" type="number" min="0" />
            </div>
          </div>

          <p class="muted" :class="$style.note">
            Proteína e carboidrato rendem 4 kcal por grama, gordura rende 9. A soma acima ajuda a conferir se os
            macros batem com a meta de calorias.
          </p>
        </div>
      </section>

      <div class="row">
        <p v-if="saved" class="alert alert-success">Metas salvas.</p>
        <div class="spacer"></div>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </form>
  </AppShell>
</template>

<script>
import { AppShell } from '@yper/ui';
import { api } from '@/api';
import { number, toDateInput } from '@yper/i18n';

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
        ...DEFAULT,
        ...profile,
        birthDate: profile.birthDate ? toDateInput(profile.birthDate) : '',
      };
    } catch (err) {
      alert(err.message);
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
        alert(err.message);
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
