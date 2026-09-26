<template>
  <AppShell :title="$t('today.pageTitle')">
    <template #actions>
      <router-link to="/nutrition" class="btn">
        <span class="material-symbols-outlined">restaurant</span> {{ $t('today.actions.meal') }}
      </router-link>
      <router-link to="/history" class="btn btn-primary">
        <span class="material-symbols-outlined">fitness_center</span> {{ $t('today.actions.workout') }}
      </router-link>
    </template>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

    <div v-else class="stack">
      <section class="card">
        <div class="card-head">
          <h2>{{ $t('today.macros.title') }}</h2>
          <span class="muted">{{ $t('today.macros.mealsCount', { count: data.mealsToday }) }}</span>
        </div>
        <div class="card-body">
          <div :class="$style.macros">
            <div v-for="macro in macros" :key="macro.key" :class="$style.macro">
              <div :class="$style.macroTop">
                <strong>{{ $t(`today.macros.types.${macro.key}`) }}</strong>
                <span class="muted">
                  {{ $t('today.macros.consumedTarget', { consumed: number(macro.consumed), target: number(macro.target), unit: macro.unit }) }}
                </span>
              </div>
              <div class="bar">
                <span :style="{ width: `${percent(macro)}%`, background: macro.color }"></span>
              </div>
              <div :class="[$style.macroFoot, macro.remaining < 0 && $style.over]">
                {{ macro.remaining >= 0
                  ? $t('today.macros.remaining', { amount: number(macro.remaining), unit: macro.unit })
                  : $t('today.macros.over', { amount: number(-macro.remaining), unit: macro.unit }) }}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div :class="$style.split">
        <section class="card">
          <div class="card-head">
            <h2>{{ $t('today.workoutToday.title') }}</h2>
            <span class="badge badge-accent">
              {{ $t('today.workoutToday.weekCount', { done: data.workoutsThisWeek, target: data.workoutTargetPerWeek }) }}
            </span>
          </div>

          <div v-if="!data.todaysWorkouts.length" class="empty">
            <span class="material-symbols-outlined">self_improvement</span>
            <p>{{ $t('today.workoutToday.empty') }}</p>
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
                    {{ $t('today.workoutToday.setsReps', { sets: item.sets, reps: item.reps }) }}
                    <template v-if="item.weight">{{ $t('today.workoutToday.itemWeight', { weight: number(item.weight, 1) }) }}</template>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2>{{ $t('today.recentWorkouts.title') }}</h2>
            <router-link to="/history" class="badge badge-accent">{{ $t('today.recentWorkouts.viewAll') }}</router-link>
          </div>

          <div v-if="!data.recentLogs.length" class="empty">
            <span class="material-symbols-outlined">history</span>
            <p>{{ $t('today.recentWorkouts.empty') }}</p>
          </div>

          <div v-else class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>{{ $t('today.recentWorkouts.table.date') }}</th>
                  <th>{{ $t('today.recentWorkouts.table.workout') }}</th>
                  <th class="num">{{ $t('today.recentWorkouts.table.duration') }}</th>
                  <th class="num">{{ $t('today.recentWorkouts.table.volume') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="log in data.recentLogs" :key="log._id">
                  <td class="muted">{{ date(log.date) }}</td>
                  <td>{{ log.workout?.name || $t('today.recentWorkouts.freeWorkout') }}</td>
                  <td class="num">{{ log.durationMinutes ? $t('today.recentWorkouts.durationMinutes', { minutes: log.durationMinutes }) : '—' }}</td>
                  <td class="num">{{ $t('today.recentWorkouts.volumeValue', { value: number(log.totalVolume) }) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="data.lastMeasurement" :class="$style.weight">
            <span class="material-symbols-outlined">monitor_weight</span>
            <span>
              {{ $t('today.lastWeight.label') }} <strong>{{ $t('today.lastWeight.value', { weight: number(data.lastMeasurement.weightKg, 1) }) }}</strong>
              <span class="muted"> {{ $t('today.lastWeight.at', { date: date(data.lastMeasurement.date) }) }}</span>
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
import { number, date, errorMessage } from '@yper/i18n';

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
        { key: 'calories', unit: ' kcal', color: 'var(--accent)' },
        { key: 'protein', unit: 'g', color: '#2563eb' },
        { key: 'carbs', unit: 'g', color: '#d97706' },
        { key: 'fat', unit: 'g', color: '#db2777' },
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
      alert(errorMessage(this.$t, err));
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
