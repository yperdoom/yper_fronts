<template>
  <AppShell :title="$t('history.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('history.newLog') }}
      </button>
    </template>

    <WorkoutCalendar ref="calendar" />
    <div class="card">
      <div class="card-head">
        <h2>{{ $t('history.loggedSessions') }}</h2>
        <span class="muted">{{ $t('history.count', { count: logs.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!logs.length" class="empty">
        <span class="material-symbols-outlined">history</span>
        <p>{{ $t('history.empty') }}</p>
      </div>

      <div v-else>
        <article v-for="log in logs" :key="log._id" :class="$style.entry">
          <div class="row">
            <strong>{{ log.workout?.name || $t('history.freeWorkout') }}</strong>
            <span class="badge">{{ date(log.date) }}</span>
            <span v-if="log.durationMinutes" class="badge">{{ $t('history.durationMinutes', { minutes: log.durationMinutes }) }}</span>
            <span class="badge badge-accent">{{ $t('history.volume', { value: number(log.totalVolume) }) }}</span>
            <div class="spacer"></div>
            <button class="btn-icon" :title="$t('common.remove')" @click="remove(log)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>

          <ul :class="$style.list">
            <li v-for="(entry, index) in log.entries" :key="index">
              <span>{{ entry.exercise?.name || '—' }}</span>
              <span class="muted">
                {{ entry.sets.length
                  ? entry.sets.map((set) => $t('history.entrySet', { reps: set.reps, weight: set.weight })).join('  ·  ')
                  : $t('history.noSets') }}
              </span>
            </li>
          </ul>

          <p v-if="log.notes" class="muted" :class="$style.notes">{{ log.notes }}</p>
        </article>
      </div>
    </div>

    <Modal
      :show="showForm"
      :title="$t('history.newLog')"
      :submit-label="$t('history.submitLabel')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="workout">{{ $t('history.form.workout') }}</label>
          <select id="workout" v-model="form.workout" @change="prefill">
            <option :value="null">{{ $t('history.form.freeOption') }}</option>
            <option v-for="workout in workouts" :key="workout._id" :value="workout._id">
              {{ workout.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="date">{{ $t('history.form.date') }}</label>
          <input id="date" v-model="form.date" type="date" required />
        </div>
        <div class="field">
          <label for="duration">{{ $t('history.form.duration') }}</label>
          <input id="duration" v-model.number="form.durationMinutes" type="number" min="0" />
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>{{ $t('history.items.title') }}</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addEntry">
            <span class="material-symbols-outlined">add</span> {{ $t('history.items.addButton') }}
          </button>
        </div>

        <p v-if="!form.entries.length" class="muted" :class="$style.notes">
          {{ $t('history.items.empty') }}
        </p>

        <div v-for="(entry, entryIndex) in form.entries" :key="entryIndex" :class="$style.entryForm">
          <div class="row">
            <select v-model="entry.exercise" required :class="$style.grow">
              <option value="" disabled>{{ $t('history.items.selectPlaceholder') }}</option>
              <option v-for="exercise in exercises" :key="exercise._id" :value="exercise._id">
                {{ exercise.name }}
              </option>
            </select>
            <button type="button" class="btn-icon" @click="form.entries.splice(entryIndex, 1)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div v-for="(set, setIndex) in entry.sets" :key="setIndex" :class="$style.set">
            <span class="muted">{{ $t('history.items.setNumber', { number: setIndex + 1 }) }}</span>
            <input v-model.number="set.reps" type="number" min="0" :placeholder="$t('history.items.repsPlaceholder')" required />
            <input v-model.number="set.weight" type="number" step="0.5" min="0" :placeholder="$t('history.items.weightPlaceholder')" />
            <button type="button" class="btn-icon" @click="entry.sets.splice(setIndex, 1)">
              <span class="material-symbols-outlined">remove</span>
            </button>
          </div>

          <button type="button" class="btn" :class="$style.addSet" @click="addSet(entry)">
            <span class="material-symbols-outlined">add</span> {{ $t('history.items.addSetButton') }}
          </button>
        </div>
      </div>

      <div class="field" :class="$style.items">
        <label for="notes">{{ $t('history.form.notes') }}</label>
        <textarea id="notes" v-model="form.notes"></textarea>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import WorkoutCalendar from '@/components/WorkoutCalendar.vue';
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, date, toDateInput, errorMessage } from '@yper/i18n';

const empty = () => ({
  workout: null,
  date: toDateInput(),
  durationMinutes: 0,
  entries: [],
  notes: '',
});

export default {
  name: 'History',
  components: { AppShell, Modal, WorkoutCalendar },
  data() {
    return {
      logs: [],
      workouts: [],
      exercises: [],
      loading: true,
      saving: false,
      showForm: false,
      form: empty(),
    };
  },
  async mounted() {
    await Promise.all([this.load(), this.loadWorkouts(), this.loadExercises()]);
  },
  methods: {
    number,
    date,
    async load() {
      this.loading = true;
      try {
        const { logs } = await api.get('/logs');
        this.logs = logs;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    async loadWorkouts() {
      try {
        const { workouts } = await api.get('/workouts');
        this.workouts = workouts;
      } catch {
        this.workouts = [];
      }
    },
    async loadExercises() {
      try {
        const { exercises } = await api.get('/exercises');
        this.exercises = exercises;
      } catch {
        this.exercises = [];
      }
    },
    openForm() {
      this.form = empty();
      this.showForm = true;
    },
    /** Ao escolher um treino, ja traz seus exercicios com as series planejadas. */
    prefill() {
      const workout = this.workouts.find((w) => w._id === this.form.workout);
      if (!workout) return;

      this.form.entries = workout.items.map((item) => ({
        exercise: item.exercise?._id || item.exercise,
        sets: Array.from({ length: item.sets || 1 }, () => ({
          reps: Number.parseInt(item.reps, 10) || 0,
          weight: this.exercises.find(exercise => exercise._id === (item.exercise?._id || item.exercise))?.weight ?? item.exercise?.weight ?? item.weight ?? 0,
        })),
      }));
    },
    addEntry() {
      this.form.entries.push({ exercise: '', sets: [{ reps: 10, weight: 0 }] });
    },
    addSet(entry) {
      const last = entry.sets[entry.sets.length - 1];
      entry.sets.push({ reps: last?.reps || 10, weight: last?.weight || 0 });
    },
    async save() {
      this.saving = true;
      try {
        await api.post('/logs', {
          ...this.form,
          entries: this.form.entries.filter((entry) => entry.exercise),
        });
        this.showForm = false;
        await this.load();
        await this.$refs.calendar.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(log) {
      if (!confirm(this.$t('history.confirmRemove'))) return;
      try {
        await api.del(`/logs/${log._id}`);
        await this.load();
        await this.$refs.calendar.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      }
    },
  },
};
</script>

<style module>
.entry {
  padding: 15px 18px;
  border-bottom: 1px solid var(--border);
}

.entry:last-child {
  border-bottom: none;
}

.list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
}

.notes {
  margin: 8px 0 0;
  font-size: 0.85rem;
}

.items {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.entryForm {
  margin-top: 12px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.grow {
  flex: 1;
}

.set {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.addSet {
  margin-top: 10px;
  padding: 5px 10px;
  font-size: 0.82rem;
}
</style>
