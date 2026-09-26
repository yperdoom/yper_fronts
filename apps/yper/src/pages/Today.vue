<template>
  <AppShell title="Hoje">
    <template #actions>
      <router-link to="/nutricao" class="btn">
        <span class="material-symbols-outlined">restaurant</span> Refeição
      </router-link>
      <router-link to="/historico" class="btn btn-primary">
        <span class="material-symbols-outlined">fitness_center</span> Treino
      </router-link>
    </template>

    <div v-if="loading" class="loading">Carregando...</div>

    <div v-else class="stack">
      <section class="card">
        <div class="card-head">
          <h2>Macros do dia</h2>
          <span class="muted">{{ data.mealsToday }} refeição(ões) registrada(s)</span>
        </div>
        <div class="card-body">
          <div :class="$style.macros">
            <div v-for="macro in macros" :key="macro.key" :class="$style.macro">
              <div :class="$style.macroTop">
                <strong>{{ macro.label }}</strong>
                <span class="muted">
                  {{ number(macro.consumed) }} / {{ number(macro.target) }}{{ macro.unit }}
                </span>
              </div>
              <div class="bar">
                <span :style="{ width: `${percent(macro)}%`, background: macro.color }"></span>
              </div>
              <div :class="[$style.macroFoot, macro.remaining < 0 && $style.over]">
                {{ macro.remaining >= 0
                  ? `faltam ${number(macro.remaining)}${macro.unit}`
                  : `${number(-macro.remaining)}${macro.unit} acima da meta` }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div :class="$style.split">
        <section class="card">
          <div class="card-head">
            <h2>Treino de hoje</h2>
            <span class="badge badge-accent">
              {{ data.workoutsThisWeek }} / {{ data.workoutTargetPerWeek }} na semana
            </span>
          </div>

          <div v-if="!data.todaysWorkouts.length" class="empty">
            <span class="material-symbols-outlined">self_improvement</span>
            <p>Nenhum treino marcado para hoje.</p>
          </div>

          <div v-else class="card-body stack">
            <div v-for="workout in data.todaysWorkouts" :key="workout._id">
              <div class="row">
                <strong>{{ workout.name }}</strong>
                <span v-if="workout.focus" class="badge">{{ workout.focus }}</span>
              </div>
              <ul :class="$style.list">
                <li v-for="(item, index) in workout.items" :key="index">
                  <span>{{ item.exercise?.name || '—' }}</span>
                  <span class="muted">
                    {{ item.sets }}x{{ item.reps }}
                    <template v-if="item.weight"> · {{ number(item.weight, 1) }}kg</template>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2>Últimos treinos</h2>
            <router-link to="/historico" class="badge badge-accent">ver tudo</router-link>
          </div>

          <div v-if="!data.recentLogs.length" class="empty">
            <span class="material-symbols-outlined">history</span>
            <p>Nenhum treino registrado ainda.</p>
          </div>

          <div v-else class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Treino</th>
                  <th class="num">Duração</th>
                  <th class="num">Volume</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in data.recentLogs" :key="log._id">
                  <td class="muted">{{ date(log.date) }}</td>
                  <td>{{ log.workout?.name || 'Avulso' }}</td>
                  <td class="num">{{ log.durationMinutes ? `${log.durationMinutes} min` : '—' }}</td>
                  <td class="num">{{ number(log.totalVolume) }} kg</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="data.lastMeasurement" :class="$style.weight">
            <span class="material-symbols-outlined">monitor_weight</span>
            <span>
              Último peso: <strong>{{ number(data.lastMeasurement.weightKg, 1) }} kg</strong>
              <span class="muted"> em {{ date(data.lastMeasurement.date) }}</span>
            </span>
          </div>
        </section>
      </div>
    </div>
  </AppShell>
</template>

<script>
import { AppShell } from '@yper/ui';
import { api } from '@/api';
import { number, date } from '@yper/i18n';

const EMPTY_TOTALS = { calories: 0, protein: 0, carbs: 0, fat: 0 };

export default {
  name: 'Today',
  components: { AppShell },
  data() {
    return {
      loading: true,
      data: {
        targets: { ...EMPTY_TOTALS },
        consumed: { ...EMPTY_TOTALS },
        remaining: { ...EMPTY_TOTALS },
        mealsToday: 0,
        workoutsThisWeek: 0,
        workoutTargetPerWeek: 0,
        todaysWorkouts: [],
        recentLogs: [],
        lastMeasurement: null,
      },
    };
  },
  computed: {
    macros() {
      const spec = [
        { key: 'calories', label: 'Calorias', unit: ' kcal', color: 'var(--accent)' },
        { key: 'protein', label: 'Proteína', unit: 'g', color: '#2563eb' },
        { key: 'carbs', label: 'Carboidrato', unit: 'g', color: '#d97706' },
        { key: 'fat', label: 'Gordura', unit: 'g', color: '#db2777' },
      ];
      return spec.map((macro) => ({
        ...macro,
        consumed: this.data.consumed[macro.key] || 0,
        target: this.data.targets[macro.key] || 0,
        remaining: this.data.remaining[macro.key] || 0,
      }));
    },
  },
  async mounted() {
    try {
      this.data = await api.get('/dashboard');
    } catch (err) {
      alert(err.message);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    number,
    date,
    percent(macro) {
      if (!macro.target) return 0;
      return Math.min(100, (macro.consumed / macro.target) * 100);
    },
  },
};
</script>

<style module>
.macros {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.macro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.macroTop {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.macroFoot {
  color: var(--text-muted);
  font-size: 0.8rem;
}

.over {
  color: var(--danger);
}

.split {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(330px, 1fr));
  align-items: start;
}

.list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}

.list li:last-child {
  border-bottom: none;
}

.weight {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 13px 18px;
  border-top: 1px solid var(--border);
}
</style>
